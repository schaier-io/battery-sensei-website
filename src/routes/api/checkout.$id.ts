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
 *   - 200 ready       — license key present
 *   - 200 provisioning — order paid but Polar hasn't returned the key
 *     yet (rare but real on fresh checkouts). The UI shows an
 *     "in-your-inbox-soon" panel with the order id.
 *   - 410 expired     — freshness window passed OR the upstream
 *     completely failed. Includes order id when we have one so the UI
 *     can still surface it.
 *
 * Freshness check is derived from Polar's own checkout timestamp
 * (`created_at` or `paid_at`), so there's no webhook needed.
 */

const FRESHNESS_MS = 15 * 60 * 1000 // 15 minutes

async function handleGet(checkoutId: string): Promise<Response> {
  const id = (checkoutId ?? '').trim()
  if (!id) {
    return expired('missing-checkout-id', null, null)
  }

  let delivery
  try {
    delivery = await fetchCheckoutLicense(id)
  } catch {
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
    return json(
      {
        provisioning: true,
        checkoutId: delivery.checkoutId,
        orderId: delivery.orderId,
        customerEmail: delivery.customerEmail,
        customerPortalUrl:
          delivery.customerPortalUrl ?? customerPortalFallback(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  return json(
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
        'Cache-Control': 'private, no-store, max-age=0',
        Vary: '*',
      },
    },
  )
}

function expired(
  reason: string,
  checkoutId: string | null,
  orderId: string | null,
): Response {
  return json(
    {
      expired: true,
      reason,
      checkoutId,
      orderId,
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
