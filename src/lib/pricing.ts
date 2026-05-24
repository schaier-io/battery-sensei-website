// Localized price table for Sensei Premium.
//
// USD is the canonical price (used in schema.org offers + the LemonSqueezy
// charge). Display prices in each region are hand-picked for psychological
// price comfort — charm pricing (.99 / .49) in Western markets, whole numbers
// in CHF/JPY/NOK/SEK/INR where charm-pricing reads as cheap-and-spammy.
// They're rough approximations of USD 3.99, not live FX rates.
//
// LemonSqueezy will charge the user's actual local currency at checkout
// (computed from billing country), which is what gets reconciled. The
// website's price is a marketing surface, not the source of truth.

export type PriceEntry = {
  amount: number
  currency: string
  locale: string
}

const US: PriceEntry  = { amount: 3.99,  currency: 'USD', locale: 'en-US' }
const EU: PriceEntry  = { amount: 3.99,  currency: 'EUR', locale: 'de-DE' }
const GB: PriceEntry  = { amount: 3.49,  currency: 'GBP', locale: 'en-GB' }
const CH: PriceEntry  = { amount: 3.90,  currency: 'CHF', locale: 'de-CH' }
const CA: PriceEntry  = { amount: 5.49,  currency: 'CAD', locale: 'en-CA' }
const AU: PriceEntry  = { amount: 5.99,  currency: 'AUD', locale: 'en-AU' }
const NZ: PriceEntry  = { amount: 6.49,  currency: 'NZD', locale: 'en-NZ' }
const JP: PriceEntry  = { amount: 590,   currency: 'JPY', locale: 'ja-JP' }
const KR: PriceEntry  = { amount: 5500,  currency: 'KRW', locale: 'ko-KR' }
const SG: PriceEntry  = { amount: 5.49,  currency: 'SGD', locale: 'en-SG' }
const HK: PriceEntry  = { amount: 31,    currency: 'HKD', locale: 'en-HK' }
const IN: PriceEntry  = { amount: 349,   currency: 'INR', locale: 'en-IN' }
const BR: PriceEntry  = { amount: 19.90, currency: 'BRL', locale: 'pt-BR' }
const MX: PriceEntry  = { amount: 79,    currency: 'MXN', locale: 'es-MX' }
const NO: PriceEntry  = { amount: 39,    currency: 'NOK', locale: 'nb-NO' }
const SE: PriceEntry  = { amount: 39,    currency: 'SEK', locale: 'sv-SE' }
const DK: PriceEntry  = { amount: 27,    currency: 'DKK', locale: 'da-DK' }
const PL: PriceEntry  = { amount: 16,    currency: 'PLN', locale: 'pl-PL' }
const CZ: PriceEntry  = { amount: 89,    currency: 'CZK', locale: 'cs-CZ' }
const HU: PriceEntry  = { amount: 1490,  currency: 'HUF', locale: 'hu-HU' }
const TR: PriceEntry  = { amount: 139,   currency: 'TRY', locale: 'tr-TR' }
const ZA: PriceEntry  = { amount: 75,    currency: 'ZAR', locale: 'en-ZA' }
const AE: PriceEntry  = { amount: 14.99, currency: 'AED', locale: 'en-AE' }
const IL: PriceEntry  = { amount: 14.90, currency: 'ILS', locale: 'he-IL' }

const EUROZONE = new Set([
  'AT','BE','CY','DE','EE','ES','FI','FR','GR','IE',
  'IT','LT','LU','LV','MT','NL','PT','SI','SK','HR',
])

const REGION_TO_PRICE: Record<string, PriceEntry> = {
  US: US, CA: CA, MX: MX, BR: BR,
  GB: GB, CH: CH, NO: NO, SE: SE, DK: DK, PL: PL, CZ: CZ, HU: HU, TR: TR,
  AU: AU, NZ: NZ, JP: JP, KR: KR, SG: SG, HK: HK, IN: IN,
  ZA: ZA, AE: AE, IL: IL,
}

export function priceForLocale(locale: string | undefined): PriceEntry {
  if (!locale) return US
  try {
    const region = new Intl.Locale(locale).region
    if (!region) return US
    if (EUROZONE.has(region)) return EU
    return REGION_TO_PRICE[region] ?? US
  } catch {
    return US
  }
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

export const CANONICAL_PRICE = US
