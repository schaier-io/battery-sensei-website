import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'

/**
 * Inline (non-modal) Polar checkout.
 *
 * The `@polar-sh/checkout/embed` SDK only ships a modal-overlay path
 * (`PolarEmbedCheckout.create()` always injects a centered iframe on
 * top of the page). For the "checkout lives ON the /checkout page"
 * experience we hand-roll the iframe:
 *
 *  1. On mount, POST `/api/checkout-session` to mint an embed-eligible
 *     session URL configured for our origin (`embed_origin`). The
 *     endpoint silently auto-applies ZENMODE for Lifetime and falls
 *     back to no code if Polar rejects.
 *  2. Mount that URL inside an in-page <iframe>. The iframe has no
 *     border / shadow chrome — the surrounding washi paper-card
 *     carries the framing.
 *  3. Listen for `postMessage` from `polar.sh` for the lifecycle events
 *     Polar publishes: `loaded`, `confirmed`, `success`. On `success`
 *     with `redirect: true` we navigate the parent window to the
 *     server-supplied success URL (Polar substitutes `{CHECKOUT_ID}`
 *     server-side).
 *
 * Failure paths surface inline with a small error block, not a
 * full-page redirect — by design, the visitor stays on
 * battery-sensei.app even when Polar is having a moment.
 */
type Tier = 'lifetime' | 'support'

type SessionResponse =
  | { ok: true; url: string; tier: Tier }
  | { ok: false; reason: string }

type Phase = 'creating' | 'mounted' | 'loaded' | 'confirmed' | 'success' | 'error'

interface Props {
  tier: Tier
  /**
   * Promo code typed by the visitor on the /checkout page promo field.
   * Forwarded to the session-create endpoint; overrides the silent
   * ZENMODE auto-apply for that one click.
   */
  discountCode?: string
  /**
   * Light or dark theme handoff to Polar. Matches washi page tone by
   * default.
   */
  theme?: 'light' | 'dark'
}

// Origins Polar's iframe is allowed to postMessage from. The audit found
// the embed SDK pins to `polar.sh` for postMessage origin matching, so
// we match the same set here. Add `sandbox.polar.sh` so dev / sandbox
// orgs work too.
const POLAR_MESSAGE_ORIGINS = new Set([
  'https://polar.sh',
  'https://www.polar.sh',
  'https://buy.polar.sh',
  'https://api.polar.sh',
  'https://sandbox.polar.sh',
])

interface PolarSuccessMessage {
  event: 'success'
  successURL: string
  redirect: boolean
}

interface PolarLifecycleMessage {
  event: 'loaded' | 'confirmed' | 'close'
}

type PolarMessage = PolarSuccessMessage | PolarLifecycleMessage

function isPolarMessage(value: unknown): value is PolarMessage {
  if (typeof value !== 'object' || value === null) return false
  const event = (value as { event?: unknown }).event
  return (
    event === 'success' ||
    event === 'loaded' ||
    event === 'confirmed' ||
    event === 'close'
  )
}

