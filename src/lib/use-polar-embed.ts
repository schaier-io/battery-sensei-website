import { useCallback } from 'react'

/**
 * Polar.sh embedded-checkout hook.
 *
 * Wraps `@polar-sh/checkout/embed`'s `EmbedCheckout.create()` so the
 * Lifetime / Support buy buttons open the checkout in a modal iframe
 * instead of doing a full-page redirect to `buy.polar.sh`. Feels
 * native, keeps the user on our domain, and lets us hook events
 * (success / close) for analytics or post-purchase UI.
 *
 * The SDK is dynamically imported on first invocation — the embed
 * runtime (~30 KB gzipped) is fetched only when a visitor actually
 * intends to buy, keeping the initial bundle lean.
 *
 * Polar webhook handling (license issuance, fulfilment) stays
 * server-side in your Polar dashboard; this hook only drives the UI.
 *
 * ## Fake / dev mode
 *
 * Set `VITE_POLAR_FAKE_CHECKOUT=true` in `.env.local` to bypass Polar
 * entirely. The hook opens a tiny in-page success overlay so the
 * thank-you / post-purchase flow can be tested end-to-end without a
 * real Polar account, real checkout link, or a card. Visitors in fake
 * mode navigate straight to `/thanks/lifetime` or `/thanks/support`
 * depending on which CTA they clicked.
 */

const FAKE_MODE =
  String(import.meta.env.VITE_POLAR_FAKE_CHECKOUT ?? '').toLowerCase() === 'true'

type Theme = 'light' | 'dark'

export type PolarCheckoutOptions = {
  /** Polar Checkout Link URL or programmatically created session URL. */
  url: string
  /** Embed theme. Defaults to `light` to match the washi page tone. */
  theme?: Theme
  /** Tier hint used by fake mode to send the visitor to the right
   *  thank-you page (`/thanks/lifetime` vs `/thanks/support`). Real
   *  Polar mode ignores this — Polar's success URL drives navigation. */
  tier?: 'lifetime' | 'support'
  /** Called when the checkout reports a successful purchase. If
   *  `willRedirect` is true, Polar's embed will navigate the parent
   *  window to `successURL` itself — usually you don't need to do
   *  anything here. */
  onSuccess?: (successURL: string, willRedirect: boolean) => void
  /** Called when the visitor dismisses the modal without buying. */
  onClose?: () => void
  /** Called when the user has submitted card details but the server is
   *  still processing — the modal is locked closed during this window. */
  onConfirmed?: () => void
}

export function usePolarCheckout() {
  return useCallback(async (opts: PolarCheckoutOptions) => {
    if (FAKE_MODE) {
      return openFakeCheckout(opts)
    }
    // Lazy load: the embed bundle is only fetched when a visitor
    // actually clicks a buy button. The export is named
    // `PolarEmbedCheckout` (not `EmbedCheckout`) — the v0.2.x package
    // re-export aliased it to avoid collision with any host class.
    const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed')
    const embed = await PolarEmbedCheckout.create(opts.url, {
      theme: opts.theme ?? 'light',
    })
    if (opts.onSuccess) {
      embed.addEventListener('success', (event) => {
        opts.onSuccess!(event.detail.successURL, event.detail.redirect)
      })
    }
    if (opts.onClose) {
      embed.addEventListener('close', () => opts.onClose!())
    }
    if (opts.onConfirmed) {
      embed.addEventListener('confirmed', () => opts.onConfirmed!())
    }
    return embed
  }, [])
}

/**
 * Lightweight in-page fake checkout for `VITE_POLAR_FAKE_CHECKOUT=true`.
 *
 * Shows a small "Pretend payment — click to succeed" overlay. Submit
 * fires the same success handler the real Polar embed would, and (if
 * no handler navigates first) sends the visitor to `/thanks/<tier>`
 * with a synthetic checkout id so the thank-you page can render.
 */
function openFakeCheckout(opts: PolarCheckoutOptions): { close: () => void } {
  const tier = opts.tier ?? 'lifetime'
  const successURL = `${window.location.origin}/thanks/${tier}?checkout_id=fake_${Date.now()}`

  const wrap = document.createElement('div')
  wrap.setAttribute('role', 'dialog')
  wrap.setAttribute('aria-modal', 'true')
  wrap.setAttribute('aria-label', 'Fake checkout (dev)')
  wrap.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'display:flex', 'align-items:center', 'justify-content:center',
    'background:rgba(28,26,23,0.55)', 'backdrop-filter:blur(4px)',
    'animation:fake-fade-in 220ms cubic-bezier(0.2,0.8,0.2,1) both',
    'font-family:inherit',
  ].join(';')

  const card = document.createElement('div')
  card.style.cssText = [
    'width:min(420px,92vw)', 'background:#fbf7ef', 'color:#1c1a17',
    'border:1px solid rgba(28,26,23,0.12)', 'border-radius:14px',
    'padding:24px 22px', 'box-shadow:0 22px 48px -22px rgba(28,26,23,0.45)',
    'transform-origin:center', 'animation:fake-pop-in 240ms cubic-bezier(0.2,0.8,0.2,1) both',
  ].join(';')
  card.innerHTML = `
    <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8a847c;margin-bottom:8px">
      Dev · Fake checkout
    </div>
    <div style="font-family:'EB Garamond',serif;font-size:22px;font-weight:600;line-height:1.2;margin-bottom:6px">
      Pretend payment for ${tier === 'lifetime' ? 'Lifetime' : 'Yearly Support'}.
    </div>
    <p style="font-size:13px;color:#6f6a64;margin:0 0 18px 0;line-height:1.5">
      VITE_POLAR_FAKE_CHECKOUT is on. No card, no Polar. Click to simulate a successful purchase and land on the thank-you page.
    </p>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" data-action="cancel"
        style="height:38px;padding:0 14px;border:1px solid rgba(28,26,23,0.18);background:transparent;border-radius:8px;font-size:13px;color:#3f3a35;cursor:pointer">
        Cancel
      </button>
      <button type="button" data-action="succeed"
        style="height:38px;padding:0 16px;border:0;background:#1c1a17;color:#fbf7ef;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer">
        Succeed → thank-you
      </button>
    </div>
  `
  wrap.appendChild(card)

  // Inject keyframes once.
  if (!document.getElementById('fake-checkout-keyframes')) {
    const style = document.createElement('style')
    style.id = 'fake-checkout-keyframes'
    style.textContent = `
      @keyframes fake-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes fake-pop-in {
        from { opacity: 0; transform: translateY(8px) scale(0.97) }
        to   { opacity: 1; transform: translateY(0) scale(1) }
      }
    `
    document.head.appendChild(style)
  }

  function close() {
    wrap.remove()
    opts.onClose?.()
  }

  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) close()
  })
  card.querySelector('[data-action="cancel"]')?.addEventListener('click', close)
  card.querySelector('[data-action="succeed"]')?.addEventListener('click', () => {
    // Mirror the real Polar embed: fire onSuccess with the synthetic
    // success URL + redirect flag, then navigate as Polar would.
    opts.onSuccess?.(successURL, true)
    wrap.remove()
    window.location.assign(successURL)
  })

  document.body.appendChild(wrap)

  // Return a tiny façade so callers can still treat the result like
  // the real `EmbedCheckout` instance.
  return { close }
}
