/**
 * GET /api/price — returns the live Polar.sh checkout preview for the
 * visitor's country (currency + tax, exactly as Polar will charge at
 * checkout).
 *
 * Flow
 * ----
 *  1. Country is read from `x-vercel-ip-country` (Vercel injects this header
 *     based on the requesting IP). `?country=XX` overrides for testing/dev.
 *  2. The server POSTs to Polar's checkouts endpoint with the yearly
 *     product id AND (when configured) the lifetime product id in parallel.
 *     Polar returns checkout objects with `total_amount`, `subtotal_amount`,
 *     `tax_amount`, and `currency` — those are the values the buyer will see.
 *     For the lifetime product we additionally resolve `ZENMODE` → discount
 *     UUID and pass `discount_id` so the returned total reflects the actual
 *     post-discount price (e.g. 56 CZK vs the 165 CZK subtotal).
 *  3. Result is cached per-country in-process for 24h. Vercel Fluid Compute
 *     reuses instances, so a warm container serves repeat countries from
 *     memory; cold starts re-fetch on first miss.
 *  4. On any failure (missing env, Polar error, bad payload) we respond
 *     with `{ ok: false, country }` so the client falls back to its locale
 *     table without surfacing an error to the user.
 *
 * Required env (server-only, never exposed to the bundle):
 *   POLAR_ACCESS_TOKEN          Organization access token from Polar
 *                               dashboard → Settings → Developers
 *   POLAR_PRODUCT_ID            UUID of the yearly support product
 *                               (fallback: POLAR_PRODUCT_ID_SUPPORT)
 *   POLAR_PRODUCT_ID_LIFETIME   UUID of the Lifetime one-time product.
 *                               When set, payload includes a `lifetime`
 *                               block with the live post-ZENMODE total.
 *
 * The Checkout Link URL used by the client buy button stays in
 * VITE_POLAR_CHECKOUT_URL; the API token + product id are server-only.
 */

// ────────────────────────────────────────────────────────────────────
//  Inlined Polar helpers — duplicated, NOT imported
// ────────────────────────────────────────────────────────────────────
//
// Vercel's serverless bundler does NOT reliably traverse imports out
// of `api/` into sibling directories (`/lib`, `/src/lib`) under this
// project's TanStack Start + Vite build. Prod fails with
// `ERR_MODULE_NOT_FOUND` even when the file is committed and the
// import path resolves locally. `api/discount-availability.ts` and
// `api/checkout-session.ts` document the same limitation.
//
// Search the codebase for `ZENMODE` / `resolveDiscountId` to find all
// copies that need to stay in lockstep.

const POLAR_API_BASE = 'https://api.polar.sh/v1'
/** Launch discount auto-applied to every Lifetime preview. */
const LIFETIME_DISCOUNT_CODE = 'ZENMODE'
const POLAR_TIMEOUT_MS = 4_000

type DiscountIdEntry = { id: string | null; expiresAt: number }
const DISCOUNT_ID_TTL_MS = 10 * 60 * 1000
const globalForDiscountCache = globalThis as unknown as {
  __polarDiscountIdCache?: Map<string, DiscountIdEntry>
}
const discountIdCache: Map<string, DiscountIdEntry> =
  globalForDiscountCache.__polarDiscountIdCache ??
  (globalForDiscountCache.__polarDiscountIdCache = new Map())

async function resolveDiscountId(code: string, token: string): Promise<string | null> {
  const key = code.toUpperCase()
  const now = Date.now()
  const cached = discountIdCache.get(key)
  if (cached && cached.expiresAt > now) return cached.id

  const url = new URL(`${POLAR_API_BASE}/discounts`)
  url.searchParams.set('query', code)
  url.searchParams.set('limit', '20')

  let id: string | null = null
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(POLAR_TIMEOUT_MS),
    })
    if (r.ok) {
      const body = (await r.json()) as { items?: Array<{ id?: string; code?: string }> }
      const items = Array.isArray(body.items) ? body.items : []
      const match = items.find(
        (d) => typeof d.code === 'string' && d.code.toUpperCase() === key,
      )
      id = typeof match?.id === 'string' ? match.id : null
    } else {
      console.warn('[price] discount list non-2xx', { status: r.status })
    }
  } catch (err) {
    console.warn('[price] discount list threw', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  discountIdCache.set(key, { id, expiresAt: now + DISCOUNT_ID_TTL_MS })
  return id
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type LifetimeBlock = {
  /** Post-discount total in minor units (e.g. 5600 = 56.00 CZK). */
  discounted_amount: number
  discounted_formatted: string
  /** Pre-discount subtotal in minor units (e.g. 16500 = 165.00 CZK). */
  original_amount: number
  original_formatted: string
  /** True when Polar accepted the ZENMODE discount on this preview. */
  has_discount: boolean
  /** VAT portion of the discounted total, formatted. Empty when zero. */
  tax_formatted: string
}

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
  /** Lifetime live pricing when POLAR_PRODUCT_ID_LIFETIME is set and the
   *  preview call succeeded. Absent otherwise — client falls back to the
   *  derived `yearly + 1` / `yearly × 3` constants. */
  lifetime?: LifetimeBlock
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

async function fetchCheckoutPreview(
  productId: string,
  country: string,
  token: string,
  discountId?: string | null,
): Promise<PolarCheckout | null> {
  const body: Record<string, unknown> = {
    product_id: productId,
    customer_billing_address: { country },
  }
  if (discountId) body.discount_id = discountId

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), POLAR_TIMEOUT_MS)
  try {
    const response = await fetch(`${POLAR_API_BASE}/checkouts/`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      // 422 on the discounted lifetime preview means Polar rejected the
      // discount (cap exhausted, expired, etc.) — caller retries without
      // it to still get the subtotal.
      console.warn('[price] polar non-2xx', {
        status: response.status,
        productId,
        hasDiscount: Boolean(discountId),
      })
      return null
    }

    return (await response.json()) as PolarCheckout
  } catch (err) {
    console.warn('[price] polar fetch threw', {
      err: err instanceof Error ? err.message : String(err),
      productId,
    })
    return null
  } finally {
    clearTimeout(timer)
  }
}

