import { useEffect, useState } from 'react'
import {
  CANONICAL_PRICE,
  formatPrice,
  formatZero,
  priceForLocale,
  type PriceEntry,
} from './pricing'

export type DisplayPrice = PriceEntry & {
  /** e.g. "$3.99", "€3.99", "¥590" */
  formatted: string
  /** e.g. "$0", "€0", "¥0" — for the free-trial card */
  zero: string
  /** True until client-side locale detection runs. Always true during SSR/prerender. */
  isCanonical: boolean
}

const FALLBACK: DisplayPrice = {
  ...CANONICAL_PRICE,
  formatted: formatPrice(CANONICAL_PRICE),
  zero: formatZero(CANONICAL_PRICE),
  isCanonical: true,
}

// SSR/prerender renders the canonical USD price; the first client effect
// swaps to the visitor's locale. One paint of flicker beats serving an
// HTML page that disagrees with itself across regions.
export function usePremiumPrice(): DisplayPrice {
  const [price, setPrice] = useState<DisplayPrice>(FALLBACK)

  useEffect(() => {
    const locale =
      (typeof navigator !== 'undefined' &&
        (navigator.language || navigator.languages?.[0])) ||
      'en-US'
    const entry = priceForLocale(locale)
    setPrice({
      ...entry,
      formatted: formatPrice(entry),
      zero: formatZero(entry),
      isCanonical: entry.currency === CANONICAL_PRICE.currency,
    })
  }, [])

  return price
}
