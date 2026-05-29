/**
 * Newsletter signup endpoint (double opt-in).
 *
 *   POST /api/free-signup  { email, locale?, source? }  →  200 { ok: true }
 *
 * Always returns the same shape on valid input — never leak whether
 * the address is new, already pending, or already confirmed.
 *
 * Flow:
 *   1. CSRF check (Origin/Referer must match PUBLIC_SITE_URL).
 *   2. Validate body with strict zod (unknown keys rejected).
 *   3. Postgres-backed per-IP rate limit (count NewsletterSignup rows
 *      in window). Replaces the prior in-memory Map — that broke as
 *      soon as Fluid scaled to >1 instance.
 *   4. Upsert NewsletterSignup. On re-signup after a prior unsub we
 *      bump `tokenEpoch` so the dormant unsubscribe link from the
 *      previous subscription stops working.
 *   5. Mirror to Resend RELEASES audience as `unsubscribed: true`
 *      (pending). Resend dedupes by email so this is idempotent.
 *   6. Send the locale-matched confirmation email with an HMAC-signed
 *      link bound to the row's current tokenEpoch.
 *
 * Vercel Function note
 * --------------------
 * This file lives at root `api/` so Vercel deploys it as a Function.
 * The earlier TanStack Start file-route version (src/routes/api/*) did
 * not deploy in this stack — keep the canonical implementation here.
 * All relative imports carry `.js` because the runtime is Node ESM
 * (`"type":"module"`) and extensionless resolution 404s in /var/task.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { ConfirmEmail } from '../lib/emails/ConfirmEmail.js'
import { confirmEmailText } from '../lib/emails/plaintext.js'
import { confirmSubject } from '../lib/emails/subjects.js'
import { createToken } from '../lib/newsletter-token.js'
import {
  getResendClient,
  isAllowedOrigin,
  releasesAudienceId,
  resendFrom,
  resendReplyTo,
  siteUrl,
  SUPPORTED_LOCALES,
} from '../lib/resend.js'

function json(payload: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

/**
 * Request body schema. Every field is hard-validated before it ever
 * reaches Resend or the email renderer.
 *
 *   - `email`   trimmed, lowercased, RFC-shape check, length-capped.
 *   - `locale`  must be one of the SUPPORTED_LOCALES allowlist; falls
 *               back to 'en' if missing/unknown.
 *   - `source`  short opaque tag from the form (which page it came
 *               from). Strict alphanumeric+_- only — no HTML, no
 *               whitespace, no quotes, no separators.
 *   - `website` honeypot: must be empty/absent. Filled = bot.
 *
 * Strict mode prevents unknown keys (e.g. a forged `name` field that
 * could try to seed Resend contact data).
 */
const SignupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(254)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    // Accept the displayed website language. i18next may send a region
    // subtag (e.g. "de-AT") — strip it before allowlist matching so
    // legitimate visitors don't silently fall back to English.
    locale: z
      .preprocess(
        (v) =>
          typeof v === 'string' ? v.toLowerCase().split('-')[0] : v,
        z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]]),
      )
      .default('en')
      .catch('en'),
    source: z
      .string()
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .default('unknown')
      .catch('unknown'),
    website: z.string().max(0).optional(), // honeypot
  })
  .strict()

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5
// Coarse fallback bucket when no usable IP is present. Limits the total
// throughput of "untrusted" callers per window so a header-stripping
// botnet can't quietly flood the table while every individual request
// has no IP to count against.
const FALLBACK_RATE_MAX = 25
const IP_HEADER_MAX = 64

// IPs we refuse to count against — they're useless as buckets and a
// trivial spoof target. Real Vercel traffic never produces these.
const UNTRUSTED_IPS = new Set([
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '::ffff:0.0.0.0',
  '::ffff:127.0.0.1',
])

