/**
 * GET /api/discount-availability — returns how many ZENMODE discount
 * redemptions remain on the Lifetime product, used by the homepage's
 * limited-redeem bar.
 *
 * Flow
 * ----
 *  1. Polar list-discounts endpoint is queried for the ZENMODE code.
 *  2. The matched discount's `redemptions_count` and `max_redemptions`
 *     are returned to the client.
 *  3. Result is cached in-process for 5 minutes. Vercel Fluid Compute
 *     reuses instances so warm containers serve repeat requests from
 *     memory.
 *  4. On any failure (missing env, Polar error, code not found) we respond
 *     with `{ ok: false }` so the bar falls back to the static cap value
 *     without surfacing an error to the visitor.
 *
 * Required env (server-only):
 *   POLAR_ACCESS_TOKEN   Organization access token from Polar dashboard
 *                        → Settings → Developers
 *
 * The discount code itself + max are imported from the shared
 * `lib/polar` module so the client and server agree on the cap.
 */

import {
  LIFETIME_DISCOUNT_CODE,
  LIFETIME_DISCOUNT_MAX_REDEMPTIONS,
} from '../src/lib/polar'

const CACHE_TTL_MS = 5 * 60 * 1000
const POLAR_TIMEOUT_MS = 4_000
const POLAR_API_BASE = 'https://api.polar.sh/v1'

type AvailabilityOk = {
  ok: true
  used: number
  max: number
  /** Convenience: `max - used`, clamped at 0. Saves the client the math. */
  remaining: number
  source: 'polar'
}

type AvailabilityFallback = {
  ok: false
  /** Always populated so the client can still anchor the visual on `max`. */
  max: number
  reason: 'no-token' | 'polar-error' | 'not-found' | 'timeout'
}

type Availability = AvailabilityOk | AvailabilityFallback

let cache: { at: number; payload: Availability } | null = null

function json(payload: Availability, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      // Short browser cache; Vercel + in-process cache do the heavy lifting.
      'cache-control': 'public, max-age=60, s-maxage=300',
      ...headers,
    },
  })
}

async function fetchAvailability(): Promise<Availability> {
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) {
    return { ok: false, max: LIFETIME_DISCOUNT_MAX_REDEMPTIONS, reason: 'no-token' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), POLAR_TIMEOUT_MS)

  try {
    // Polar's list endpoint supports a `query` filter that matches the
    // discount code. We then pick the exact case-insensitive match in
    // case multiple codes contain ZENMODE as a substring.
    const url = new URL(`${POLAR_API_BASE}/discounts`)
    url.searchParams.set('query', LIFETIME_DISCOUNT_CODE)
    url.searchParams.set('limit', '20')

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!r.ok) {
      return { ok: false, max: LIFETIME_DISCOUNT_MAX_REDEMPTIONS, reason: 'polar-error' }
    }

    const body = (await r.json()) as { items?: Array<Record<string, unknown>> }
    const items = Array.isArray(body.items) ? body.items : []
    const match = items.find(
      (d) => typeof d.code === 'string' && d.code.toUpperCase() === LIFETIME_DISCOUNT_CODE,
    )

    if (!match) {
      return { ok: false, max: LIFETIME_DISCOUNT_MAX_REDEMPTIONS, reason: 'not-found' }
    }

    const used = typeof match.redemptions_count === 'number' ? match.redemptions_count : 0
    const max =
      typeof match.max_redemptions === 'number'
        ? match.max_redemptions
        : LIFETIME_DISCOUNT_MAX_REDEMPTIONS

    return {
      ok: true,
      used,
      max,
      remaining: Math.max(0, max - used),
      source: 'polar',
    }
  } catch (err) {
    const reason =
      (err as { name?: string })?.name === 'AbortError' ? 'timeout' : 'polar-error'
    return { ok: false, max: LIFETIME_DISCOUNT_MAX_REDEMPTIONS, reason }
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return json(cache.payload, 200, { 'x-discount-cache': 'hit' })
  }

  const payload = await fetchAvailability()

  if (payload.ok) {
    cache = { at: now, payload }
    return json(payload, 200, { 'x-discount-cache': 'miss' })
  }

  // Failed lookups are not cached so the next request gets another shot.
  return json(payload, 200, {
    'x-discount-cache': 'bypass',
    'cache-control': 'private, max-age=60',
  })
}
