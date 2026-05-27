import { useEffect, useState } from 'react'
import {
  CANONICAL_PRICE,
  formatPrice,
  formatPriceAmount,
  formatZero,
  priceForCountry,
  priceForCurrency,
  priceForLocale,
  type PriceEntry,
} from './pricing'
import {
  LIFETIME_FALLBACK,
  LIFETIME_FALLBACK_DEFAULT,
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
//
// The cache key is the chosen currency (`auto` for "no override"). The
// /checkout switcher remounts the hook with `currency='USD' | 'EUR' | 'CZK'`
// and we keep one entry per key — flipping the switch never serves a
// stale preview from the other currency.
const SHARED_TTL_MS = 60 * 1000
const inFlightByKey: Map<string, Promise<ApiResponse | null>> = new Map()
const cachedByKey: Map<string, { at: number; data: ApiResponse }> = new Map()

function fetchPrice(currency?: 'USD' | 'EUR' | 'CZK'): Promise<ApiResponse | null> {
  const key = currency ?? 'auto'
  const now = Date.now()
  const c = cachedByKey.get(key)
  if (c && now - c.at < SHARED_TTL_MS) return Promise.resolve(c.data)
  const ip = inFlightByKey.get(key)
  if (ip) return ip
  const url =
    '/api/price' + (currency ? `?currency=${currency.toLowerCase()}` : '')
  const promise = fetch(url, { headers: { accept: 'application/json' } })
    .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : null))
    .then((data) => {
      if (data) cachedByKey.set(key, { at: Date.now(), data })
      inFlightByKey.delete(key)
      return data
    })
    .catch(() => {
      inFlightByKey.delete(key)
      return null
    })
  inFlightByKey.set(key, promise)
  return promise
}

// SSR/prerender renders the canonical USD price; the first client effect
// applies a fast locale-based guess, then a /api/price round trip swaps in
// the live Polar preview (real FX + VAT). Each stage only paints when the
// value actually differs, so steady-state countries see one paint.
//
// `currency` is an OPTIONAL explicit override coming from the /checkout
// switcher. When unset, the server picks USD or EUR based on the
// visitor's detected country (CZK / GBP / etc. are never auto-chosen).
export function usePremiumPrice(currency?: 'USD' | 'EUR' | 'CZK'): DisplayPrice {
  const [price, setPrice] = useState<DisplayPrice>(FALLBACK)

  useEffect(() => {
    let cancelled = false

    const locale =
      (typeof navigator !== 'undefined' &&
        (navigator.language || navigator.languages?.[0])) ||
      'en-US'
    // When the caller forced a currency (USD/EUR switcher), respect
    // it for the pre-API fallback paint too. Keep the visitor's
    // locale so number separators stay native. Otherwise fall back to
    // the locale-based country guess.
    const localGuess: PriceEntry = currency
      ? { ...priceForCurrency(currency), locale }
      : priceForLocale(locale)
    setPrice(fromEntry(localGuess, { isLive: false }))

    fetchPrice(currency).then((data) => {
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
          // Headline tax note intentionally blank. The /api/price
          // preview is fetched against a currency-matched billing
          // country (US for USD, DE for EUR — see
          // `previewCountryFor` in api/price.ts) so its `tax_*`
          // values reflect *that* jurisdiction, not the visitor's
          // real one. Surfacing "incl. CZK 8.64 tax" to a Czech
          // visitor whose preview was fetched as US/DE is worse
          // than no tax line. Polar's iframe shows the correct tax
          // breakdown live once the buyer enters their billing
          // address, so the on-page note has no job left to do.
          taxNote: '',
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
    // Re-run on currency change so the /checkout switcher repaints
    // both the fallback guess and the live preview in the new code.
  }, [currency])

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
export function useLifetimePrice(currency?: 'USD' | 'EUR' | 'CZK'): LifetimePrice {
  const yearly = usePremiumPrice(currency)
  const [live, setLive] = useState<LifetimeBlock | null>(null)
  const [hasDiscount, setHasDiscount] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    fetchPrice(currency).then((data) => {
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
    // Re-fetch the lifetime block when the currency switcher flips —
    // otherwise the strikethrough + discounted total would stay in
    // the previous currency until the next session-level cache miss.
  }, [currency])

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
        // Tax note suppressed — see rationale in `usePremiumPrice`.
        // The lifetime block carries the same caveat: its tax field
        // reflects the forced US/DE preview jurisdiction, not the
        // visitor's real billing country.
        taxNote: '',
      },
      original: {
        ...base,
        amount: live.original_amount / 100,
        formatted: live.original_formatted,
      },
      hasDiscount,
    }
  }

  // Fallback — when the live Polar lifetime preview isn't available
  // (env var missing, network failure, etc.). Reads explicit per-
  // currency figures that mirror the Polar dashboard config; this
  // replaced the old `yearly + 1` / `yearly × 3` heuristic, which
  // hard-coded a 3× anchor that no longer matches the actual
  // Lifetime price (Lifetime is 4× yearly now, not 3×, and the
  // discount is a fixed $7.50 / €7.00 / 110 Kč drop rather than a
  // simple $1 delta).
  const fallback =
    LIFETIME_FALLBACK[yearly.currency.toUpperCase()] ??
    LIFETIME_FALLBACK_DEFAULT

  return {
    discounted: {
      ...base,
      amount: fallback.discounted,
      formatted: formatPriceAmount(yearly, fallback.discounted),
    },
    original: {
      ...base,
      amount: fallback.full,
      formatted: formatPriceAmount(yearly, fallback.full),
    },
    hasDiscount: true,
  }
}
