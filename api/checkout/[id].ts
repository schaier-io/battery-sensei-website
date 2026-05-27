/**
 * GET /api/checkout/[id] — license-key delivery for the /thanks pages.
 *
 * Lives at the repo root under `/api/` (Vercel native function) rather
 * than inside `src/routes/api/` (TanStack Start file route). The
 * TanStack Start build emits to `dist/client` + `dist/server`, and our
 * `vercel.json` deploys ONLY `dist/client`, so any TanStack Start
 * server handler 404s in prod. Native Vercel functions under `/api/`
 * are picked up by the platform regardless of `outputDirectory`, so
 * this file is the source of truth in production.
 *
 * Note: `src/routes/api/checkout.$id.ts` is kept around so the route
 * resolves under `vite dev` for local UI testing. It MUST stay in sync
 * with this file (response contract, headers). If they ever drift,
 * fix this file — it's the one that actually runs in prod.
 *
 * Response contract (consumed by src/components/LicenseRevealCard.tsx)
 * ------------------------------------------------------------------
 *   200 ready        — { licenseKey, checkoutId, orderId, customerEmail,
 *                        productName, customerPortalUrl }
 *   200 provisioning — { provisioning: true, checkoutId, orderId,
 *                        customerEmail, customerPortalUrl }
 *   410 expired      — { expired: true, reason, checkoutId, orderId,
 *                        customerPortalUrl }
 *
 * Polar API layout has shifted across SDK versions: the license-key
 * benefit lives on the *order*, but some Checkout shapes inline order
 * data while others don't. So we:
 *   1. Fetch /v1/checkouts/{id} — always works, gives us order id,
 *      customer, product, paid_at.
 *   2. If the checkout response already contains a license key, return
 *      it.
 *   3. Otherwise, follow up with /v1/orders/{order_id} and pull the
 *      benefit grant from there.
 *
 * Freshness check (15 min) is derived from Polar's own checkout
 * timestamp (`paid_at` or `created_at`); no webhook needed.
 *
 * Env (server-only)
 * -----------------
 *   POLAR_ACCESS_TOKEN          Organization Access Token
 *   POLAR_API_BASE              Optional override, defaults to
 *                               https://api.polar.sh
 *   POLAR_CUSTOMER_PORTAL_URL   Public portal URL fallback
 */

const POLAR_API_BASE = process.env.POLAR_API_BASE ?? 'https://api.polar.sh'
const FRESHNESS_MS = 15 * 60 * 1000 // 15 minutes

function token(): string {
  const t = process.env.POLAR_ACCESS_TOKEN
  if (!t) throw new Error('POLAR_ACCESS_TOKEN is not set')
  return t
}

function customerPortalFallback(): string {
  return (
    process.env.POLAR_CUSTOMER_PORTAL_URL ??
    'https://polar.sh/battery-sensei/portal'
  )
}

type FetchedLicenseDelivery = {
  checkoutId: string
  orderId: string | null
  licenseKey: string | null
  customerEmail: string | null
  productName: string | null
  customerPortalUrl: string | null
  createdAt: number | null
}

// ────────────────────────────────────────────────────────────────────
//  Inlined polar helpers — DO NOT import from src/lib/polar-server.
//  Vercel's serverless bundler does not reliably traverse imports out
//  of `api/` into sibling directories under this project's TanStack
//  Start + Vite build (see api/checkout-session.ts for the full
//  history of this gotcha). Search for `fetchCheckoutLicense` to find
//  the other copy.
// ────────────────────────────────────────────────────────────────────

