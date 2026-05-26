import { useCallback } from 'react'

/**
 * Polar.sh embedded-checkout hook.
 *
 * Wraps `@polar-sh/checkout/embed`'s `PolarEmbedCheckout.create()` so
 * the Lifetime / Support buy buttons open the checkout in a modal
 * iframe instead of doing a full-page redirect to `buy.polar.sh`.
 * Keeps the visitor on our domain and lets us hook events (success /
 * close) for analytics or post-purchase UI.
 *
 * ## Two-stage flow (post-2026-05 fix)
 *
 * Polar's pre-created Checkout LINKS respond with `frame-ancestors:
 * 'none'`, so naively pointing the iframe at a Link URL gets blocked
 * by the browser ("polar.sh will not allow this page to be displayed
 * because another site has embedded it"). The fix is to create a
 * Checkout SESSION via the API with `embed_origin` set to our public
 * origin — Polar then serves that session page with frame-ancestors
 * permitting our domain, and the embed loads cleanly.
 *
 * So the real-mode path is:
 *
 *   1. POST `/api/checkout-session` with `{tier, discountCode?}`
 *   2. Receive `{url}` (a session URL like `https://api.polar.sh/v1/
 *      checkouts/client/<secret>/`) configured for our embed origin
 *   3. Pass that URL to `PolarEmbedCheckout.create(url, {theme})`
 *
 * If the session create fails (token missing, network blip, Polar
 * outage) the hook opens a tiny inline error overlay asking the
 * visitor to try again or email us. We deliberately do NOT fall back
 * to a buy.polar.sh redirect — the brand promise is "checkout stays
 * on battery-sensei.app".
 *
 * The embed SDK is dynamically imported on first invocation — the
 * ~30 KB runtime is fetched only when a visitor actually clicks Buy.
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
  /** Buyer tier — drives which product the server-created session uses,
   *  and which thank-you page the fake-mode overlay redirects to. */
  tier: 'lifetime' | 'support'
  /** Optional promo / discount code to pre-apply (ZENMODE on Lifetime). */
  discountCode?: string
  /** Embed theme. Defaults to `light` to match the washi page tone. */
  theme?: Theme
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

type SessionResponse =
  | { ok: true; url: string; tier: 'lifetime' | 'support' }
  | { ok: false; reason: string }

/**
 * Module-scoped slot for the last server reason, so the error overlay
 * can show a tiny diagnostic chip without forcing the fetch helper to
 * return a richer shape. Acceptable globalish state because the
 * checkout flow is strictly serial (one button click at a time).
 */
let lastReason: string | null = null

/**
 * Ask the server to mint a fresh embed-eligible Checkout Session.
 * Returns the session URL on success, or null on any failure (caller
 * shows an inline overlay).
 */
async function fetchSessionUrl(
  tier: 'lifetime' | 'support',
  discountCode: string | undefined,
): Promise<string | null> {
  lastReason = null
  try {
    const res = await fetch('/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tier,
        ...(discountCode ? { discountCode } : {}),
      }),
    })
    if (!res.ok) {
      // 4xx/5xx still carries a JSON body with a `reason` we can show.
      const data = await res.json().catch(() => null) as SessionResponse | null
      lastReason = data && 'reason' in data ? data.reason : `http-${res.status}`
      console.warn('[polar-embed] session create non-2xx', res.status, lastReason)
      return null
    }
    const data = (await res.json()) as SessionResponse
    if (!data.ok) {
      lastReason = data.reason
      console.warn('[polar-embed] session create returned ok=false', data.reason)
      return null
    }
    return data.url
  } catch (err) {
    lastReason = 'network'
    console.warn(
      '[polar-embed] session create threw',
      err instanceof Error ? err.message : String(err),
    )
    return null
  }
}

