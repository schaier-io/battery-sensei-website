import { useEffect, useState } from 'react'
import { LIFETIME_DISCOUNT_MAX_REDEMPTIONS } from '#/lib/polar'

/** Shape mirrored from `api/discount-availability.ts`. */
export type DiscountAvailability = {
  used: number
  max: number
  remaining: number
  /** True when we got a live count from Polar; false when the bar is
   *  anchored on the static `max` only. */
  live: boolean
}

const DEFAULT: DiscountAvailability = {
  used: 0,
  max: LIFETIME_DISCOUNT_MAX_REDEMPTIONS,
  remaining: LIFETIME_DISCOUNT_MAX_REDEMPTIONS,
  live: false,
}

// Module-level cache shared across all mounts of the hook within a
// single page lifetime. The server endpoint also caches for 5 min, so
// in the worst case we fire one request per fresh page load.
let cached: DiscountAvailability | null = null
let inflight: Promise<DiscountAvailability> | null = null

async function load(): Promise<DiscountAvailability> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/discount-availability', { credentials: 'omit' })
      if (!res.ok) throw new Error('http')
      const json = (await res.json()) as
        | { ok: true; used: number; max: number; remaining: number }
        | { ok: false; max: number }
      if (json.ok) {
        const data: DiscountAvailability = {
          used: json.used,
          max: json.max,
          remaining: Math.max(0, json.max - json.used),
          live: true,
        }
        cached = data
        return data
      }
      const fallback: DiscountAvailability = {
        used: 0,
        max: json.max,
        remaining: json.max,
        live: false,
      }
      cached = fallback
      return fallback
    } catch {
      cached = DEFAULT
      return DEFAULT
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * Returns the live availability of the ZENMODE discount, or a safe
 * static default while the request is in flight. The first call kicks
 * off the network request; subsequent mounts read from the module-level
 * cache.
 */
export function useDiscountAvailability(): DiscountAvailability {
  const [data, setData] = useState<DiscountAvailability>(cached ?? DEFAULT)
  useEffect(() => {
    let cancelled = false
    load().then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return data
}
