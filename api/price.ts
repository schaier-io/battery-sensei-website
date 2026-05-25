/**
 * GET /api/price — returns the live Polar.sh checkout preview for the
 * visitor's country (currency + tax, exactly as Polar will charge at
 * checkout).
 *
 * Flow
 * ----
 *  1. Country is read from `x-vercel-ip-country` (Vercel injects this header
 *     based on the requesting IP). `?country=XX` overrides for testing/dev.
 *  2. The server POSTs to Polar's checkouts endpoint with the product id
 *     and a `customer_billing_address.country`. Polar returns a checkout
 *     object with `total_amount`, `subtotal_amount`, `tax_amount`, and
 *     `currency` — those are the values the buyer will see.
 *  3. Result is cached per-country in-process for 24h. Vercel Fluid Compute
 *     reuses instances, so a warm container serves repeat countries from
 *     memory; cold starts re-fetch on first miss.
 *  4. On any failure (missing env, Polar error, bad payload) we respond
 *     with `{ ok: false, country }` so the client falls back to its locale
 *     table without surfacing an error to the user.
 *
 * Required env (server-only, never exposed to the bundle):
 *   POLAR_ACCESS_TOKEN   Organization access token from Polar dashboard
 *                        → Settings → Developers
 *   POLAR_PRODUCT_ID     UUID of the $3.99 Premium product
 *
 * The Checkout Link URL used by the client buy button stays in
 * VITE_POLAR_CHECKOUT_URL; the API token + product id are server-only.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const POLAR_TIMEOUT_MS = 4_000
const POLAR_API_BASE = 'https://api.polar.sh/v1'

type PricePayload = {
  ok: true
  country: string
  currency: string
  amount: number
  formatted: string
  subtotal_formatted: string
  tax_formatted: string
  tax_cents: number
  has_tax: boolean
  source: 'polar'
}

type PriceFallback = {
  ok: false
  country: string
  reason: string
  source: 'fallback'
}

type CacheEntry = {
  expiresAt: number
  payload: PricePayload
}

const globalForCache = globalThis as unknown as {
  __polarPriceCache?: Map<string, CacheEntry>
}
const cache: Map<string, CacheEntry> =
  globalForCache.__polarPriceCache ?? (globalForCache.__polarPriceCache = new Map())

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Browser-only cache. Different users in different countries should get
      // their own fresh fetches; no shared CDN cache to leak one visitor's
      // country to the next.
      'cache-control': 'private, max-age=3600',
      ...headers,
    },
  })
}

function normaliseCountry(raw: string | null | undefined): string {
  if (!raw) return 'US'
  const trimmed = raw.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(trimmed)) return 'US'
  return trimmed
}

function pickCountry(request: Request): string {
  const url = new URL(request.url)
  const override = url.searchParams.get('country')
  if (override) return normaliseCountry(override)
  return normaliseCountry(request.headers.get('x-vercel-ip-country'))
}

function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

type PolarCheckout = {
  currency?: string
  subtotal_amount?: number
  tax_amount?: number
  total_amount?: number
}

async function fetchPolarPreview(country: string): Promise<PricePayload | PriceFallback> {
  const token = process.env.POLAR_ACCESS_TOKEN
  const productId = process.env.POLAR_PRODUCT_ID

  if (!token || !productId) {
    return { ok: false, country, reason: 'unconfigured', source: 'fallback' }
  }

  const body = {
    product_id: productId,
    customer_billing_address: { country },
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), POLAR_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${POLAR_API_BASE}/checkouts/`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    return {
      ok: false,
      country,
      reason: err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network',
      source: 'fallback',
    }
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    return { ok: false, country, reason: `polar_${response.status}`, source: 'fallback' }
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    return { ok: false, country, reason: 'bad_json', source: 'fallback' }
  }

  const checkout = parsed as PolarCheckout
  if (
    typeof checkout.total_amount !== 'number' ||
    typeof checkout.subtotal_amount !== 'number' ||
    typeof checkout.currency !== 'string'
  ) {
    return { ok: false, country, reason: 'no_totals', source: 'fallback' }
  }

  const currency = checkout.currency.toUpperCase()
  const tax = typeof checkout.tax_amount === 'number' ? checkout.tax_amount : 0

  return {
    ok: true,
    country,
    currency,
    amount: checkout.total_amount / 100,
    formatted: formatAmount(checkout.total_amount, currency),
    subtotal_formatted: formatAmount(checkout.subtotal_amount, currency),
    tax_formatted: tax > 0 ? formatAmount(tax, currency) : '',
    tax_cents: tax,
    has_tax: tax > 0,
    source: 'polar',
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const country = pickCountry(request)

  const now = Date.now()
  const cached = cache.get(country)
  if (cached && cached.expiresAt > now) {
    return json(cached.payload, 200, { 'x-price-cache': 'hit' })
  }

  const result = await fetchPolarPreview(country)

  if (result.ok) {
    cache.set(country, { expiresAt: now + CACHE_TTL_MS, payload: result })
    return json(result, 200, { 'x-price-cache': 'miss' })
  }

  // Fallbacks are not cached — the next request gets another chance to
  // reach Polar. Browser cache header is short for the same reason.
  return json(result, 200, {
    'x-price-cache': 'bypass',
    'cache-control': 'private, max-age=60',
  })
}
