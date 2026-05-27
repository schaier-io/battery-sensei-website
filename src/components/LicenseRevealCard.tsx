import { useEffect, useRef, useState } from 'react'
import { Check, Clock, Copy, ExternalLink, KeyRound, Mail } from 'lucide-react'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

/**
 * Click-to-reveal license key card. Mounted above the bow video on the
 * /thanks/* pages.
 *
 * Lifecycle
 * ---------
 *  1. Mount, state = loading.
 *  2. Read `checkout_id` from window.location.search (client only).
 *  3. Strip the query via history.replaceState so the URL doesn't leak.
 *  4. Fetch /api/checkout/[id] (server hits Polar with org token).
 *  5. Switch to one of three terminal states:
 *       - ready        — key present, click-to-reveal panel
 *       - provisioning — order paid, key not yet exposed by Polar;
 *                        show "on its way to your inbox" with order id
 *       - expired      — outside the 15-min window or upstream failed;
 *                        fall back to the customer portal
 *
 * Every card shows the order id at the top so the buyer always has
 * something concrete to quote in support.
 */
export function LicenseRevealCard({
  checkoutId: _checkoutIdProp,
}: {
  checkoutId?: string | undefined
}) {
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
        const orderId = (data.orderId as string) ?? null
        const customerEmail = (data.customerEmail as string) ?? null
        const customerPortalUrl =
          (data.customerPortalUrl as string) ?? CUSTOMER_PORTAL_URL

        if (res.status === 410 || data.expired) {
          setState({
            phase: 'expired',
            orderId,
            customerPortalUrl,
          })
          return
        }
        if (data.provisioning) {
          setState({
            phase: 'provisioning',
            orderId,
            customerEmail,
            customerPortalUrl,
          })
          return
        }
        const licenseKey = String(data.licenseKey ?? '').trim()
        if (!licenseKey) {
          setState({
            phase: 'provisioning',
            orderId,
            customerEmail,
            customerPortalUrl,
          })
          return
        }
        setState({
          phase: 'ready',
          licenseKey,
          orderId,
          customerEmail,
          customerPortalUrl,
        })
      } catch {
        if (!cancelled) {
          setState({
            phase: 'expired',
            orderId: null,
            customerPortalUrl: CUSTOMER_PORTAL_URL,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (state.phase === 'missing') return null

  return (
    <section
      aria-label="License key delivery"
      className="mx-auto max-w-2xl px-5 pb-2 pt-10 sm:px-6 md:pt-12"
    >
      <div className="mx-auto w-full max-w-[440px]">
        {state.phase === 'loading' && <LoadingCard />}
        {state.phase === 'expired' && (
          <ExpiredCard
            orderId={state.orderId}
            customerPortalUrl={state.customerPortalUrl}
          />
        )}
        {state.phase === 'provisioning' && (
          <ProvisioningCard
            orderId={state.orderId}
            customerEmail={state.customerEmail}
            customerPortalUrl={state.customerPortalUrl}
          />
        )}
        {state.phase === 'ready' && (
          <ReadyCard
            licenseKey={state.licenseKey}
            orderId={state.orderId}
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
      orderId: string | null
      customerEmail: string | null
      customerPortalUrl: string
    }
  | {
      phase: 'provisioning'
      orderId: string | null
      customerEmail: string | null
      customerPortalUrl: string
    }
  | {
      phase: 'expired'
      orderId: string | null
      customerPortalUrl: string
    }

/** Compact, tracked order-id chip rendered at the top of every state.
 *  Gives the buyer something concrete to quote in support regardless of
 *  the delivery branch they ended up on. */
function OrderIdLine({ orderId }: { orderId: string | null }) {
  if (!orderId) return null
  return (
    <p className="text-center text-[10px] uppercase tracking-[0.18em] text-nezumi">
      Order <span className="font-mono normal-case tracking-[0.04em] text-sumi-soft">#{orderId}</span>
    </p>
  )
}

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

function ProvisioningCard({
  orderId,
  customerEmail,
  customerPortalUrl,
}: {
  orderId: string | null
  customerEmail: string | null
  customerPortalUrl: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-24px_rgba(28,26,23,0.18)]">
      <OrderIdLine orderId={orderId} />
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
        <Clock className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.8} />
        Key on its way
      </p>
      <h2 className="display-title mt-2 text-xl font-semibold text-sumi">
        Polar is finishing the paperwork.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
        Your license key{customerEmail ? <> is being sent to <span className="font-semibold text-sumi">{customerEmail}</span> right now</> : ' is being generated and emailed to you right now'}.
        Usually within a minute. You can refresh this page — or open the
        customer portal where it lives permanently.
      </p>
      <a
        href={customerPortalUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-5 text-[13px] font-medium text-sumi transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)]"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
        Open customer portal
      </a>
    </div>
  )
}

function ExpiredCard({
  orderId,
  customerPortalUrl,
}: {
  orderId: string | null
  customerPortalUrl: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-24px_rgba(28,26,23,0.18)]">
      <OrderIdLine orderId={orderId} />
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
        <KeyRound className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.8} />
        License delivery
      </p>
      <h2 className="display-title mt-2 text-xl font-semibold text-sumi">
        Check your email for the key.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
        Polar emailed your license key to the address you used at
        checkout when the order completed (worth a peek in spam if it's
        not in the inbox). It also lives permanently in the customer
        portal, signed in with the same email.
      </p>
      <a
        href={customerPortalUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-sumi mt-5 inline-flex h-10 items-center gap-2 rounded-md px-5 text-[13px] font-medium"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
        Open customer portal
      </a>
    </div>
  )
}

function ReadyCard({
  licenseKey,
  orderId,
  customerEmail,
  customerPortalUrl,
}: {
  licenseKey: string
  orderId: string | null
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
          <OrderIdLine orderId={orderId} />
          <KeyRound
            className="mx-auto mt-3 h-7 w-7 text-hinomaru"
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
          <OrderIdLine orderId={orderId} />
          <p className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
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
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.6} />
                Also sent to{' '}
                <span className="font-semibold text-sumi">
                  {customerEmail}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.6} />
                Also sent to your email.
              </span>
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
