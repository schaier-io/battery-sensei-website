/**
 * POST /api/free-signup — capture an email from the homepage's Free
 * download card so we can:
 *   1. Email when a new Sensei build ships (release alerts)
 *   2. Send the occasional "new app from the same maker" announcement
 *
 * Two paths run in parallel:
 *   - DB upsert (`NewsletterSignup`) — persistent source of truth, used
 *     for abuse investigation, locale stats, and idempotent re-signups.
 *   - Resend Audiences mirror — fan out the same email to two Resend
 *     audiences (releases + launches) so we can broadcast from the
 *     Resend dashboard without rebuilding lists by hand.
 *
 * The endpoint NEVER blocks the user. A failed forward to Resend, or
 * a failed DB write, returns `ok: true` to the client so the download
 * still proceeds. Failures are logged server-side for follow-up.
 *
 * Marketing-psychology framing
 * ----------------------------
 *  - The visitor opts in (skip link below the form preserves autonomy).
 *  - Single tiny ask: an email, nothing else.
 *  - Reciprocity: they hand us an address, we hand them a download +
 *    one quiet update per release.
 *  - The cross-app opt-in is disclosed in the form footnote — same
 *    address, but one fewer signup form down the road.
 */

import { prisma } from '../lib/db'

type SignupBody = {
  email?: string
  locale?: string
  source?: string
}

type Ok = { ok: true }
type Err = { ok: false; reason: 'invalid' | 'parse' | 'method' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(payload: Ok | Err, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      // Don't cache POST responses; ensure proxies treat them per-request.
      'cache-control': 'no-store',
    },
  })
}

/**
 * Subscribe an email to a Resend Audience. Returns the contact id on
 * success, or null on any failure (so the caller can carry on without
 * blocking the visitor). Resend returns 200 with `{ data: { id } }` for
 * new contacts; the same shape with the existing id for duplicates.
 *
 * Docs: https://resend.com/docs/api-reference/contacts/create-contact
 */
async function addToResendAudience(
  audienceId: string,
  email: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ email, unsubscribed: false }),
        // Resend's API is usually <300 ms; bail fast so a slow API call
        // never holds the function open past the visitor's download click.
        signal: AbortSignal.timeout(4000),
      },
    )
    if (!res.ok) {
      console.warn('[free-signup] resend audience non-2xx', {
        audienceId,
        status: res.status,
      })
      return null
    }
    const data = (await res.json()) as { data?: { id?: string } } | null
    return data?.data?.id ?? null
  } catch (err) {
    console.warn('[free-signup] resend audience error', {
      audienceId,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

function clientIp(request: Request): string | undefined {
  // Vercel populates `x-forwarded-for` as a comma-separated list; the
  // first entry is the originating client. Cap length defensively.
  const xff = request.headers.get('x-forwarded-for')
  if (!xff) return undefined
  return xff.split(',')[0]?.trim().slice(0, 64) || undefined
}

function normalizedSource(input: string | undefined): 'pricing_free' | 'thanks_page' | 'other' {
  if (input === 'pricing-free' || input === 'pricing_free') return 'pricing_free'
  if (input === 'thanks-page' || input === 'thanks_page') return 'thanks_page'
  return 'other'
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, reason: 'method' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  let body: SignupBody
  try {
    body = (await request.json()) as SignupBody
  } catch {
    return json({ ok: false, reason: 'parse' }, 400)
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return json({ ok: false, reason: 'invalid' }, 400)
  }

  const locale = (body.locale || 'en').slice(0, 8)
  const source = normalizedSource(body.source)
  const ipAddress = clientIp(request)
  const userAgent = request.headers.get('user-agent')?.slice(0, 256) ?? undefined
  const origin = request.headers.get('origin')?.slice(0, 256) ?? undefined

  // Lightweight server-side log so we can sanity-check signups without
  // leaking full addresses into logs (first char + length is enough to
  // correlate with the DB row if we need to follow up on an abuse case).
  console.log('[free-signup]', {
    first: email.charAt(0),
    length: email.length,
    locale,
    source,
  })

  // 1. Resend audience fan-out — fire BEFORE the DB write so we can
  //    store the returned contact ids alongside the row. Both run in
  //    parallel; either failing is non-fatal.
  const apiKey = process.env.RESEND_API_KEY
  const releasesAudience = process.env.RESEND_AUDIENCE_RELEASES
  const launchesAudience = process.env.RESEND_AUDIENCE_LAUNCHES

  let releasesContactId: string | null = null
  let launchesContactId: string | null = null
  if (apiKey) {
    const [releasesRes, launchesRes] = await Promise.all([
      releasesAudience
        ? addToResendAudience(releasesAudience, email, apiKey)
        : Promise.resolve(null),
      launchesAudience
        ? addToResendAudience(launchesAudience, email, apiKey)
        : Promise.resolve(null),
    ])
    releasesContactId = releasesRes
    launchesContactId = launchesRes
  } else {
    console.warn('[free-signup] RESEND_API_KEY missing — skipped audience fan-out')
  }

  // 2. Persist or update. Upsert guards against unique-constraint blowups
  //    on re-signups (visitor clicks twice / re-enters address on another
  //    surface). We only refresh the contact ids if we successfully got
  //    new ones — keeps previously stored ids when the API blips.
  try {
    await prisma.newsletterSignup.upsert({
      where: { email },
      create: {
        email,
        locale,
        source,
        releasesContactId: releasesContactId ?? undefined,
        launchesContactId: launchesContactId ?? undefined,
        ipAddress,
        userAgent,
        origin,
      },
      update: {
        locale,
        source,
        ipAddress,
        userAgent,
        origin,
        // Don't trash an existing contact id with `null` — only overwrite
        // when this round produced a new one.
        ...(releasesContactId ? { releasesContactId } : {}),
        ...(launchesContactId ? { launchesContactId } : {}),
        // A re-signup re-subscribes — clear any previous soft opt-out.
        unsubscribedAt: null,
      },
    })
  } catch (err) {
    console.error('[free-signup] db upsert failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    // Intentional: don't block the download on DB issues.
  }

  return json({ ok: true })
}
