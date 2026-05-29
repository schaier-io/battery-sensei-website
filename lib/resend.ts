/**
 * Server-only Resend client + helpers.
 *
 * Segment model (matches .env.example):
 *   Resend replaced Audiences with Segments — contacts now live at the
 *   account level and are grouped by segment. A signup is created ONCE
 *   (`contacts.create`) and attached to every configured segment via the
 *   `segments` field. The `unsubscribed` flag is a contact-level property,
 *   so it gates delivery across all segments at once.
 *     - RESEND_SEGMENT_RELEASES  — "heads-up on new versions" build alerts.
 *     - RESEND_SEGMENT_UI_NOTIFY — "UI notify" updates.
 *   Both segments receive EVERY signup, regardless of entry surface. The
 *   contact starts `unsubscribed: true` (pending) and is flipped to
 *   subscribed on double-opt-in confirm.
 *
 * The legacy `audienceId` create path is intentionally NOT used: a
 * freshly-created segment has no legacy "audience" record, so the old
 * `POST /audiences/{id}/contacts` 404s for it (and was silently swallowed).
 *
 * Locale is carried in the contact's `firstName` field (`lang:xx`) since
 * Resend has no custom-fields API yet. Send-time we use the locale from
 * the signed token, not from Resend, so it's always exact.
 */
import { Resend } from 'resend'

export type SupportedLocale = 'en' | 'de' | 'es' | 'fr' | 'ja'

export const SUPPORTED_LOCALES: ReadonlyArray<SupportedLocale> = [
  'en',
  'de',
  'es',
  'fr',
  'ja',
]

export function siteUrl(): string {
  const u = process.env.PUBLIC_SITE_URL ?? 'https://battery-sensei.app'
  return u.replace(/\/+$/, '')
}

/**
 * Origins the CSRF gate is willing to accept on state-changing POSTs
 * (free-signup, confirm). Always includes the canonical site URL; on
 * Vercel preview/branch deployments we also accept the auto-set
 * `VERCEL_URL` and `VERCEL_BRANCH_URL` so PR previews can exercise the
 * full signup flow without re-configuring `PUBLIC_SITE_URL` per env.
 *
 * Vercel guarantees those env vars only on its build/runtime — locally
 * they're undefined and the canonical URL is the only entry. The
 * unsubscribe POST deliberately does NOT consult this set; it must
 * accept any-origin POSTs to honor RFC 8058 inbox-side one-click.
 */
export function allowedOrigins(): Set<string> {
  const origins = new Set<string>([siteUrl()])
  for (const key of ['VERCEL_URL', 'VERCEL_BRANCH_URL'] as const) {
    const value = process.env[key]
    if (!value) continue
    // Vercel sets these as bare hostnames (no scheme). Prepend https.
    const normalised = value.startsWith('http')
      ? value.replace(/\/+$/, '')
      : `https://${value.replace(/\/+$/, '')}`
    origins.add(normalised)
  }
  return origins
}

/**
 * Same-origin gate for state-changing POSTs. Browsers always send
 * `Origin` on cross-origin fetch + on same-origin POSTs initiated from
 * `fetch()`; the `Referer` fallback covers the rare browser/extension
 * scenario where `Origin` is stripped (e.g. some privacy add-ons).
 *
 * Returns false on missing headers — server-tool POSTs (curl, Postman)
 * and cross-origin pages both fail the gate.
 */
export function isAllowedOrigin(request: Request): boolean {
  const allowed = allowedOrigins()
  const origin = request.headers.get('origin')
  if (origin) return allowed.has(origin)
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin)
    } catch {
      return false
    }
  }
  return false
}

export function resendFrom(): string {
  return (
    process.env.NEWSLETTER_FROM ??
    process.env.RESEND_FROM ??
    'Battery Sensei <hello@battery-sensei.app>'
  )
}

export function resendReplyTo(): string | undefined {
  return process.env.NEWSLETTER_REPLY_TO || undefined
}

export function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

/**
 * Resend Segment ids a new signup is enrolled in, shaped for the
 * `contacts.create({ segments })` payload. Both configured segments
 * receive EVERY signup regardless of which surface it came from
 * (pricing free card, walkthrough notify, …).
 *
 * Empty/unset ids are filtered out rather than throwing, so a partially
 * configured env still subscribes to whatever IS set. Returns an empty
 * array only when neither is configured — callers treat that as a
 * misconfiguration.
 */
export function signupSegments(): Array<{ id: string }> {
  return [
    process.env.RESEND_SEGMENT_RELEASES,
    process.env.RESEND_SEGMENT_UI_NOTIFY,
  ]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id))
    .map((id) => ({ id }))
}

export function normalizeLocale(input: unknown): SupportedLocale {
  const raw = typeof input === 'string' ? input.toLowerCase() : ''
  const base = raw.split('-')[0]
  return (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(base)
    ? (base as SupportedLocale)
    : 'en'
}
