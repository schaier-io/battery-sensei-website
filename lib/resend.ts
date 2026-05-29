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

const DEFAULT_ALLOWED_ORIGINS = [
  'https://battery-sensei.app',
  'https://www.battery-sensei.app',
] as const

function normaliseOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).origin
  } catch {
    return null
  }
}

/**
 * Origins the CSRF gate is willing to accept on state-changing POSTs
 * (free-signup, confirm). Always includes both production brand domains
 * plus the canonical site URL; on Vercel preview/branch deployments we
 * also accept the auto-set `VERCEL_URL` and `VERCEL_BRANCH_URL` so PR
 * previews can exercise the full signup flow without re-configuring
 * `PUBLIC_SITE_URL` per env.
 *
 * The production site can be reached on apex or www. Keeping both here
 * matches the checkout/contact endpoints and prevents a www page from
 * rejecting its own same-site signup POST as `bad-origin`.
 */
export function allowedOrigins(): Set<string> {
  const origins = new Set<string>()
  for (const value of DEFAULT_ALLOWED_ORIGINS) {
    const origin = normaliseOrigin(value)
    if (origin) origins.add(origin)
  }
  const canonicalOrigin = normaliseOrigin(siteUrl())
  if (canonicalOrigin) origins.add(canonicalOrigin)

  for (const key of ['VERCEL_URL', 'VERCEL_BRANCH_URL'] as const) {
    const value = process.env[key]
    if (!value) continue
    // Vercel sets these as bare hostnames (no scheme).
    const origin = normaliseOrigin(value)
    if (origin) origins.add(origin)
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
  const configured = process.env.NEWSLETTER_FROM ?? process.env.RESEND_FROM
  if (!configured) return 'Battery Sensei <hello@battery-sensei.app>'
  // Guarantee a friendly display name in the inbox. If the env var is a bare
  // address ("hello@battery-sensei.app"), wrap it so the From reads
  // "Battery Sensei" rather than the raw email.
  return configured.includes('<')
    ? configured
    : `Battery Sensei <${configured.trim()}>`
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
