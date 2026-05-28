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
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { z } from 'zod'
import { db } from '#/lib/db'
import { ConfirmEmail } from '#/lib/emails/ConfirmEmail'
import { confirmEmailText } from '#/lib/emails/plaintext'
import { confirmSubject } from '#/lib/emails/subjects'
import { createToken } from '#/lib/newsletter-token'
import {
  getResendClient,
  releasesAudienceId,
  resendFrom,
  resendReplyTo,
  siteUrl,
  SUPPORTED_LOCALES,
} from '#/lib/resend'

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

async function rateLimited(ip: string | null): Promise<boolean> {
  if (!ip || ip === '0.0.0.0') return false
  const since = new Date(Date.now() - RATE_WINDOW_MS)
  try {
    const count = await db.newsletterSignup.count({
      where: { ipAddress: ip, createdAt: { gt: since } },
    })
    return count >= RATE_MAX
  } catch (err) {
    // Don't fail-open on a DB outage in a way that lets one IP flood,
    // but don't fail-closed for legit users either — just log and let
    // it through; the Resend account itself rate-limits send volume.
    console.error('[newsletter] rate limit query failed', err)
    return false
  }
}

function clientIp(request: Request): string | null {
  const raw =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    ''
  return raw || null
}

function isAllowedOrigin(request: Request): boolean {
  const expected = siteUrl()
  const origin = request.headers.get('origin')
  if (origin) return origin === expected
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin === expected
    } catch {
      return false
    }
  }
  // No Origin/Referer at all is suspicious for a JSON POST — modern
  // browsers send Origin on same-origin fetch. Treat as cross-origin.
  return false
}

function hostname(): string {
  try {
    return new URL(siteUrl()).hostname
  } catch {
    return 'battery-sensei.app'
  }
}

async function handlePost(request: Request): Promise<Response> {
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

  // Map zod `source` to the Prisma enum. The form sends descriptive
  // strings (e.g. "pricing_free"); anything else is bucketed as `other`
  // so we never reject a signup over a typo on the client.
  const sourceEnum =
    source === 'pricing_free' || source === 'thanks_page'
      ? source
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
    update: {
      locale,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
      origin: request.headers.get('origin') ?? null,
      ...(// Bump epoch only on resubscribe-after-unsub. A simple
      // duplicate signup mid-flow should keep prior confirm links
      // working so the user isn't confused by inbox racing.
      {
        tokenEpoch: { increment: 0 },
      }),
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

export const Route = createFileRoute('/api/free-signup')({
  server: {
    handlers: {
      POST: ({ request }) => handlePost(request),
    },
  },
})
