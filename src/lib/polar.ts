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

/** Lifetime price (in the visitor's currency) is `yearly + 1`. */
export const LIFETIME_DELTA_OVER_YEARLY = 1
/** Lifetime "original" / strikethrough price is `yearly × 3`. */
export const LIFETIME_FULL_MULTIPLIER = 3

export const SUPPORT_PRICE_USD = 3.99
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