/**
 * Extract the client IP from the request. Returns null on anything we
 * can't trust as a stable per-client bucket. The caller MUST treat null
 * as "rate-limit unbucketed" rather than "skip the limit" — that's how
 * we avoid the historical fail-open where a stripped proxy let one
 * machine bypass the cap.
 */
function clientIp(request: Request): string | null {
  // x-forwarded-for can be a comma list (proxy-chain). The leftmost
  // entry is the originating client per the de-facto convention on
  // Vercel + most major reverse proxies. Cap the slice so a malformed
  // header can't blow up the cost of `LIKE` / equality lookups.
  const xff = request.headers.get('x-forwarded-for')
  const raw = (xff?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '').slice(0, IP_HEADER_MAX)
  if (!raw) return null
  if (UNTRUSTED_IPS.has(raw)) return null
  return raw
}

/**
 * Postgres-backed rate limiter. When the IP is missing or untrusted we
 * fall back to a coarser bucket: a `null`-ipAddress count across all
 * signups in the window. That keeps the worst-case throughput of all
 * header-stripped traffic to FALLBACK_RATE_MAX, instead of letting it
 * sail past the per-IP wall entirely.
 *
 * DB outages fail-OPEN (log + allow) — we don't want a transient
 * Postgres blip to kill legitimate signups, and Resend itself caps
 * outbound send volume so a flood mid-outage stays bounded.
 */
async function rateLimited(ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS)
  try {
    if (ip) {
      const count = await db.newsletterSignup.count({
        where: { ipAddress: ip, createdAt: { gt: since } },
      })
      return count >= RATE_MAX
    }
    // No usable IP. Count the global "untrusted" bucket — every signup
    // whose ipAddress is null in the window. This is intentionally
    // coarse: any single untrusted caller eats into the same budget as
    // every other untrusted caller, so a flood is throttled even if
    // every individual request hides behind a stripped header.
    const count = await db.newsletterSignup.count({
      where: { ipAddress: null, createdAt: { gt: since } },
    })
    return count >= FALLBACK_RATE_MAX
  } catch (err) {
    console.error('[newsletter] rate limit query failed', err)
    return false
  }
}

function hostname(): string {
  try {
    return new URL(siteUrl()).hostname
  } catch {
    return 'battery-sensei.app'
  }
}

