import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  customerPortalFallback,
  fetchCheckoutLicense,
} from '#/lib/polar-server'

/**
 * License delivery endpoint. The /thanks/lifetime and /thanks/support
 * pages (via LicenseRevealCard) call this with the `checkout_id` Polar
 * appended to its `success_url` redirect.
 *
 * Contract:
 *   - 200 { licenseKey, customerEmail?, productName?, customerPortalUrl }
 *     when the Polar checkout is still inside the freshness window.
 *   - 410 { expired: true, customerPortalUrl } once the freshness window
 *     has passed (or Polar didn't return a license key — e.g. the order
 *     hasn't been finalised yet, or the checkout didn't grant a key).
 *
 * Freshness check is derived from Polar's own checkout timestamp
 * (`created_at` or `paid_at`), so there's no need for a webhook receiver
 * to "open" the window. The client renders the 410 → portal URL as a
 * graceful fallback that points the buyer at their permanent customer
 * portal where the key always lives.
 */

const FRESHNESS_MS = 15 * 60 * 1000 // 15 minutes

async function handleGet(checkoutId: string): Promise<Response> {
  const id = (checkoutId ?? '').trim()
  if (!id) {
    return expired('missing-checkout-id')
  }

  let delivery
  try {
    delivery = await fetchCheckoutLicense(id)
  } catch {
    return expired('upstream-error')
  }

  if (!delivery) return expired('license-unavailable')

  if (delivery.createdAt) {
    const age = Date.now() - delivery.createdAt
    if (age > FRESHNESS_MS) return expired('window-passed')
  }

  return json(
    {
      licenseKey: delivery.licenseKey,
      customerEmail: delivery.customerEmail,
      productName: delivery.productName,
      customerPortalUrl:
        delivery.customerPortalUrl ?? customerPortalFallback(),
    },
    {
      headers: {
        // Never let any cache hold a license key.
        'Cache-Control': 'private, no-store, max-age=0',
        Vary: '*',
      },
    },
  )
}

function expired(reason: string): Response {
  return json(
    {
      expired: true,
      reason,
      customerPortalUrl: customerPortalFallback(),
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

export const Route = createFileRoute('/api/checkout/$id')({
  server: {
    handlers: {
      GET: ({ params }) => handleGet(params.id),
    },
  },
})
