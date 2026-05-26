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
 *     respond `{ok: false, reason}`. The client shows an inline error
 *     overlay — we deliberately do NOT fall back to a full-page redirect
 *     to buy.polar.sh, because the brand promise is "checkout stays on
 *     battery-sensei.app".
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

import { z } from 'zod'

type Tier = 'lifetime' | 'support'

/**
 * Code we silently auto-apply to every Lifetime session when the
 * visitor didn't type one themselves. Mirrors `LIFETIME_DISCOUNT_CODE`
 * in `src/lib/polar.ts` (deliberately duplicated — Vercel's serverless
 * bundler can't follow cross-package imports from `api/` into `src/`
 * reliably under Vite-built deployments, see the discount-availability
 * regression we hit earlier).
 *
 * Polar caps redemptions at 500 server-side and 422s once exhausted;
 * the handler below catches that and retries without the code so the
 * session still creates.
 */
const AUTO_DISCOUNT_CODE = 'ZENMODE'

/**
 * Request body validator. Caller only needs `tier`; `discountCode` is
 * optional and capped at 64 chars to keep a malformed promo field from
 * being smuggled into Polar's API. `.catch` collapses any invalid input
 * to undefined so a bad client payload never crashes the handler.
 */
const RequestSchema = z.object({
  tier: z.enum(['lifetime', 'support']),
  discountCode: z.string().trim().max(64).optional(),
})
type RequestBody = z.infer<typeof RequestSchema>

