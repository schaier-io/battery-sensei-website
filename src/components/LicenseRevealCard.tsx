import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, KeyRound } from 'lucide-react'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

/**
 * Click-to-reveal license key card. Mounted above the bow video on the
 * /thanks/* pages.
 *
 * Lifecycle
 * ---------
 *  1. Mount with a `checkoutId` from Polar's `success_url` query param.
 *  2. Fetch /api/checkout/[id] server-side (Polar token never reaches
 *     the bundle).
 *  3. While in flight → quiet loading placeholder.
 *  4. On success → "Reveal your license key" button. Click animates a
 *     slide-down panel with the key, Copy button, activation steps.
 *  5. On 410 / failure → fallback card pointing at the Polar customer
 *     portal (the key always lives there).
 *  6. Either way, the card emails the key in parallel via Polar.
 *
 * Privacy
 * -------
 * The page itself sets robots:noindex + referrer:no-referrer at the
 * route level. This component additionally strips the `checkout_id`
 * query from window.location via `history.replaceState` on mount so
 * the URL doesn't propagate through history-sync, screenshots, or any
 * accidental sharing.
 */
export function LicenseRevealCard({
  checkoutId: _checkoutIdProp,
}: {
  checkoutId?: string | undefined
}) {
  // Default to `loading` so the card slot is always *visible* during
  // hydration. We don't trust the prop / SSR-derived value here — we
  // read window.location.search inside the effect and decide on the
  // client. That avoids two failure modes that hid this card in
  // production before:
  //   1. SSR rendered with checkoutId=undefined (search not parsed yet)
  //      → ref-snapshot locked the state at `missing` → returned null
  //      → reveal card never appeared even though Polar provided the
  //         id in the URL.
  //   2. TanStack's useSearch re-firing after our history.replaceState
  //      could tear down the in-flight fetch.
  // Reading the URL directly + a one-shot ref sidesteps both.
  const [state, setState] = useState<DeliveryState>({ phase: 'loading' })
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const checkoutId = params.get('checkout_id')?.trim() ?? ''

    if (!checkoutId) {
      setState({ phase: 'missing' })
      return
    }

    // Strip checkout_id (and any other params) from the visible URL so
    // it doesn't propagate via history-sync, screenshots, or accidental
    // sharing. Route stays at its canonical path.
    const { pathname } = window.location
    window.history.replaceState({}, '', pathname)

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/checkout/${encodeURIComponent(checkoutId)}`,
          {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          },
        )
        if (cancelled) return
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >
        if (res.status === 410 || data.expired) {
          setState({
            phase: 'expired',
            customerPortalUrl:
              (data.customerPortalUrl as string) ?? CUSTOMER_PORTAL_URL,
          })
          return
        }
        const licenseKey = String(data.licenseKey ?? '').trim()
        if (!licenseKey) {
          setState({
            phase: 'expired',
            customerPortalUrl:
              (data.customerPortalUrl as string) ?? CUSTOMER_PORTAL_URL,
          })
          return
        }
        setState({
          phase: 'ready',
          licenseKey,
          customerEmail: (data.customerEmail as string) ?? null,
          customerPortalUrl:
            (data.customerPortalUrl as string) ?? CUSTOMER_PORTAL_URL,
        })
      } catch {
        if (!cancelled) {
          setState({
            phase: 'expired',
            customerPortalUrl: CUSTOMER_PORTAL_URL,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // No `checkout_id` in the URL at all — render nothing so the page
  // still works as a generic thank-you (legacy links, support resends).
  // The downstream LicenseDelivery card still covers the "find your
  // key" story in that case.
  if (state.phase === 'missing') return null

  return (
    <section
      aria-label="License key delivery"
      className="mx-auto max-w-2xl px-5 pb-2 pt-10 sm:px-6 md:pt-12"
    >
      <div className="mx-auto w-full max-w-[440px]">
        {state.phase === 'loading' && <LoadingCard />}
        {state.phase === 'expired' && (
          <ExpiredCard customerPortalUrl={state.customerPortalUrl} />
        )}
        {state.phase === 'ready' && (
          <ReadyCard
            licenseKey={state.licenseKey}
            customerEmail={state.customerEmail}
            customerPortalUrl={state.customerPortalUrl}
          />
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

type DeliveryState =
  | { phase: 'loading' }
  | { phase: 'missing' }
  | {
      phase: 'ready'
      licenseKey: string
      customerEmail: string | null
      customerPortalUrl: string
    }
  | { phase: 'expired'; customerPortalUrl: string }

function LoadingCard() {
  return (
    <div
      className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]"
      role="status"
      aria-live="polite"
    >
      <p className="text-[12px] uppercase tracking-[0.22em] text-sumi-soft">
        Preparing your key
      </p>
      <div className="mt-4 mx-auto h-1 w-24 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--sumi)_10%,var(--washi-soft))]">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-hinomaru/70" />
      </div>
    </div>
  )
}

function ExpiredCard({ customerPortalUrl }: { customerPortalUrl: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-24px_rgba(28,26,23,0.18)]">
      <p className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
        <KeyRound className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.8} />
        License delivery
      </p>
      <h2 className="display-title mt-3 text-xl font-semibold text-sumi">
        This delivery window has closed.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
        Your key has either been revealed already or the 15-minute window
        has passed. It is permanently available in the customer portal,
        signed in with the email you used at checkout.
      </p>
      <a
        href={customerPortalUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-sumi mt-5 inline-flex h-10 items-center gap-2 rounded-md px-5 text-[13px] font-medium"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
        Find my key in the portal
      </a>
    </div>
  )
}

function ReadyCard({
  licenseKey,
  customerEmail,
  customerPortalUrl,
}: {
  licenseKey: string
  customerEmail: string | null
  customerPortalUrl: string
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard API unavailable — let the user select-all instead */
    }
  }

  return (
    <div className="relative">
      {/* Reveal trigger — disappears once clicked. */}
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="group relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-22px_rgba(28,26,23,0.20)] transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
        >
          <span
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                'radial-gradient(80% 60% at 50% 30%, color-mix(in oklab, var(--kin) 18%, transparent) 0%, transparent 70%)',
            }}
          />
          <KeyRound
            className="mx-auto h-7 w-7 text-hinomaru"
            strokeWidth={1.6}
            aria-hidden
          />
          <p className="display-title mt-3 text-xl font-semibold text-sumi">
            Reveal your license key
          </p>
          <p className="mt-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft">
            One tap. Shown once on this device.
          </p>
        </button>
      )}

      {/* The revealed key panel — slides + fades in from below. */}
      <div
        data-revealed={revealed ? 'true' : 'false'}
        className="license-reveal"
        aria-hidden={!revealed}
      >
        <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-6 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-22px_rgba(28,26,23,0.18)]">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
            <KeyRound className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.8} />
            License key
          </p>
          <div className="mt-3 flex items-stretch gap-2">
            <code
              className="flex-1 min-w-0 select-all rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-3 py-2.5 font-mono text-[13px] leading-tight tracking-[0.04em] text-sumi"
              style={{ wordBreak: 'break-all' }}
            >
              {licenseKey || '—'}
            </code>
            <button
              type="button"
              onClick={copy}
              className="btn-sumi inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium shrink-0"
              aria-label="Copy license key"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Copy
                </>
              )}
            </button>
          </div>

          <ol className="mt-5 space-y-1.5 text-[13px] leading-relaxed text-sumi-soft">
            <li>
              <span className="text-sumi font-semibold">1.</span> Open
              Battery Sensei in your menu bar.
            </li>
            <li>
              <span className="text-sumi font-semibold">2.</span> Open{' '}
              <span className="text-sumi">Sensei → Activate Premium</span>.
            </li>
            <li>
              <span className="text-sumi font-semibold">3.</span> Paste the
              key above. Sensei activates and unlocks Premium.
            </li>
          </ol>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] text-sumi-soft">
            {customerEmail ? (
              <span>
                Also sent to{' '}
                <span className="font-semibold text-sumi">
                  {customerEmail}
                </span>
              </span>
            ) : (
              <span>Also sent to your email.</span>
            )}
            <a
              href={customerPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-sumi hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.6} />
              Customer portal
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
