import { z } from 'zod'

/**
 * Referral-landing helpers for `/from/$id` — the page behind the QR code the
 * macOS app stamps onto shared battery cards (`SenseiIdentity.shareURL` in
 * the app repo). The stamped URL shape is:
 *
 *   /from/<senseiID>?card=<type>&ref=<id>
 *     &utm_source=card&utm_medium=share&utm_campaign=<type>
 *
 * Everything here is pure so the route file stays thin and the rules are
 * unit-testable: id sanitizing, card-type parsing, and rebuilding the
 * download href with the attribution params carried through.
 */

/** Card types the app currently ships. Unknown values collapse to `null`
 * and the page renders the generic invitation instead. */
export const CARD_TYPES = ['rescue', 'wrapped', 'health', 'honors'] as const
export type CardType = (typeof CARD_TYPES)[number]

/**
 * The app generates a ≤4-digit numeric code (see `SenseiIdentity.code`), but
 * accept any short alphanumeric token so a future id scheme doesn't break
 * old pages. Anything else (path junk, injection attempts, over-long noise)
 * returns `null` and the greeting falls back to the generic line.
 */
const SENSEI_ID_PATTERN = /^[A-Za-z0-9]{1,8}$/

export function sanitizeSenseiId(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return SENSEI_ID_PATTERN.test(trimmed) ? trimmed : null
}

/**
 * Query values we forward: bounded scalars, never arrays/objects.
 *
 * TanStack Router JSON-parses each search value, so a numeric-looking param
 * (`ref=1234` — exactly what the app stamps) arrives as a number, not a
 * string. Keep scalars in their parsed shape here — transforming them (e.g.
 * to a quoted string) would make the router 307-rewrite every canonical
 * card URL to a normalized form. `downloadHref` stringifies on the way out.
 */
const shortToken = z.union([
  z.string().min(1).max(80),
  z.number().finite(),
  z.boolean(),
])

/**
 * Search-param schema for `/from/$id`. Each field catches to `undefined`
 * individually so one malformed param (e.g. a repeated `?card=`) doesn't
 * throw away the rest of the attribution set.
 */
export const referralSearchSchema = z.object({
  card: z.enum(CARD_TYPES).optional().catch(undefined),
  ref: shortToken.optional().catch(undefined),
  utm_source: shortToken.optional().catch(undefined),
  utm_medium: shortToken.optional().catch(undefined),
  utm_campaign: shortToken.optional().catch(undefined),
  utm_term: shortToken.optional().catch(undefined),
  utm_content: shortToken.optional().catch(undefined),
})

export type ReferralSearch = z.infer<typeof referralSearchSchema>

const DOWNLOAD_PATH = '/download/latest'

/** Params forwarded from the referral URL onto the download link so
 * share→install conversion stays measurable end to end. */
const PASSTHROUGH_KEYS = [
  'ref',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const satisfies ReadonlyArray<keyof ReferralSearch>

/**
 * Download href that carries the incoming `ref` + `utm_*` params through.
 * `/download/latest` is a Vercel redirect to the GitHub release asset;
 * Vercel forwards the query string, and analytics sees the tagged click.
 */
export function downloadHref(search: ReferralSearch): string {
  const params = new URLSearchParams()
  for (const key of PASSTHROUGH_KEYS) {
    const value = search[key]
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `${DOWNLOAD_PATH}?${query}` : DOWNLOAD_PATH
}
