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
  /** Short note like "incl. €0.80 VAT" when LS reports tax > 0; otherwise empty. */
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

/**
 * Live `lifetime` block returned by `/api/price`. When the lifetime
 * product is configured server-side (POLAR_PRODUCT_ID_LIFETIME), Polar
 * quotes the visitor's exact total — both the post-ZENMODE discounted
 * total AND the pre-discount subtotal — so we don't have to derive them
 * from the yearly price (which goes wildly wrong across currencies; the
 * 165 CZK lifetime is not yearly × 3).
 */
type LifetimeBlock = {
  discounted_amount: number
  discounted_formatted: string
  original_amount: number
  original_formatted: string
  has_discount: boolean
  tax_formatted: string
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
      /** Present when the server has POLAR_PRODUCT_ID_LIFETIME configured. */
      lifetime?: LifetimeBlock
    }
  | { ok: false; country?: string }

// Module-scope dedup so the multiple hooks mounted on /checkout and the
// homepage don't fire `/api/price` more than once per minute. The actual
// HTTP layer also caches (Vercel + browser) but in-memory short-circuit
// is faster on warm navigations.
const SHARED_TTL_MS = 60 * 1000
let inFlight: Promise<ApiResponse | null> | null = null
let cached: { at: number; data: ApiResponse } | null = null

function fetchPrice(): Promise<ApiResponse | null> {
  const now = Date.now()
  if (cached && now - cached.at < SHARED_TTL_MS) {
    return Promise.resolve(cached.data)
  }
  if (inFlight) return inFlight
  inFlight = fetch('/api/price', { headers: { accept: 'application/json' } })
    .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : null))
    .then((data) => {
      if (data) cached = { at: Date.now(), data }
      inFlight = null
      return data
    })
    .catch(() => {
      inFlight = null
      return null
    })
  return inFlight
}

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

    fetchPrice().then((data) => {
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
          taxNote:
            data.has_tax && data.tax_formatted ? `incl. ${data.tax_formatted} tax` : '',
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

    return () => {
      cancelled = true
    }
  }, [])

  return price
}

export type LifetimePrice = {
  /** Discounted lifetime price — what buyers pay during the first-500 window. */
  discounted: DisplayPrice
  /** "Original" strikethrough price — full lifetime price without the launch discount. */
  original: DisplayPrice
  /** True when the discount is currently live (Polar still honours ZENMODE). */
  hasDiscount: boolean
}

/**
 * Lifetime price. When the server has `POLAR_PRODUCT_ID_LIFETIME`
 * configured, `/api/price` returns a live `lifetime` block with the
 * exact totals Polar will charge in the visitor's currency (both the
 * post-ZENMODE total and the pre-discount subtotal). We use those
 * values directly so the displayed prices match the iframe.
 *
 * When the lifetime product isn't configured (or the API call failed),
 * we fall back to the legacy derivation:
 *   discounted = yearly + 1 unit
 *   original   = yearly × 3
 *
 * The derivation is intentionally rough — it's only meant to be a
 * sensible placeholder while the operator wires up the lifetime
 * product. For real prices the operator must set the env var.
 */
export function useLifetimePrice(): LifetimePrice {
  const yearly = usePremiumPrice()
  const [live, setLive] = useState<LifetimeBlock | null>(null)
  const [hasDiscount, setHasDiscount] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    fetchPrice().then((data) => {
      if (cancelled) return
      if (data && data.ok && data.lifetime) {
        setLive(data.lifetime)
        setHasDiscount(data.lifetime.has_discount)
      } else {
        setLive(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const base = {
    currency: yearly.currency,
    locale: yearly.locale,
    isCanonical: yearly.isCanonical,
    isLive: yearly.isLive,
    taxNote: '',
    zero: yearly.zero,
  }

  // Live path: read Polar's exact totals straight off the API payload.
  // `discounted_amount` and `original_amount` come back in minor units
  // (cents/haléř/etc.) so we divide by 100 to match the `amount` shape
  // the rest of the codebase uses.
  if (live) {
    return {
      discounted: {
        ...base,
        amount: live.discounted_amount / 100,
        formatted: live.discounted_formatted,
        taxNote: live.tax_formatted ? `incl. ${live.tax_formatted} tax` : '',
      },
      original: {
        ...base,
        amount: live.original_amount / 100,
        formatted: live.original_formatted,
      },
      hasDiscount,
    }
  }

  // Fallback derivation — only when the lifetime product isn't wired
  // up server-side. Wrong for non-USD currencies; the live path above
  // is the correct one once `POLAR_PRODUCT_ID_LIFETIME` is set.
  const discountedAmount = yearly.amount + LIFETIME_DELTA_OVER_YEARLY
  const originalAmount = yearly.amount * LIFETIME_FULL_MULTIPLIER

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
    hasDiscount: true,
  }
}
