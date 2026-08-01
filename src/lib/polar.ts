// Polar.sh checkout. The purchase path creates embedded sessions through the
// server API; these public links remain optional compatibility fallbacks.
//
// Public client-side env (exposed to the bundle):
//   VITE_POLAR_CHECKOUT_URL_LIFETIME   Checkout Link for the one-time
//                                      Lifetime product
//   VITE_POLAR_CHECKOUT_URL_SUPPORT    Checkout Link for the yearly
//                                      "Yearly Patron" product
//
// Server-only `_NEW` token/product ids drive live per-country totals.

const LIFETIME_CHECKOUT_URL =
  import.meta.env.VITE_POLAR_CHECKOUT_URL_LIFETIME_NEW ||
  'https://buy.polar.sh/YOUR_LIFETIME_CHECKOUT_LINK'

const SUPPORT_CHECKOUT_URL =
  import.meta.env.VITE_POLAR_CHECKOUT_URL_SUPPORT_NEW ||
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
  import.meta.env.VITE_POLAR_CUSTOMER_PORTAL_URL_NEW ||
  'https://polar.sh/41bit-llc/portal'

/** Existing buyers remain in the original Polar organization. */
export const LEGACY_CUSTOMER_PORTAL_URL =
  import.meta.env.VITE_POLAR_CUSTOMER_PORTAL_URL ||
  'https://polar.sh/schaier-io/portal/overview'

export const HAS_SEPARATE_LEGACY_CUSTOMER_PORTAL =
  LEGACY_CUSTOMER_PORTAL_URL !== CUSTOMER_PORTAL_URL

/**
 * Launch discount for the Lifetime tier.
 *
 * The configured code is the silent, auto-applied launch discount: the server
 * attaches it to every embed session by default, Polar caps it at
 * the configured redemption maximum and 422s once exhausted. Visitors never have to
 * type it. Once exhausted, every "launch discount" surface on the
 * site (scarcity bar, discount-note chip, strikethrough, the
 * /checkout hint chip) hides itself, and the headline price becomes
 * the original full price.
 *
 */
export const LIFETIME_DISCOUNT_CODE =
  import.meta.env.VITE_POLAR_DISCOUNT_CODE_NEW ||
  'ZENMODE'
const configuredDiscountMaximum = Number(
  import.meta.env.VITE_POLAR_DISCOUNT_MAX_REDEMPTIONS_NEW ||
  500,
)
export const LIFETIME_DISCOUNT_MAX_REDEMPTIONS =
  Number.isSafeInteger(configuredDiscountMaximum) && configuredDiscountMaximum > 0
    ? configuredDiscountMaximum
    : 500

/**
 * Lifetime fallback prices, per currency. ONLY rendered before the
 * live `/api/price` round-trip lands (SSR, first-paint window, or
 * when the Polar API call fails). Live Polar preview overrides
 * these everywhere once it returns. Keep in sync with the Polar
 * dashboard configuration for the Lifetime product, or the slow-
 * connection FOIT flashes quotes the wrong number for a beat.
 *
 * Source of truth (Polar Lifetime product + configured discount):
 *   Currency │  Full   │  Discount removes  │  Final
 *   ─────────┼─────────┼────────────────────┼────────
 *   USD      │  $9.99  │  $3.00             │  $6.99
 *   EUR      │  €9.99  │  €3.00             │  €6.99
 *
 * The "discounted" value is what buyers pay during the limited launch
 * window. "full" is the strikethrough anchor (and the headline once
 * the discount is exhausted).
 */
export const LIFETIME_FALLBACK: Record<
  string,
  { discounted: number; full: number }
> = {
  USD: { discounted: 6.99, full: 9.99 },
  EUR: { discounted: 6.99, full: 9.99 },
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

/** Yearly "Yearly Patron" subscription. */
export function supportCheckoutUrl(opts: CheckoutUrlOptions = {}): string {
  return withDiscount(SUPPORT_CHECKOUT_URL, opts.discountCode)
}

/** Lifetime one-time license. The configured discount is auto-applied. */
export function lifetimeCheckoutUrl(opts: CheckoutUrlOptions = {}): string {
  // Caller's discount code wins; otherwise pre-fill the configured launch
  // discount. Once Polar exhausts the cap the
  // param is silently ignored server-side.
  const code = opts.discountCode?.trim() || LIFETIME_DISCOUNT_CODE
  return withDiscount(LIFETIME_CHECKOUT_URL, code)
}