export async function POST(request: Request): Promise<Response> {
  // CSRF defense. application/json POSTs aren't subject to a forged
  // form-submit per the simple-request rule, but cross-origin fetch
  // with custom headers is still possible from a misconfigured embed
  // or a malicious extension. Require same-origin.
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: 'bad-origin' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid-json' }, { status: 400 })
  }

  // Strict zod parse. Rejects unknown keys (would-be `name` injection),
  // bad email shape, non-allowlist locales, and source values that
  // contain anything but [A-Za-z0-9_-]. Honeypot must be empty.
  const parsed = SignupSchema.safeParse(raw)
  if (!parsed.success) {
    // Honeypot trip looks identical from outside — return a quiet 200
    // so bots can't tell schema failure from bad-email failure.
    const isHoneypot =
      parsed.error.issues.some((i) => i.path[0] === 'website') ||
      parsed.error.issues.some((i) => i.code === 'unrecognized_keys')
    if (isHoneypot) return json({ ok: true })
    return json({ ok: false, error: 'invalid-input' }, { status: 400 })
  }

  const { email, locale, source } = parsed.data
  const ip = clientIp(request)

  if (await rateLimited(ip)) {
    // Quiet 200 — don't confirm to attackers that they hit the wall.
    return json({ ok: true })
  }

  const releasesId = releasesAudienceId()
  if (!releasesId) {
    console.error('[newsletter] RESEND_AUDIENCE_RELEASES is not set')
    return json({ ok: false, error: 'misconfigured' }, { status: 500 })
  }

  // Map zod `source` to the Prisma enum. The form may send either
  // hyphenated (`pricing-free`, `walkthrough-notify`) or underscored
  // (`pricing_free`, `resend_confirm`) variants — we normalise the
  // hyphen→underscore first, then bucket anything outside the enum
  // allowlist as `other` so a typo on the client never rejects a
  // legitimate signup. Pricing free + thanks-page resends are the only
  // values that map 1:1; anything else (walkthrough, resend-confirm,
  // future surfaces) is recorded as `other` until the enum is widened.
  const normalisedSource = source.replace(/-/g, '_')
  const sourceEnum =
    normalisedSource === 'pricing_free' || normalisedSource === 'thanks_page'
      ? normalisedSource
      : 'other'

  // Upsert the row. On re-signup after a prior unsub, bump tokenEpoch
  // so the old unsubscribe link can't unsubscribe the freshly opted-in
  // address. confirmedAt is intentionally NOT cleared — we keep the
  // historical opt-in record but rely on tokenEpoch + Resend state.
  const row = await db.newsletterSignup.upsert({
    where: { email },
    create: {
      email,
      locale,
      source: sourceEnum,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
      origin: request.headers.get('origin') ?? null,
    },
    // A simple duplicate signup mid-flow (e.g. visitor double-clicks
    // the button) must keep the prior confirm link working so the
    // inbox-race doesn't confuse them — so we do NOT bump tokenEpoch
    // here. Resubscribe-after-unsub is handled below via a follow-up
    // update that bumps the epoch in one extra write.
    update: {
      locale,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
      origin: request.headers.get('origin') ?? null,
    },
  })

  // Compute the effective epoch for token issuance. If the address was
  // previously unsubscribed, bump now (one extra write, but rare path).
  let epoch = row.tokenEpoch
  if (row.unsubscribedAt) {
    const bumped = await db.newsletterSignup.update({
      where: { email },
      data: {
        tokenEpoch: { increment: 1 },
        unsubscribedAt: null,
      },
    })
    epoch = bumped.tokenEpoch
  }

  const resend = getResendClient()

  // Pending state lives only in the RELEASES audience. We add to
  // LAUNCHES at confirm-time so that audience never holds unverified
  // contacts.
  try {
    const created = await resend.contacts.create({
      audienceId: releasesId,
      email,
      unsubscribed: true,
      firstName: `src:${source}|lang:${locale}`,
    })
    const contactId = (created as { data?: { id?: string } } | undefined)
      ?.data?.id
    if (contactId && contactId !== row.releasesContactId) {
      await db.newsletterSignup
        .update({
          where: { email },
          data: { releasesContactId: contactId },
        })
        .catch(() => {})
    }
  } catch (err) {
    // Resend treats existing email as no-op here, so the only failures
    // worth logging are real ones (network, auth).
    console.error('[newsletter] contacts.create failed', err)
  }

  const confirmToken = createToken(email, 'confirm', locale, epoch)
  const unsubToken = createToken(email, 'unsubscribe', locale, epoch)
  const confirmUrl = `${siteUrl()}/api/newsletter/confirm?token=${confirmToken}`
  // Used for the RFC 8058 List-Unsubscribe header only — not surfaced
  // in the visible confirm email body, since the user hasn't opted in yet.
  const unsubscribeUrl = `${siteUrl()}/api/newsletter/unsubscribe?token=${unsubToken}`

  const html = renderToStaticMarkup(
    createElement(ConfirmEmail, {
      confirmUrl,
      locale,
      siteUrl: siteUrl(),
    }),
  )

  try {
    await resend.emails.send({
      from: resendFrom(),
      to: email,
      replyTo: resendReplyTo(),
      subject: confirmSubject(locale),
      html,
      text: confirmEmailText(locale, confirmUrl),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe@${hostname()}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'kind', value: 'confirm' },
        { name: 'locale', value: locale },
        { name: 'source', value: source },
      ],
    })
  } catch (err) {
    console.error('[newsletter] confirm send failed', err)
    return json({ ok: false, error: 'send-failed' }, { status: 502 })
  }

  return json({ ok: true })
}