async function fetchCheckoutLicense(
  checkoutId: string,
): Promise<FetchedLicenseDelivery | null> {
  let checkoutData: Record<string, unknown> | null = null
  try {
    const res = await fetch(
      `${POLAR_API_BASE}/v1/checkouts/${encodeURIComponent(checkoutId)}`,
      {
        headers: {
          Authorization: `Bearer ${token()}`,
          Accept: 'application/json',
        },
      },
    )
    if (!res.ok) return null
    checkoutData = (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }

  const orderId =
    pluck<string>(checkoutData, 'order.id', 'order_id', 'order.uuid') ?? null

  let licenseKey = findLicenseKey(checkoutData)

  // Checkout response didn't expose the benefit grant — try the Order.
  if (!licenseKey && orderId) {
    try {
      const orderRes = await fetch(
        `${POLAR_API_BASE}/v1/orders/${encodeURIComponent(orderId)}`,
        {
          headers: {
            Authorization: `Bearer ${token()}`,
            Accept: 'application/json',
          },
        },
      )
      if (orderRes.ok) {
        const orderData = (await orderRes.json()) as Record<string, unknown>
        licenseKey = findLicenseKey(orderData)
      }
    } catch {
      /* fall through — return delivery without key so the UI can still
         display the order id + portal link. */
    }
  }

  const createdIso =
    pluck<string>(
      checkoutData,
      'order.paid_at',
      'order.created_at',
      'paid_at',
      'created_at',
      'modified_at',
    ) ?? null
  const createdAt = createdIso ? Date.parse(createdIso) : NaN

  return {
    checkoutId,
    orderId,
    licenseKey,
    customerEmail:
      pluck<string>(checkoutData, 'customer.email', 'customer_email') ?? null,
    productName:
      pluck<string>(checkoutData, 'product.name', 'product_name') ?? null,
    customerPortalUrl:
      pluck<string>(
        checkoutData,
        'customer_portal_url',
        'customer.portal_url',
      ) ?? customerPortalFallback(),
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
  }
}

/** Walk every known Polar response shape for the license-key benefit
 *  and return the first one that resolves. Robust against field-path
 *  shifts between SDK versions. */
function findLicenseKey(data: unknown): string | null {
  if (!data) return null
  return (
    pluck<string>(
      data,
      'order.items.0.benefits.0.license_key.key',
      'order.benefit_grants.0.properties.license_key.key',
      'order.benefit_grants.0.license_key.key',
      'order.items.0.product.benefits.0.license_key.key',
      'items.0.benefits.0.license_key.key',
      'benefit_grants.0.properties.license_key.key',
      'benefit_grants.0.license_key.key',
      'license_key.key',
      'license_keys.0.key',
    ) ?? null
  )
}

function pluck<T>(obj: unknown, ...paths: string[]): T | undefined {
  for (const path of paths) {
    const segments = path.split('.')
    let cur: unknown = obj
    for (const seg of segments) {
      if (cur == null) {
        cur = undefined
        break
      }
      if (Array.isArray(cur)) {
        const idx = Number(seg)
        cur = Number.isFinite(idx) ? cur[idx] : undefined
      } else if (typeof cur === 'object') {
        cur = (cur as Record<string, unknown>)[seg]
      } else {
        cur = undefined
        break
      }
    }
    if (cur !== undefined && cur !== null) return cur as T
  }
  return undefined
}

// ────────────────────────────────────────────────────────────────────
//  Response helpers + handler
// ────────────────────────────────────────────────────────────────────

function jsonResponse(
  payload: Record<string, unknown>,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

function expired(
  reason: string,
  checkoutId: string | null,
  orderId: string | null,
): Response {
  return jsonResponse(
    {
      expired: true,
      reason,
      checkoutId,
      orderId,
      customerPortalUrl: customerPortalFallback(),
    },
    {
      status: 410,
      headers: { 'cache-control': 'no-store' },
    },
  )
}

/** Parse the dynamic `[id]` segment out of the request URL. We don't
 *  use Vercel's path-param injection here because the handler signature
 *  for the Web-Request runtime is `(request: Request) => Response`. */
function extractId(request: Request): string {
  const { pathname } = new URL(request.url)
  // /api/checkout/<id>  → split, last non-empty segment
  const parts = pathname.split('/').filter(Boolean)
  return decodeURIComponent(parts[parts.length - 1] ?? '').trim()
}

/**
 * Vercel routes Web Request/Response to handlers exported as named
 * HTTP methods. `export default function` gets the Node IncomingMessage
 * instead — keep this as a named GET export. (See checkout-session.ts
 * for the long-form explanation; same gotcha.)
 */
export async function GET(request: Request): Promise<Response> {
  const id = extractId(request)
  if (!id) {
    return expired('missing-checkout-id', null, null)
  }

  let delivery: FetchedLicenseDelivery | null
  try {
    delivery = await fetchCheckoutLicense(id)
  } catch (err) {
    console.warn('[checkout/[id]] upstream threw', {
      id,
      err: err instanceof Error ? err.message : String(err),
    })
    return expired('upstream-error', id, null)
  }

  if (!delivery) return expired('not-found', id, null)

  // Freshness check — if the order finished more than 15 minutes ago,
  // we're past the on-screen reveal window regardless of key state.
  if (delivery.createdAt && Date.now() - delivery.createdAt > FRESHNESS_MS) {
    return expired('window-passed', id, delivery.orderId)
  }

  // Inside the freshness window but Polar hasn't returned the key yet —
  // typically because the order finished but the benefit grant is still
  // being created upstream. Don't lie about "closed window"; tell the
  // truth: it's on its way.
  if (!delivery.licenseKey) {
    return jsonResponse(
      {
        provisioning: true,
        checkoutId: delivery.checkoutId,
        orderId: delivery.orderId,
        customerEmail: delivery.customerEmail,
        customerPortalUrl:
          delivery.customerPortalUrl ?? customerPortalFallback(),
      },
      { headers: { 'cache-control': 'no-store' } },
    )
  }

  return jsonResponse(
    {
      licenseKey: delivery.licenseKey,
      checkoutId: delivery.checkoutId,
      orderId: delivery.orderId,
      customerEmail: delivery.customerEmail,
      productName: delivery.productName,
      customerPortalUrl:
        delivery.customerPortalUrl ?? customerPortalFallback(),
    },
    {
      headers: {
        // Never let any cache hold a license key.
        'cache-control': 'private, no-store, max-age=0',
        vary: '*',
      },
    },
  )
}