function isValidCheckout(c: PolarCheckout | null): c is PolarCheckout & {
  total_amount: number
  subtotal_amount: number
  currency: string
} {
  return (
    !!c &&
    typeof c.total_amount === 'number' &&
    typeof c.subtotal_amount === 'number' &&
    typeof c.currency === 'string'
  )
}

async function fetchPolarPreview(country: string): Promise<PricePayload | PriceFallback> {
  const token = process.env.POLAR_ACCESS_TOKEN
  // Accept both `POLAR_PRODUCT_ID` (legacy) and `POLAR_PRODUCT_ID_SUPPORT`
  // (newer convention used by checkout-session.ts). Whichever is set wins.
  const yearlyProductId =
    process.env.POLAR_PRODUCT_ID ?? process.env.POLAR_PRODUCT_ID_SUPPORT
  const lifetimeProductId = process.env.POLAR_PRODUCT_ID_LIFETIME

  if (!token || !yearlyProductId) {
    return { ok: false, country, reason: 'unconfigured', source: 'fallback' }
  }

  // Resolve ZENMODE → UUID once up front so the lifetime preview can
  // attach `discount_id` (the only field Polar honours; see lib/polar-server.ts).
  // Cached module-scope so repeat country lookups skip this round-trip.
  const discountId = lifetimeProductId
    ? await resolveDiscountId(LIFETIME_DISCOUNT_CODE, token)
    : null

  // Fire yearly + lifetime previews in parallel. Lifetime is optional —
  // if its env var isn't set, we skip the second call and the payload
  // simply lacks a `lifetime` block (client derives like before).
  const [yearlyCheckout, lifetimeCheckoutWithDiscount] = await Promise.all([
    fetchCheckoutPreview(yearlyProductId, country, token),
    lifetimeProductId
      ? fetchCheckoutPreview(lifetimeProductId, country, token, discountId)
      : Promise.resolve(null),
  ])

  if (!isValidCheckout(yearlyCheckout)) {
    return { ok: false, country, reason: 'no_totals', source: 'fallback' }
  }

  const currency = yearlyCheckout.currency.toUpperCase()
  const tax = typeof yearlyCheckout.tax_amount === 'number' ? yearlyCheckout.tax_amount : 0

  const payload: PricePayload = {
    ok: true,
    country,
    currency,
    amount: yearlyCheckout.total_amount / 100,
    formatted: formatAmount(yearlyCheckout.total_amount, currency),
    subtotal_formatted: formatAmount(yearlyCheckout.subtotal_amount, currency),
    tax_formatted: tax > 0 ? formatAmount(tax, currency) : '',
    tax_cents: tax,
    has_tax: tax > 0,
    source: 'polar',
  }

  // Attach the live lifetime block when we got a valid preview back.
  // `has_discount` reflects whether Polar's response shows the discount
  // landed (total < subtotal) — once Polar caps ZENMODE the discounted
  // preview comes back at full price and we flip the flag so the client
  // knows to hide the strikethrough.
  if (isValidCheckout(lifetimeCheckoutWithDiscount)) {
    const lifeTotal = lifetimeCheckoutWithDiscount.total_amount
    const lifeSubtotal = lifetimeCheckoutWithDiscount.subtotal_amount
    const lifeTax =
      typeof lifetimeCheckoutWithDiscount.tax_amount === 'number'
        ? lifetimeCheckoutWithDiscount.tax_amount
        : 0
    const hasDiscount = lifeTotal < lifeSubtotal

    payload.lifetime = {
      discounted_amount: lifeTotal,
      discounted_formatted: formatAmount(lifeTotal, currency),
      original_amount: lifeSubtotal,
      original_formatted: formatAmount(lifeSubtotal, currency),
      has_discount: hasDiscount,
      tax_formatted: lifeTax > 0 ? formatAmount(lifeTax, currency) : '',
    }
  }

  return payload
}

/**
 * Vercel routes Web Request/Response (`request: Request`) to handlers
 * exported as named HTTP methods (GET/POST/...). `export default
 * function handler` gets a Node IncomingMessage instead, which crashes
 * on `request.headers.get` and `new URL(request.url)`. Keep this as
 * `export async function GET`.
 *
 * Reference: https://vercel.com/docs/functions/runtimes/node-js#web-standard-api
 */
export async function GET(request: Request): Promise<Response> {
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

// HEAD is a freebie — alias of GET. Some link-preview crawlers
// (Slack, Discord, etc.) probe with HEAD; better to answer than 405.
export const HEAD = GET