type OkResponse = {
  ok: true
  /** Polar-hosted session URL the iframe mounts. Carries the
   *  `embed_origin` configured at create time so Polar serves it with
   *  the correct `frame-ancestors` header. */
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
    | 'forbidden'
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

/**
 * Allowlist of public origins this endpoint accepts AND that we'll
 * forward to Polar as `embed_origin`. Most sites have both a www and
 * an apex hostname; rather than force the operator to pick one, we
 * accept any value matching the comma-separated `POLAR_EMBED_ORIGINS`
 * env (or the legacy single-value `POLAR_EMBED_ORIGIN`). When neither
 * is set we ship a sensible default covering both common variants of
 * the brand domain so the prod URL works out of the box.
 *
 * Trailing slashes are stripped so `https://x.com/` and `https://x.com`
 * compare equal.
 */
function allowedOrigins(): string[] {
  const raw =
    process.env.POLAR_EMBED_ORIGINS ??
    process.env.POLAR_EMBED_ORIGIN ??
    'https://battery-sensei.app,https://www.battery-sensei.app'
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

/**
 * Pick the embed_origin to forward to Polar. We use the request's own
 * Origin header when it's in the allowlist — that way Polar's
 * `frame-ancestors` header matches the EXACT page hosting the iframe,
 * which is what stops the "polar.sh will not allow this page to be
 * displayed" error from coming back when visitors land on the www
 * variant of the domain. Falls back to the first allowlisted origin
 * for non-browser callers (curl, health checks).
 */
function pickEmbedOrigin(
  requestOrigin: string | null,
  allowed: string[],
): string {
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin
  return allowed[0] ?? 'https://battery-sensei.app'
}

/**
 * Vercel routes Web Request/Response (`request: Request`) to handlers
 * exported as named HTTP methods (POST/GET/...). A `export default
 * function handler(request)` gets the Node `IncomingMessage` instead,
 * which is why prod was crashing with "request.headers.get is not a
 * function". Keep this as a named POST export; do NOT switch back to
 * `export default`.
 *
 * Reference: https://vercel.com/docs/functions/runtimes/node-js#web-standard-api
 */
export async function POST(request: Request): Promise<Response> {
  // Cheap CSRF defense: only accept requests whose Origin is in our
  // allowlist. Both www and apex variants of the brand domain are
  // allowed by default — operators with a custom domain set
  // `POLAR_EMBED_ORIGINS` (comma-separated) to override. Missing Origin
  // headers (curl, server-to-server) are allowed through; same-origin
  // browser POSTs always carry an Origin so this can't be spoofed away.
  const requestOrigin = request.headers.get('origin')
  const allowed = allowedOrigins()
  if (requestOrigin && !allowed.includes(requestOrigin)) {
    console.warn('[checkout-session] cross-origin rejected', {
      origin: requestOrigin,
      allowed,
    })
    return json({ ok: false, reason: 'forbidden' }, 403)
  }

  let body: RequestBody
  try {
    const raw = (await request.json()) as unknown
    body = RequestSchema.parse(raw)
  } catch (err) {
    console.warn('[checkout-session] invalid body', {
      err: err instanceof Error ? err.message : String(err),
    })
    return json({ ok: false, reason: 'invalid-tier' }, 400)
  }
  const tier = body.tier

  const token = process.env.POLAR_ACCESS_TOKEN
  const productId =
    tier === 'lifetime'
      ? process.env.POLAR_PRODUCT_ID_LIFETIME
      : process.env.POLAR_PRODUCT_ID_SUPPORT

  if (!token || !productId) {
    // Log WHICH env var is missing so the Vercel function logs make
    // the misconfiguration obvious without leaking values. Most common
    // prod gotcha: token was set in "Preview" env but not "Production",
    // or the product id env name was misspelled.
    console.error('[checkout-session] missing config', {
      tier,
      hasToken: Boolean(token),
      hasProductId: Boolean(productId),
      envVarName:
        tier === 'lifetime' ? 'POLAR_PRODUCT_ID_LIFETIME' : 'POLAR_PRODUCT_ID_SUPPORT',
    })
    return json({ ok: false, reason: 'missing-config' }, 503)
  }

  // Use the visitor's actual Origin (within the allowlist) as
  // embed_origin so Polar serves `frame-ancestors: <that-origin>` and
  // the iframe loads cleanly whether the visitor came in via www or
  // apex. Non-browser callers without an Origin land on the first
  // allowlisted origin.
  const embedOrigin = pickEmbedOrigin(requestOrigin, allowed)
  // Build success URL using the same origin so the redirect stays
  // first-party. `{CHECKOUT_ID}` is a Polar placeholder that gets
  // substituted server-side at redirect time.
  const successUrl = `${embedOrigin}/thanks/${tier}?checkout_id={CHECKOUT_ID}`

  // Resolve the discount code to attach (if any):
  //   - Caller-typed code wins (visitor's promo input on /checkout)
  //   - Otherwise Lifetime gets ZENMODE auto-applied. Polar caps it at
  //     500 redemptions and 422s once exhausted; we catch that below
  //     and retry without the code so the session still creates. The
  //     /checkout UI hides every "launch discount" surface once the
  //     cap is reached, so the visitor sees the plain full price.
  //   - Support tier never gets an auto-apply.
  const autoDiscount =
    body.discountCode ?? (tier === 'lifetime' ? AUTO_DISCOUNT_CODE : undefined)

  const basePayload: Record<string, unknown> = {
    products: [productId],
    embed_origin: embedOrigin,
    success_url: successUrl,
  }

  // Wrapped so we can fire the request twice (once with the discount,
  // once without on 422) without duplicating the fetch boilerplate.
  async function createSession(extra: Record<string, unknown> = {}) {
    return fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...basePayload, ...extra }),
      // Polar typically responds in <500ms; if it stalls we'd rather
      // surface an inline error than keep the visitor staring at a
      // spinner.
      signal: AbortSignal.timeout(6000),
    })
  }

  try {
    let res = await createSession(
      autoDiscount ? { discount_code: autoDiscount } : {},
    )

    // 422 with a discount usually means Polar rejected the code (cap
    // exhausted, expired, wrong product). Retry once without it so the
    // visitor still gets a session at the regular price — the UI on
    // /checkout will already be showing the full price by then since
    // the discount-availability hook reports `remaining === 0`.
    if (!res.ok && res.status === 422 && autoDiscount) {
      console.warn('[checkout-session] discount rejected — retrying without', {
        tier,
        code: autoDiscount,
      })
      res = await createSession()
    }

    if (!res.ok) {
      // Read Polar's error body so the function log explains *why*
      // the call was rejected (invalid product id, wrong token scope,
      // embed_origin not allowlisted, etc.).
      const bodyText = await res.text().catch(() => '')
      console.warn('[checkout-session] polar non-2xx', {
        status: res.status,
        tier,
        embedOrigin,
        body: bodyText.slice(0, 500),
      })
      return json({ ok: false, reason: 'polar-error' }, 502)
    }
    const data = (await res.json()) as { url?: string }
    if (!data?.url) {
      console.warn('[checkout-session] polar response missing url', { tier })
      return json({ ok: false, reason: 'polar-error' }, 502)
    }
    return json({ ok: true, url: data.url, tier })
  } catch (err) {
    // Branch on AbortError so ops can distinguish a slow-Polar timeout
    // from genuine network / parse failures. Both surface as a generic
    // overlay client-side; only the server log differs.
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    console.warn(isTimeout ? '[checkout-session] polar timeout' : '[checkout-session] polar error', {
      err: err instanceof Error ? err.message : String(err),
      tier,
    })
    return json({ ok: false, reason: 'polar-error' }, 502)
  }
}
