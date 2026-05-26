// Localized price table for Sensei Premium — used as the **fallback** when the
// live `/api/price` endpoint (which talks to Polar's Checkout API for the true
// per-country preview including FX + VAT) is unreachable or unconfigured. See
// `api/price.ts` and `use-price.ts` for the live path.
//
// Display policy
// --------------
// We pick between exactly TWO currencies at default-detection time:
//   - EUR  for visitors in a euro-using country (eurozone + the
//          non-EU territories that use the euro by treaty/convention)
//   - USD  for everyone else (the canonical Sensei charge)
//
// We deliberately do NOT auto-default to other local currencies (CZK,
// GBP, JPY, …) even when Polar would happily settle in them. Reasons:
//   1. Two clean choices make the on-page switcher comprehensible.
//   2. The canonical brand price is stated as US$3.99 — anchoring to
//      USD/EUR keeps the headline number stable across regions.
//   3. Visitors who *want* to pay in their local currency can hit the
//      currency switcher on /checkout; Polar's session-create API
//      accepts the full `PresentmentCurrency` enum at that point.
//
// Display amounts here are hand-picked for psychological price comfort
// (charm pricing at 3.99 in both currencies). They're a rough static
// fallback — Polar's live preview replaces them whenever the API
// round-trip succeeds.

export type PriceEntry = {
  amount: number
  currency: string
  locale: string
}

const US: PriceEntry = { amount: 3.99, currency: 'USD', locale: 'en-US' }
const EU: PriceEntry = { amount: 3.99, currency: 'EUR', locale: 'de-DE' }

/**
 * Countries that use the euro as their everyday currency.
 *
 *   Eurozone EU members (20):
 *     AT BE CY DE EE ES FI FR GR IE IT LT LU LV MT NL PT SI SK HR
 *
 *   Non-EU territories on the euro (by monetary agreement or unilateral
 *   adoption — Polar charges them in EUR all the same):
 *     AD (Andorra), MC (Monaco), SM (San Marino), VA (Vatican City),
 *     ME (Montenegro), XK (Kosovo)
 *
 *   Plus French overseas departments that bill in EUR even though they
 *   carry their own ISO country codes when geolocated separately:
 *     GP MQ GF RE YT BL MF PM (most carriers report these as FR but a
 *     few CDNs return the specific code — include them defensively).
 */
const EUROZONE = new Set([
  // EU members on the euro
  'AT','BE','CY','DE','EE','ES','FI','FR','GR','IE',
  'IT','LT','LU','LV','MT','NL','PT','SI','SK','HR',
  // Non-EU euro users
  'AD','MC','SM','VA','ME','XK',
  // French overseas departments / collectivities billed in EUR
  'GP','MQ','GF','RE','YT','BL','MF','PM',
])

/** True when the country code's everyday currency is the euro. */
export function isEuroCountry(country: string | null | undefined): boolean {
  if (!country) return false
  return EUROZONE.has(country.toUpperCase())
}

export function priceForLocale(locale: string | undefined): PriceEntry {
  if (!locale) return US
  try {
    const region = new Intl.Locale(locale).region
    return priceForCountry(region)
  } catch {
    return US
  }
}

/**
 * Resolve a country to its display PriceEntry. Anything in the euro
 * zone resolves to EUR; everything else (CZ, GB, JP, US, AU, …)
 * resolves to USD. This is the "no surprise CZK / no surprise GBP"
 * policy — if the visitor wants a local currency, the /checkout
 * switcher lets them pick one explicitly.
 */
export function priceForCountry(country: string | null | undefined): PriceEntry {
  if (!country) return US
  if (isEuroCountry(country)) return EU
  return US
}

/**
 * Resolve a 3-letter ISO 4217 currency code to a PriceEntry. Used by
 * the /checkout currency switcher: the visitor picks USD or EUR and we
 * paint the fallback (pre-live-fetch) headline in the chosen currency.
 * Unknown codes fall back to USD so an unexpected value never breaks
 * the page.
 */
export function priceForCurrency(currency: string | null | undefined): PriceEntry {
  if (!currency) return US
  const code = currency.toUpperCase()
  if (code === 'EUR') return EU
  return US
}

// Format the entry's amount as a currency string in its native locale.
// Whole-number amounts (JPY ¥590, NOK kr 39) drop decimals automatically.
export function formatPrice(entry: PriceEntry): string {
  const isWhole = entry.amount % 1 === 0
  return new Intl.NumberFormat(entry.locale, {
    style: 'currency',
    currency: entry.currency,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(entry.amount)
}

// Zero formatted in the entry's currency (for "free trial" displays).
export function formatZero(entry: PriceEntry): string {
  return new Intl.NumberFormat(entry.locale, {
    style: 'currency',
    currency: entry.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0)
}

/**
 * Format an arbitrary amount in the entry's currency + locale, used by the
 * derived Lifetime prices (yearly + 1, yearly × 3). Whole-number currencies
 * (JPY/NOK/etc.) round to the nearest integer so we don't print "¥593.00".
 */
export function formatPriceAmount(entry: PriceEntry, amount: number): string {
  const wholeOnly = Number.isInteger(entry.amount)
  const rounded = wholeOnly ? Math.round(amount) : amount
  return new Intl.NumberFormat(entry.locale, {
    style: 'currency',
    currency: entry.currency,
    minimumFractionDigits: wholeOnly ? 0 : 2,
    maximumFractionDigits: wholeOnly ? 0 : 2,
  }).format(rounded)
}

export const CANONICAL_PRICE = US

/**
 * The two currencies the /checkout switcher exposes. Polar accepts a
 * far larger `PresentmentCurrency` enum on the API side, but for the
 * UI we only surface these two: a stable, comprehensible pair that
 * covers the canonical brand price and the EU's home currency.
 */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/** Type-guard: narrow an arbitrary string to a supported currency. */
export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && SUPPORTED_CURRENCIES.includes(value.toUpperCase() as SupportedCurrency)
}
