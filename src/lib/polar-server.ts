/**
 * Server-only Polar API helpers. Imports of this file must never reach
 * the client bundle — it reads POLAR_ACCESS_TOKEN from process.env.
 */

const POLAR_API_BASE =
  process.env.POLAR_API_BASE ?? 'https://api.polar.sh'

function token(): string {
  const t = process.env.POLAR_ACCESS_TOKEN
  if (!t) throw new Error('POLAR_ACCESS_TOKEN is not set')
  return t
}

export type FetchedLicenseDelivery = {
  /** Always returned, even if the license key couldn't be located. */
  checkoutId: string
  orderId: string | null
  /** The license key value. Null when Polar didn't expose one yet
   *  (e.g. the order hasn't finished provisioning the benefit grant). */
  licenseKey: string | null
  customerEmail: string | null
  productName: string | null
  customerPortalUrl: string | null
  /** When the checkout was paid (ms since epoch). Drives the freshness
   *  window on the success page. Falls back to checkout `created_at`. */
  createdAt: number | null
}

/**
 * Fetch a checkout (with its order + benefit grants) by ID and pull the
 * license key out. Polar's API layout has shifted across releases: the
 * license-key benefit lives on the *order*, but some Checkout shapes
 * inline a subset of order data, others don't. So:
 *
 *   1. Fetch /v1/checkouts/{id} — always works, gives us the order id,
 *      customer, product, paid_at.
 *   2. If the checkout response already contains a benefit-grant with a
 *      license key, return it.
 *   3. Otherwise, follow up with /v1/orders/{order_id} and pull the
 *      benefit grant from there.
 *
 * The function always returns a delivery record, never null, so the
 * caller can always render order-id / email / portal-url even when the
 * key itself is still being provisioned.
 */
export async function fetchCheckoutLicense(
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
    pluck<string>(
      checkoutData,
      'order.id',
      'order_id',
      'order.uuid',
    ) ?? null

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

export function customerPortalFallback(): string {
  return (
    process.env.POLAR_CUSTOMER_PORTAL_URL ??
    'https://polar.sh/battery-sensei/portal'
  )
}

// ---- helpers --------------------------------------------------------------

/**
 * Walk every known Polar response shape for the license-key benefit and
 * return the first one that resolves. Robust against the field-path
 * shifts between SDK versions.
 */
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
