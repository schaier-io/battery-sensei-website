// Localized price table for Sensei Premium — used as the **fallback** when the
// live `/api/price` endpoint (which talks to Polar's Checkout API for the true
// per-country preview including FX + VAT) is unreachable or unconfigured. See
// `api/price.ts` and `use-price.ts` for the live path.
//
// Polar only settles in three currencies today: USD, EUR, CZK. Showing
// any other currency in the fallback would mean the visitor sees one
// price on the page and a *different* one at checkout. So this table is
// deliberately tiny:
//   - EU (eurozone members) → EUR
//   - CZ                    → CZK
//   - everything else       → USD (the canonical charge)
//
// Display amounts are hand-picked for psychological price comfort
// (charm pricing in USD/EUR, a clean whole number in CZK where decimals
// read as cheap-and-spammy). They're rough approximations of USD 3.99,
// not live FX — Polar's live preview replaces them whenever the API
// round-trip succeeds.

export type PriceEntry = {
  amount: number
  currency: string
  locale: string
}

const US: PriceEntry = { amount: 3.99, currency: 'USD', locale: 'en-US' }
const EU: PriceEntry = { amount: 3.99, currency: 'EUR', locale: 'de-DE' }
const CZ: PriceEntry = { amount: 89,   currency: 'CZK', locale: 'cs-CZ' }

const EUROZONE = new Set([
  'AT','BE','CY','DE','EE','ES','FI','FR','GR','IE',
  'IT','LT','LU','LV','MT','NL','PT','SI','SK','HR',
])

// Only currencies Polar actually charges in. Anything not here resolves
// to the USD canonical price via `priceForCountry`'s fallback below.
const REGION_TO_PRICE: Record<string, PriceEntry> = {
  US,
  CZ,
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

export function priceForCountry(country: string | null | undefined): PriceEntry {
  if (!country) return US
  const code = country.toUpperCase()
  if (EUROZONE.has(code)) return EU
  return REGION_TO_PRICE[code] ?? US
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
