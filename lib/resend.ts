/**
 * Server-only Resend client + helpers.
 *
 * Audience model (matches .env.example):
 *   - RESEND_AUDIENCE_RELEASES — Battery Sensei build alerts. Contact
 *     is created here as `unsubscribed: true` at signup and flipped to
 *     subscribed on confirm.
 *   - RESEND_AUDIENCE_LAUNCHES — cross-app announcements ("new app from
 *     the same maker"). Contact is added here only on confirm, so the
 *     pending double-opt-in state is never visible in the launches list.
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

export function releasesAudienceId(): string | null {
  return process.env.RESEND_AUDIENCE_RELEASES || null
}

export function launchesAudienceId(): string | null {
  return process.env.RESEND_AUDIENCE_LAUNCHES || null
}

/**
 * All configured audiences that newsletter operations should walk
 * (subscribe / unsubscribe / update). Releases first by convention —
 * locale is resolved from the signed token, not from Resend.
 */
export function audiences(): Array<{ kind: 'releases' | 'launches'; id: string }> {
  const out: Array<{ kind: 'releases' | 'launches'; id: string }> = []
  const r = releasesAudienceId()
  const l = launchesAudienceId()
  if (r) out.push({ kind: 'releases', id: r })
  if (l) out.push({ kind: 'launches', id: l })
  return out
}

export function normalizeLocale(input: unknown): SupportedLocale {
  const raw = typeof input === 'string' ? input.toLowerCase() : ''
  const base = raw.split('-')[0]
  return (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(base)
    ? (base as SupportedLocale)
    : 'en'
}
