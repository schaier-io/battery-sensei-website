// Lemon Squeezy overlay checkout. Lemon.js attaches a global `createLemonSqueezy()`
// initializer; once called, anchors with `class="lemonsqueezy-button"` and an
// `href` pointing at a checkout URL open as a modal overlay instead of a redirect.
//
// Set VITE_LS_STORE and VITE_LS_VARIANT in `.env` once the product exists in your
// Lemon Squeezy dashboard. The store slug is the subdomain of your checkout URL
// (https://<STORE>.lemonsqueezy.com); the variant ID is the numeric id of the
// $3.99 one-time variant on the Premium product.

declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      Url: { Open: (url: string) => void }
      Setup?: (opts: { eventHandler?: (e: { event: string }) => void }) => void
    }
  }
}

const STORE = import.meta.env.VITE_LS_STORE ?? 'YOUR_STORE'
const VARIANT = import.meta.env.VITE_LS_VARIANT ?? 'YOUR_VARIANT'

export const PREMIUM_PRICE_USD = 3.99
export const TRIAL_DAYS = 5

export function premiumCheckoutUrl(): string {
  // `embed=1` makes Lemon.js intercept the click and open the overlay.
  return `https://${STORE}.lemonsqueezy.com/buy/${VARIANT}?embed=1&media=0&logo=0&discount=0`
}

export function openPremiumCheckout() {
  if (typeof window === 'undefined') return
  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Url.Open(premiumCheckoutUrl())
    return
  }
  window.open(premiumCheckoutUrl(), '_blank', 'noopener')
}