export function usePolarCheckout() {
  return useCallback(async (opts: PolarCheckoutOptions) => {
    if (FAKE_MODE) {
      return openFakeCheckout(opts)
    }

    // Mint an embed-eligible session URL. Polar's pre-created Checkout
    // Links return `frame-ancestors: 'none'` and cannot be iframed; a
    // session created with `embed_origin: <our origin>` can. The API
    // route hides the Polar API token + product ids server-side.
    const sessionUrl = await fetchSessionUrl(opts.tier, opts.discountCode)

    if (!sessionUrl) {
      // Stay on page. We deliberately do NOT redirect to a Polar-
      // hosted Checkout Link as a fallback — the whole point of the
      // embed is to keep the visitor inside our washi/sumi context.
      // Surface an inline overlay so they know to try again instead
      // of silently doing nothing on click. `lastReason` carries the
      // server's hint into the overlay so operators see at a glance
      // whether it was missing config vs Polar 5xx vs CSRF.
      openCheckoutErrorOverlay({
        tier: opts.tier,
        reason: lastReason,
        onClose: opts.onClose,
      })
      return null
    }

    // Lazy load: the embed bundle is only fetched when a visitor
    // actually clicks a buy button. The export is named
    // `PolarEmbedCheckout` (not `EmbedCheckout`) — the v0.2.x package
    // re-export aliased it to avoid collision with any host class.
    const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed')
    const embed = await PolarEmbedCheckout.create(sessionUrl, {
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

/** Minimal HTML escape for the reason chip — only used on values we
 *  generate (`missing-config`, `polar-error`, `forbidden`, etc.) but
 *  cheap insurance in case a server reason ever contains user input. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Inline error overlay shown when the session-create API can't mint a
 * Checkout Session (token missing on the server, Polar 5xx, etc.). We
 * deliberately don't redirect to a Polar-hosted Checkout Link here —
 * the brand promise is "checkout on battery-sensei.app, not on
 * buy.polar.sh" — so failure surfaces inline instead.
 *
 * Vanilla DOM (not React) so it can be opened from a hook callback
 * without re-architecting the calling component. Mirrors the
 * `openFakeCheckout` overlay's washi styling so the two failure paths
 * (dev fake-checkout, prod backend down) feel like the same family.
 */
function openCheckoutErrorOverlay(opts: {
  tier: 'lifetime' | 'support'
  /** Server-reported reason for the failure, surfaced as a tiny chip
   *  so operators can diagnose without opening DevTools. Values:
   *  `missing-config` `polar-error` `forbidden` `network` etc. */
  reason?: string | null
  onClose?: () => void
}): { close: () => void } {
  const wrap = document.createElement('div')
  wrap.setAttribute('role', 'dialog')
  wrap.setAttribute('aria-modal', 'true')
  wrap.setAttribute('aria-label', 'Checkout unavailable')
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
  // Plain English copy. Not localized — this is a rare failure path and
  // keeping i18n out of vanilla DOM avoids carting around an i18n bundle
  // into a hook callback. If checkout outages become common enough that
  // the copy needs translating, lift this to a real React component.
  // Tiny diagnostic chip when the server returned a hint. Helps the
  // site operator (and any tech-savvy buyer) tell apart missing env
  // vars (`missing-config`) from Polar outage (`polar-error`) from
  // CSRF (`forbidden`) without opening DevTools.
  const reasonChip = opts.reason
    ? `<div style="margin:8px 0 12px;display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:rgba(28,26,23,0.06);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;letter-spacing:.04em;color:#6f6a64">
        <span style="width:6px;height:6px;border-radius:999px;background:#c93434"></span>
        ${escapeHtml(opts.reason)}
      </div>`
    : ''
  card.innerHTML = `
    <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8a847c;margin-bottom:8px">
      Checkout · unavailable
    </div>
    <div style="font-family:'Spectral',serif;font-size:22px;font-weight:600;line-height:1.2;margin-bottom:6px">
      Couldn't reach the checkout.
    </div>
    ${reasonChip}
    <p style="font-size:13px;color:#6f6a64;margin:0 0 18px 0;line-height:1.5">
      Something on our side blinked. Please try the ${opts.tier === 'lifetime' ? 'Lifetime' : 'Support'} button again in a moment. If it keeps failing, drop us a line at info@battery-sensei.app and we'll send you a payment link directly.
    </p>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" data-action="close"
        style="height:38px;padding:0 14px;border:1px solid rgba(28,26,23,0.18);background:transparent;border-radius:8px;font-size:13px;color:#3f3a35;cursor:pointer">
        Close
      </button>
      <a href="mailto:info@battery-sensei.app?subject=Checkout%20issue%20(${encodeURIComponent(opts.reason ?? 'unknown')})&body=Hi%2C%20I%20tried%20to%20buy%20the%20${opts.tier}%20tier%20and%20got%20an%20error.%20Could%20you%20send%20me%20a%20direct%20payment%20link%3F"
        style="height:38px;padding:0 16px;display:inline-flex;align-items:center;border:0;background:#1c1a17;color:#fbf7ef;border-radius:8px;font-size:13px;font-weight:500;text-decoration:none">
        Email us
      </a>
    </div>
  `
  wrap.appendChild(card)

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
  card.querySelector('[data-action="close"]')?.addEventListener('click', close)
  document.body.appendChild(wrap)

  return { close }
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
