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
 *  2. Mount that URL inside an in-page <iframe>.
 *  3. Listen for `postMessage` from Polar origins for the lifecycle
 *     events the embed publishes: `loaded`, `confirmed`, `success`.
 *     On `success` with `redirect: true` we navigate the parent
 *     window to the server-supplied success URL.
 *
 * Why not the headless `<CheckoutForm>` React kit
 * ------------------------------------------------
 * `@polar-sh/checkout/components` (tested through 0.3.0) ships
 * chunks that wrap a CJS `require("react")` in a runtime factory.
 * Pure-ESM Vite leaves the inner require untouched; the browser
 * crashes with "require is not defined" the moment <CheckoutForm>
 * mounts. Neither `optimizeDeps.include` nor `ssr.noExternal` could
 * rewrite the runtime require — it's an upstream Polar packaging
 * issue. Revisit when Polar ships proper ESM chunks, or jump
 * straight to a custom Stripe-Elements implementation (Polar
 * exposes the underlying `payment_processor_metadata` so the same
 * Polar Checkout Session can drive a hand-rolled card form).
 */
type Tier = 'lifetime' | 'support'

type SessionResponse =
  | { ok: true; url: string; tier: Tier }
  | { ok: false; reason: string }

type Phase = 'creating' | 'mounted' | 'loaded' | 'confirmed' | 'success' | 'error'

interface Props {
  tier: Tier
  /** Promo code typed by the visitor on the /checkout page promo field.
   *  Forwarded to the session-create endpoint; overrides the silent
   *  ZENMODE auto-apply for that one click. */
  discountCode?: string
  /** Light or dark theme handoff to Polar. Matches washi page tone by
   *  default. */
  theme?: 'light' | 'dark'
}

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
          // NOTE: we used to append `?discount_code=ZENMODE` here as a
          // belt-and-braces "auto-apply" path, but live testing against
          // Polar's hosted checkout proved the query param is NOT honoured
          // (the iframe quotes full price regardless). The discount is now
          // attached server-side via `discount_id` (UUID) at session
          // creation time — see `api/checkout-session.ts` and `api/_polar.ts`.
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
          <p className="mt-1 font-mono text-[11px] text-nezumi">{errorReason}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => location.reload()}
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

  // `min-h-[760px]` on the wrapper reserves the iframe's eventual
  // height EVEN BEFORE the session URL resolves. Without it the
  // wrapper collapses to zero height in the `creating` phase (the
  // iframe is the only child with intrinsic height + it's
  // conditionally rendered), so the absolutely-positioned loader
  // had nothing to fill — it floated up and overlapped the trust
  // badges + footer below. Reserving the height up front pins the
  // page layout in place so nothing below jumps when the iframe
  // finally mounts.
  return (
    <div className="relative min-h-[760px] rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)]">
      {phase !== 'loaded' && phase !== 'success' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md"
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
          allow="payment *; publickey-credentials-get *"
          loading="eager"
          // Border + bg moved up to the wrapper so the loader sits
          // on the same surface regardless of iframe state. The
          // iframe itself stays transparent until it paints.
          className="block w-full min-h-[760px] rounded-md"
        />
      )}

      <noscript>
        <p className="mt-3 text-center text-[0.875rem] text-sumi-soft">
          {t('checkout.inline.noscript')}
        </p>
      </noscript>
    </div>
  )
}