export function PolarInlineCheckout({ tier, discountCode, theme = 'light' }: Props) {
  const { t, i18n } = useTranslation()
  const [phase, setPhase] = useState<Phase>('creating')
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)
  const [errorReason, setErrorReason] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Re-create the session whenever the tier or typed discount code
  // changes. Sessions are one-shot on Polar's side, so swapping codes
  // means a fresh round trip. The endpoint dedupes via Polar; no
  // client-side throttle needed.
  useEffect(() => {
    let cancelled = false
    setPhase('creating')
    setErrorReason(null)
    setSessionUrl(null)

    fetch('/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tier,
        ...(discountCode ? { discountCode } : {}),
      }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as SessionResponse | null
        if (cancelled) return
        if (body && body.ok && body.url) {
          // Forward the visitor's UI language to Polar so their form
          // labels match the rest of our page when we support more
          // than EN (Polar accepts a `locale` query param on the
          // session URL).
          const url = new URL(body.url)
          if (!url.searchParams.has('locale')) {
            url.searchParams.set('locale', i18n.language || 'en')
          }
          if (!url.searchParams.has('embed')) {
            url.searchParams.set('embed', 'true')
          }
          if (!url.searchParams.has('theme')) {
            url.searchParams.set('theme', theme)
          }
          setSessionUrl(url.toString())
          setPhase('mounted')
        } else {
          setErrorReason(body && 'reason' in body ? body.reason : `http-${res.status}`)
          setPhase('error')
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[inline-checkout] session create threw', err)
        setErrorReason('network')
        setPhase('error')
      })

    return () => {
      cancelled = true
    }
  }, [tier, discountCode, theme, i18n.language])

  // Listen for Polar's lifecycle messages. Same protocol the SDK uses:
  // `loaded`, `confirmed`, `success` (with successURL + redirect),
  // `close`. We only act on `success` with redirect=true; everything
  // else just updates the phase for the in-page loader / progress hint.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!POLAR_MESSAGE_ORIGINS.has(event.origin)) return
      const data = event.data as unknown
      if (!isPolarMessage(data)) return
      if (data.event === 'loaded') {
        setPhase('loaded')
      } else if (data.event === 'confirmed') {
        setPhase('confirmed')
      } else if (data.event === 'success') {
        setPhase('success')
        if (data.redirect && data.successURL) {
          window.location.assign(data.successURL)
        }
      }
      // `close` events are ignored — there's no modal to close.
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (phase === 'error') {
    return (
      <div
        role="alert"
        className="rounded-md border border-hinomaru/30 bg-[color-mix(in_oklab,var(--hinomaru)_6%,var(--washi))] px-5 py-5"
      >
        <div className="flex items-center gap-2.5 text-[0.8125rem] font-medium uppercase tracking-[0.2em] text-hinomaru">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          {t('checkout.error.title')}
        </div>
        <p className="mt-2 text-[0.9375rem] leading-snug text-sumi">
          {t('checkout.error.body')}
        </p>
        {errorReason && (
          <p className="mt-1 font-mono text-[11px] text-nezumi">
            {errorReason}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              // Bump a state to re-run the create effect. Re-setting
              // phase is enough — the discountCode / tier dependency
              // stays the same but the effect compares via state.
              setPhase('creating')
              setErrorReason(null)
              setSessionUrl(null)
              // Trigger a fresh fetch by re-running the effect:
              // simplest is a reload of just this hook via key bump.
              // We piggyback on the location hash so React state stays
              // local; alternative would be a useReducer + dispatch.
              const ev = new Event('polar-retry')
              window.dispatchEvent(ev)
              // Re-invoke fetch by tweaking phase, then the effect's
              // deps haven't changed, so we do a one-off direct call.
              // (Pragmatic; if this becomes common we'd useReducer.)
              location.reload()
            }}
            className="inline-flex h-10 items-center rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-4 text-[0.8125rem] font-medium text-sumi transition-colors hover:bg-[color-mix(in_oklab,var(--washi)_40%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            {t('checkout.error.retry')}
          </button>
          <a
            href={`mailto:info@battery-sensei.app?subject=${encodeURIComponent('Checkout issue (' + (errorReason ?? 'unknown') + ')')}`}
            className="inline-flex h-10 items-center rounded-md border border-transparent bg-sumi px-4 text-[0.8125rem] font-medium text-washi transition-colors hover:bg-[color-mix(in_oklab,var(--sumi)_88%,#000)]"
          >
            {t('checkout.error.email')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Skeleton + status overlay shown until Polar's iframe sends the
          `loaded` postMessage. Sits absolutely on top of the iframe so
          the layout doesn't reflow when the form arrives. */}
      {phase !== 'loaded' && phase !== 'success' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--washi)_94%,#fff)]"
        >
          <div className="flex flex-col items-center gap-3 text-sumi-soft">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.6} />
            <span className="text-[12px] uppercase tracking-[0.22em]">
              {phase === 'creating'
                ? t('checkout.inline.loading')
                : phase === 'confirmed'
                  ? t('checkout.inline.confirming')
                  : t('checkout.inline.preparing')}
            </span>
          </div>
        </div>
      )}

      {sessionUrl && (
        <iframe
          ref={iframeRef}
          src={sessionUrl}
          title={t('checkout.inline.title')}
          // The `allow` attribute is required for some Stripe payment
          // methods (Apple Pay, Google Pay) which gate behind
          // permission policy. Polar's iframe rides on Stripe under
          // the hood, so we forward the whole bouquet.
          allow="payment *; publickey-credentials-get *"
          // `loading="lazy"` would hold the iframe back until the
          // visitor scrolls near it — but on /checkout this IS the
          // primary content, so eager-load.
          loading="eager"
          className="block w-full min-h-[760px] rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)]"
        />
      )}

      {/* No-JS / iframe-blocked fallback. The visitor can still buy by
          clicking through to Polar's hosted page; same product, same
          discount autoapply via the Checkout Link query string. */}
      <noscript>
        <p className="mt-3 text-center text-[0.875rem] text-sumi-soft">
          {t('checkout.inline.noscript')}
        </p>
      </noscript>
    </div>
  )
}
