/**
 * GET /api/discount-availability — returns how many configured discount
 * redemptions remain on the Lifetime product, used by the homepage's
 * limited-redeem bar.
 *
 * Flow
 * ----
 *  1. Polar list-discounts endpoint is queried for the configured code.
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
 *   POLAR_ACCESS_TOKEN_NEW                 New organization access token
 *   POLAR_DISCOUNT_CODE_NEW                New discount code
 *   POLAR_DISCOUNT_MAX_REDEMPTIONS_NEW     Static fallback cap
 * Names without `_NEW` remain the legacy fallback.
 *
 * Note: the discount code + max-redemptions cap are duplicated here
 * instead of imported from `src/lib/polar`. Vercel's serverless
 * bundler does NOT reliably traverse `../src/*` imports out of the
 * `api/` directory under this project's TanStack Start + Vite build
 * (prod fails with `ERR_MODULE_NOT_FOUND: '/var/task/src/lib/polar'`).
 * These helpers are cheap to duplicate; if they drift, search for
 * `resolveDiscountConfig` and `resolveDiscountId`.
 */

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

type DiscountConfig = {
  token: string | undefined
  code: string
  fallbackMaximum: number
}

/** Keep token, code, and fallback cap in one Polar organization. */
function resolveDiscountConfig(): DiscountConfig {
  const newToken = envValue('POLAR_ACCESS_TOKEN_NEW')
  const useNewOrganization = Boolean(newToken)
  const token = newToken ?? envValue('POLAR_ACCESS_TOKEN')
  const code = useNewOrganization
    ? envValue('POLAR_DISCOUNT_CODE_NEW')
      ?? envValue('POLAR_DISCOUNT_CODE')
      ?? 'ZENMODE'
    : envValue('POLAR_DISCOUNT_CODE') ?? 'ZENMODE'
  const configuredMaximum = Number(
    useNewOrganization
      ? envValue('POLAR_DISCOUNT_MAX_REDEMPTIONS_NEW')
        ?? envValue('POLAR_DISCOUNT_MAX_REDEMPTIONS')
        ?? '500'
      : envValue('POLAR_DISCOUNT_MAX_REDEMPTIONS') ?? '500',
  )
  const fallbackMaximum =
    Number.isSafeInteger(configuredMaximum) && configuredMaximum > 0
      ? configuredMaximum
      : 500

  return { token, code, fallbackMaximum }
}

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
  const { token, code, fallbackMaximum } = resolveDiscountConfig()
  if (!token) {
    return { ok: false, max: fallbackMaximum, reason: 'no-token' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), POLAR_TIMEOUT_MS)

  try {
    // Polar's list endpoint supports a `query` filter that matches the
    // discount code. We then pick the exact case-insensitive match in
    // case multiple codes contain ZENMODE as a substring.
    const url = new URL(`${POLAR_API_BASE}/discounts`)
    url.searchParams.set('query', code)
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
      return { ok: false, max: fallbackMaximum, reason: 'polar-error' }
    }

    const body = (await r.json()) as { items?: Array<Record<string, unknown>> }
    const items = Array.isArray(body.items) ? body.items : []
    const match = items.find(
      (d) => typeof d.code === 'string' && d.code.toUpperCase() === code.toUpperCase(),
    )

    if (!match) {
      return { ok: false, max: fallbackMaximum, reason: 'not-found' }
    }

    const used = typeof match.redemptions_count === 'number' ? match.redemptions_count : 0
    const max =
      typeof match.max_redemptions === 'number'
        ? match.max_redemptions
        : fallbackMaximum

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
    return { ok: false, max: fallbackMaximum, reason }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Vercel routes Web Request/Response (`request: Request`) to handlers
 * exported as named HTTP methods. `export default function handler`
 * gets the Node IncomingMessage instead, which is why prod was failing
 * with "request.headers.get is not a function" on every API route.
 *
 * Reference: https://vercel.com/docs/functions/runtimes/node-js#web-standard-api
 */
export async function GET(_request: Request): Promise<Response> {
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

// HEAD is a freebie — same headers as GET but no body. Browsers send
// it occasionally for link previews; cleaner to answer than to 405.
export const HEAD = GET
