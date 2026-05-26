/**
 * POST /api/checkout-session — create a one-shot Polar Checkout Session
 * configured for **iframe embedding** on our domain.
 *
 * Why this exists
 * ---------------
 * Polar's pre-created Checkout LINKS (`https://buy.polar.sh/polar_cl_xxx`)
 * are designed for full-page redirects; the response they serve has
 * `Content-Security-Policy: frame-ancestors 'none'`, so dropping one of
 * those URLs into the `@polar-sh/checkout/embed` iframe makes the browser
 * refuse to render the page ("polar.sh will not allow this page to be
 * displayed because another site has embedded it").
 *
 * The fix is to create a Checkout **SESSION** via the Polar API and pass
 * `embed_origin` set to our public origin. Polar then serves the session
 * page with `frame-ancestors: <embed_origin>` so the embed loads cleanly.
 *
 * Flow
 * ----
 *  1. Client clicks Buy → POSTs `{tier, discountCode?}` to this endpoint.
 *  2. We resolve the product id from env (`POLAR_PRODUCT_ID_LIFETIME` /
 *     `POLAR_PRODUCT_ID_SUPPORT`), then POST to `https://api.polar.sh/v1/
 *     checkouts/` with `embed_origin`, `success_url`, and (optionally)
 *     a `discount_code` for the Lifetime ZENMODE first-500 deal.
 *  3. Polar returns the session URL, which we hand back to the client to
 *     pass into `PolarEmbedCheckout.create(url, {theme})`.
 *  4. On any failure (token missing, network blip, Polar 4xx/5xx) we
 *     respond `{ok: false, fallbackUrl}` so the client can degrade to a
 *     full-page redirect against the pre-created Checkout Link — the
 *     visitor still completes the purchase, just outside an iframe.
 *
 * The endpoint is intentionally stateless: every click creates a new
 * session. Polar sessions expire after ~24h, but we don't reuse them
 * across sessions anyway, so expiry never bites here.
 *
 * Env (server-only)
 * -----------------
 *   POLAR_ACCESS_TOKEN        Organization Access Token
 *   POLAR_PRODUCT_ID_LIFETIME UUID of the Lifetime one-time product
 *   POLAR_PRODUCT_ID_SUPPORT  UUID of the yearly support product
 *   POLAR_EMBED_ORIGIN        Public origin allowed to iframe the page
 *                             (defaults to https://battery-sensei.app)
 */

type Tier = 'lifetime' | 'support'

type RequestBody = {
  tier?: Tier
  /** Optional promo code to pre-apply (Lifetime's ZENMODE, mostly). */
  discountCode?: string
}

type OkResponse = {
  ok: true
  /** Polar-hosted URL to load into the embed iframe. */
  url: string
  /** Echoed so client analytics / dedupe can correlate. */
  tier: Tier
}

type ErrResponse = {
  ok: false
  reason:
    | 'method'
    | 'parse'
    | 'invalid-tier'
    | 'missing-config'
    | 'polar-error'
  /** Best-effort fallback (the pre-created Checkout Link). Client should
   *  open this in a new tab / full-page redirect when present. */
  fallbackUrl?: string
}

function json(payload: OkResponse | ErrResponse, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

function defaultEmbedOrigin(): string {
  // SITE_URL is the canonical brand origin; fall back to it when the
  // explicit env var is unset so the endpoint still works on a fresh
  // deploy without manual config.
  return (process.env.POLAR_EMBED_ORIGIN ?? 'https://battery-sensei.app').replace(/\/+$/, '')
}

function isTier(value: unknown): value is Tier {
  return value === 'lifetime' || value === 'support'
}

function fallbackLinkFor(tier: Tier): string | undefined {
  // Read the same VITE_-prefixed env the client bundle uses for the
  // pre-created Checkout Links. On Vercel, server functions can see
  // every env var (the VITE_ prefix only gates *client* exposure), so
  // these resolve fine here.
  if (tier === 'lifetime') return process.env.VITE_POLAR_CHECKOUT_URL_LIFETIME
  return process.env.VITE_POLAR_CHECKOUT_URL_SUPPORT
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, reason: 'method' }, 405)
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return json({ ok: false, reason: 'parse' }, 400)
  }

  if (!isTier(body.tier)) {
    return json({ ok: false, reason: 'invalid-tier' }, 400)
  }
  const tier = body.tier

  const token = process.env.POLAR_ACCESS_TOKEN
  const productId =
    tier === 'lifetime'
      ? process.env.POLAR_PRODUCT_ID_LIFETIME
      : process.env.POLAR_PRODUCT_ID_SUPPORT

  if (!token || !productId) {
    // Hard fall-through: redirect to the pre-created Checkout Link if
    // present, otherwise tell the client we have nothing to offer.
    return json({
      ok: false,
      reason: 'missing-config',
      fallbackUrl: fallbackLinkFor(tier),
    }, 503)
  }

  const embedOrigin = defaultEmbedOrigin()
  // Build success URL using the same origin so the redirect stays
  // first-party. `{CHECKOUT_ID}` is a Polar placeholder that gets
  // substituted server-side at redirect time.
  const successUrl = `${embedOrigin}/thanks/${tier}?checkout_id={CHECKOUT_ID}`

  const payload: Record<string, unknown> = {
    products: [productId],
    embed_origin: embedOrigin,
    success_url: successUrl,
    // Lifetime ZENMODE is auto-applied client-side via `polar.ts`; the
    // discountCode here is only set when the visitor typed something
    // different into the checkout-page promo field.
    ...(body.discountCode?.trim()
      ? { discount_code: body.discountCode.trim() }
      : {}),
  }

  try {
    const res = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      // Polar typically responds in <500ms; if it stalls we'd rather
      // hand back the fallback Link than keep the visitor staring at a
      // spinner.
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      console.warn('[checkout-session] polar non-2xx', {
        status: res.status,
        tier,
      })
      return json({
        ok: false,
        reason: 'polar-error',
        fallbackUrl: fallbackLinkFor(tier),
      }, 502)
    }
    const data = (await res.json()) as { url?: string }
    if (!data?.url) {
      return json({
        ok: false,
        reason: 'polar-error',
        fallbackUrl: fallbackLinkFor(tier),
      }, 502)
    }
    return json({ ok: true, url: data.url, tier })
  } catch (err) {
    console.warn('[checkout-session] polar error', {
      err: err instanceof Error ? err.message : String(err),
      tier,
    })
    return json({
      ok: false,
      reason: 'polar-error',
      fallbackUrl: fallbackLinkFor(tier),
    }, 502)
  }
}
