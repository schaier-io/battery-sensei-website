// Polar.sh checkout. Pre-created Checkout Links in the Polar dashboard
// produce stable URLs like `https://buy.polar.sh/polar_cl_xxxxxxxx`; we
// just append prefill params (`discount_code`, etc.) on click.
//
// Public client-side env (exposed to the bundle):
//   VITE_POLAR_CHECKOUT_URL_LIFETIME   Checkout Link for the one-time
//                                      Lifetime product
//   VITE_POLAR_CHECKOUT_URL_SUPPORT    Checkout Link for the yearly
//                                      "Ongoing Developer Support" product
//
// Server-only env (used by `api/price.ts` for per-country totals — never
// exposed to the bundle):
//   POLAR_ACCESS_TOKEN          organization access token from Polar
//                               dashboard → Settings → Developers
//   POLAR_PRODUCT_ID_SUPPORT    UUID of the $3.99/yr support product —
//                               used as the live FX/VAT reference price
//                               (Lifetime is derived from it: +1 unit
//                               discounted, ×3 full)

const LIFETIME_CHECKOUT_URL =
  import.meta.env.VITE_POLAR_CHECKOUT_URL_LIFETIME ??
  'https://buy.polar.sh/YOUR_LIFETIME_CHECKOUT_LINK'

const SUPPORT_CHECKOUT_URL =
  import.meta.env.VITE_POLAR_CHECKOUT_URL_SUPPORT ??
  'https://buy.polar.sh/YOUR_SUPPORT_CHECKOUT_LINK'

/**
 * Polar customer portal. Buyers sign in with the email they used at
 * checkout and can: see receipts, download invoices, update billing
 * info, manage active subscriptions (support tier), and resend their
 * license key. The portal URL is org-scoped on Polar — set
 * `VITE_POLAR_CUSTOMER_PORTAL_URL` to the operator's org portal (e.g.
 * `https://polar.sh/<org-slug>/portal`). Default falls back to Polar's
 * general sign-in page so the link never 404s if the env var is unset.
 */
export const CUSTOMER_PORTAL_URL =
  import.meta.env.VITE_POLAR_CUSTOMER_PORTAL_URL ??
  'https://polar.sh/schaier-io/portal/overview'

/**
 * Launch discount for the Lifetime tier.
 *
 * **ZENMODE** is the silent, auto-applied launch code: the server
 * attaches it to every embed session by default, Polar caps it at
 * 500 redemptions and 422s once exhausted. Visitors never have to
 * type it. Once exhausted, every "launch discount" surface on the
 * site (scarcity bar, discount-note chip, strikethrough, the
 * /checkout hint chip) hides itself, and the headline price becomes
 * the original full price.
 *
 */
export const LIFETIME_DISCOUNT_CODE = 'ZENMODE'
export const LIFETIME_DISCOUNT_MAX_REDEMPTIONS = 500

/**
 * Lifetime fallback prices, per currency. ONLY rendered before the
 * live `/api/price` round-trip lands (SSR, first-paint window, or
 * when the Polar API call fails). Live Polar preview overrides
 * these everywhere once it returns. Keep in sync with the Polar
 * dashboard configuration for the Lifetime product, or the slow-
 * connection FOIT flashes quotes the wrong number for a beat.
 *
 * Source of truth (Polar Lifetime product + ZENMODE discount):
 *   Currency │  Full   │  Discount removes  │  Final
 *   ─────────┼─────────┼────────────────────┼────────
 *   USD      │ $11.99  │  $7.50             │  $4.49
 *   EUR      │ €10.99  │  €7.00             │  €3.99
 *   CZK      │ 205 Kč  │  110 Kč            │  95 Kč
 *
 * The "discounted" value is what buyers pay during the first-500
 * window. "full" is the strikethrough anchor (and the headline once
 * ZENMODE is exhausted).
 */
export const LIFETIME_FALLBACK: Record<
  string,
  { discounted: number; full: number }
> = {
  USD: { discounted: 4.49, full: 11.99 },
  EUR: { discounted: 3.99, full: 10.99 },
  CZK: { discounted: 95, full: 205 },
}
/** Used when the visitor's currency isn't in LIFETIME_FALLBACK. */
export const LIFETIME_FALLBACK_DEFAULT = LIFETIME_FALLBACK.USD

export const SUPPORT_PRICE_USD = 2.99
export const TRIAL_DAYS = 5

export type CheckoutUrlOptions = {
  /** Promo / discount code to pre-fill at checkout. Polar validates server-side. */
  discountCode?: string
}

function withDiscount(base: string, code: string | undefined): string {
  const trimmed = code?.trim()
  if (!trimmed) return base
  const url = new URL(base)
  url.searchParams.set('discount_code', trimmed)
  return url.toString()
}

/** Yearly "Ongoing Developer Support" subscription. */
export function supportCheckoutUrl(opts: CheckoutUrlOptions = {}): string {
  return withDiscount(SUPPORT_CHECKOUT_URL, opts.discountCode)
}

/** Lifetime one-time license. ZENMODE is auto-applied unless overridden. */
export function lifetimeCheckoutUrl(opts: CheckoutUrlOptions = {}): string {
  // Caller's discount code wins; otherwise we pre-fill ZENMODE so the
  // first-500 discount is always applied. Once Polar exhausts the cap the
  // param is silently ignored server-side.
  const code = opts.discountCode?.trim() || LIFETIME_DISCOUNT_CODE
  return withDiscount(LIFETIME_CHECKOUT_URL, code)
}
