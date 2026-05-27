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
  licenseKey: string
  customerEmail: string | null
  productName: string | null
  customerPortalUrl: string | null
  /** When the checkout was paid (ms since epoch). Used for the freshness
   *  window on the success page. Falls back to checkout `created_at`. */
  createdAt: number | null
}

/**
 * Fetch a checkout (with its order + benefit grants) by ID and pull the
 * license key out. Polar returns the license key value on the
 * Order/Benefit-grant payload after payment is confirmed; this function
 * walks the response defensively because the exact field path has shifted
 * across Polar SDK versions.
 */
export async function fetchCheckoutLicense(
  checkoutId: string,
): Promise<FetchedLicenseDelivery | null> {
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
  const data = (await res.json()) as Record<string, unknown>

  const licenseKey =
    pluck<string>(
      data,
      'order.items.0.benefits.0.license_key.key',
      'order.benefit_grants.0.properties.license_key.key',
      'order.benefit_grants.0.license_key.key',
      'license_key.key',
      'license_keys.0.key',
    ) ?? null

  if (!licenseKey) return null

  const createdIso =
    pluck<string>(
      data,
      'order.paid_at',
      'order.created_at',
      'paid_at',
      'created_at',
      'modified_at',
    ) ?? null
  const createdAt = createdIso ? Date.parse(createdIso) : NaN

  return {
    licenseKey,
    customerEmail:
      pluck<string>(data, 'customer.email', 'customer_email') ?? null,
    productName: pluck<string>(data, 'product.name', 'product_name') ?? null,
    customerPortalUrl:
      pluck<string>(data, 'customer_portal_url', 'customer.portal_url') ??
      customerPortalFallback(),
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
