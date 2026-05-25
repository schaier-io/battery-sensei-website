import { useEffect, useState } from 'react'
import {
  CANONICAL_PRICE,
  formatPrice,
  formatPriceAmount,
  formatZero,
  priceForCountry,
  priceForLocale,
  type PriceEntry,
} from './pricing'
import {
  LIFETIME_DELTA_OVER_YEARLY,
  LIFETIME_FULL_MULTIPLIER,
} from './polar'

export type DisplayPrice = PriceEntry & {
  /** e.g. "$3.99", "€3.99", "¥590" — the headline price */
  formatted: string
  /** e.g. "$0", "€0", "¥0" — for the free-trial card */
  zero: string
  /** True until client-side detection runs. Always true during SSR/prerender. */
  isCanonical: boolean
  /** True once the live LS preview has loaded. False while on the local table. */
  isLive: boolean
  /** Short note like "incl. €0.80 VAT" when LS reports tax > 0; empty otherwise. */
  taxNote: string
}

const FALLBACK: DisplayPrice = {
  ...CANONICAL_PRICE,
  formatted: formatPrice(CANONICAL_PRICE),
  zero: formatZero(CANONICAL_PRICE),
  isCanonical: true,
  isLive: false,
  taxNote: '',
}

function fromEntry(entry: PriceEntry, opts: { isLive: boolean; taxNote?: string }): DisplayPrice {
  return {
    ...entry,
    formatted: formatPrice(entry),
    zero: formatZero(entry),
    isCanonical: entry.currency === CANONICAL_PRICE.currency,
    isLive: opts.isLive,
    taxNote: opts.taxNote ?? '',
  }
}

type ApiResponse =
  | {
      ok: true
      country: string
      currency: string
      amount: number
      formatted: string
      subtotal_formatted: string
      tax_formatted: string
      has_tax: boolean
    }
  | { ok: false; country?: string }

// SSR/prerender renders the canonical USD price; the first client effect
// applies a fast locale-based guess, then a /api/price round trip swaps in
// the live Polar preview (real FX + VAT). Each stage only paints when the
// value actually differs, so steady-state countries see one paint.
export function usePremiumPrice(): DisplayPrice {
  const [price, setPrice] = useState<DisplayPrice>(FALLBACK)

  useEffect(() => {
    let cancelled = false

    const locale =
      (typeof navigator !== 'undefined' &&
        (navigator.language || navigator.languages?.[0])) ||
      'en-US'
    const localGuess = priceForLocale(locale)
    setPrice(fromEntry(localGuess, { isLive: false }))

    fetch('/api/price', { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return
        if (data.ok) {
          // Use the Polar preview directly — currency + amount come from
          // their checkout, so what we show is what they will charge. The
          // locale is the visitor's so number separators look native.
          setPrice({
            amount: data.amount,
            currency: data.currency,
            locale,
            formatted: data.formatted,
            zero: formatZero({ amount: 0, currency: data.currency, locale }),
            isCanonical: data.currency === CANONICAL_PRICE.currency,
            isLive: true,
            taxNote: data.has_tax && data.tax_formatted
              ? `incl. ${data.tax_formatted} tax`
              : '',
          })
          return
        }
        // API ran but Polar is unavailable (unconfigured/timeout/etc).
        // Refine the local guess using server-detected country (more
        // reliable than navigator.language for VPN/proxy users).
        if (data.country) {
          const refined = priceForCountry(data.country)
          if (refined.currency !== localGuess.currency || refined.amount !== localGuess.amount) {
            setPrice(fromEntry(refined, { isLive: false }))
          }
        }
      })
      .catch(() => {
        // Network failure — already on the locale guess. No-op.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return price
}

export type LifetimePrice = {
  /** Discounted lifetime price — what buyers pay during the first-500 window. */
  discounted: DisplayPrice
  /** "Original" strikethrough price — the lifetime full price (3× yearly). */
  original: DisplayPrice
}

/**
 * Lifetime price is derived from the yearly price so it always matches the
 * visitor's currency without a second API roundtrip. Formula:
 *   discounted = yearly + 1 unit (or rounded equivalent for JPY/NOK/etc.)
 *   original   = yearly × 3
 * Once Polar exhausts the ZENMODE cap server-side, the discounted price
 * disappears from copy and we display `original` as the headline.
 */
export function useLifetimePrice(): LifetimePrice {
  const yearly = usePremiumPrice()

  const discountedAmount = yearly.amount + LIFETIME_DELTA_OVER_YEARLY
  const originalAmount = yearly.amount * LIFETIME_FULL_MULTIPLIER

  const base = {
    currency: yearly.currency,
    locale: yearly.locale,
    isCanonical: yearly.isCanonical,
    isLive: yearly.isLive,
    taxNote: '',
    zero: yearly.zero,
  }

  return {
    discounted: {
      ...base,
      amount: discountedAmount,
      formatted: formatPriceAmount(yearly, discountedAmount),
    },
    original: {
      ...base,
      amount: originalAmount,
      formatted: formatPriceAmount(yearly, originalAmount),
    },
  }
}
