import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Mail,
  RefreshCw,
} from 'lucide-react'
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
 *  4. Fetch /api/checkout/[id] and act on the response:
 *       - ready                 → key present, click-to-reveal panel
 *       - hard expired (410)    → outside the 15-min server window or
 *                                 upstream failed; fall back to the
 *                                 customer portal (no retry — the
 *                                 server has already given up)
 *       - provisioning          → order paid, key not yet exposed by
 *                                 Polar. We poll the API every
 *                                 POLL_INTERVAL_MS for up to
 *                                 POLL_BUDGET_MS total before giving
 *                                 the user a manual "check again"
 *                                 button. The card visible during the
 *                                 poll is the same ProvisioningCard
 *                                 with a quiet "checking…" indicator
 *                                 so they're not staring at a static
 *                                 message.
 *       - polled-out            → we polled for the full budget and
 *                                 Polar still hadn't returned a key.
 *                                 Surface the email fallback + a
 *                                 "Check again" button so they can
 *                                 trigger another round without
 *                                 reloading the page.
 *
 * Every card shows the order id at the top so the buyer always has
 * something concrete to quote in support.
 */

// How often to re-hit /api/checkout/[id] while the order is in the
// provisioning state. 3 s is a comfortable middle ground: tight enough
// that a key landing 6–9 s after checkout still feels instant, slack
// enough that we're not hammering Polar through our own API.
const POLL_INTERVAL_MS = 3000

// How long to keep auto-polling before handing the wheel back to the
// user. 30 s covers the vast majority of Polar's benefit-grant lag
// without making the page feel stuck. After this we show a "Check
// again" button so the user can keep going manually.
const POLL_BUDGET_MS = 30_000

export function LicenseRevealCard({
  checkoutId: _checkoutIdProp,
}: {
  checkoutId?: string | undefined
}) {
  const [state, setState] = useState<DeliveryState>({ phase: 'loading' })
  const startedRef = useRef(false)
  // Remembered so the "Check again" button can restart polling after
  // history.replaceState has already stripped the query string.
  const checkoutIdRef = useRef<string | null>(null)
  // Handle to whichever poll runner is currently in flight, so we can
  // cancel it on unmount or before kicking off a manual recheck.
  const cancelRef = useRef<(() => void) | null>(null)

  const startPolling = useCallback((checkoutId: string) => {
    // If a previous runner is still alive (manual recheck during a
    // pending fetch, StrictMode double-invocation, etc.), cancel it
    // first so callbacks from the old one can't race the new state.
    cancelRef.current?.()

    let cancelled = false
    let timeoutId: number | undefined
    const pollStart = Date.now()

    cancelRef.current = () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }

    setState({ phase: 'loading' })

    const attempt = async (): Promise<void> => {
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

        // Hard server-side expiry (15-min window passed OR the upstream
        // call completely failed). No point retrying.
        if (res.status === 410 || data.expired) {
          setState({ phase: 'expired', orderId, customerPortalUrl })
          return
        }

        const licenseKey = String(data.licenseKey ?? '').trim()
        if (licenseKey) {
          setState({
            phase: 'ready',
            licenseKey,
            orderId,
            customerEmail,
            customerPortalUrl,
          })
          return
        }

        // Provisioning — Polar hasn't surfaced the key yet. Decide
        // whether to keep auto-polling or hand the wheel to the user.
        const elapsed = Date.now() - pollStart
        if (elapsed >= POLL_BUDGET_MS) {
          setState({
            phase: 'polled-out',
            orderId,
            customerEmail,
            customerPortalUrl,
          })
          return
        }

        // Update the visible card to the provisioning state (so it
        // stops showing "Preparing your key…" forever) and schedule
        // the next attempt.
        setState({
          phase: 'provisioning',
          orderId,
          customerEmail,
          customerPortalUrl,
        })
        timeoutId = window.setTimeout(attempt, POLL_INTERVAL_MS)
      } catch {
        // Network failure, JSON parse blow-up, anything else: degrade
        // to the safe portal fallback rather than spinning forever.
        if (!cancelled) {
          setState({
            phase: 'expired',
            orderId: null,
            customerPortalUrl: CUSTOMER_PORTAL_URL,
          })
        }
      }
    }

    attempt()
  }, [])

  // Bound to the polled-out card's "Check again" button. Re-uses the
  // cached checkoutId so the user doesn't have to reload the page.
  const recheck = useCallback(() => {
    const id = checkoutIdRef.current
    if (!id) return
    startPolling(id)
  }, [startPolling])

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

    checkoutIdRef.current = checkoutId
    const { pathname } = window.location
    window.history.replaceState({}, '', pathname)

    startPolling(checkoutId)

    return () => {
      cancelRef.current?.()
    }
  }, [startPolling])

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
        {state.phase === 'polled-out' && (
          <PolledOutCard
            orderId={state.orderId}
            customerEmail={state.customerEmail}
            customerPortalUrl={state.customerPortalUrl}
            onRecheck={recheck}
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
      phase: 'polled-out'
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
    <div
      className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-24px_rgba(28,26,23,0.18)]"
      role="status"
      aria-live="polite"
    >
      <OrderIdLine orderId={orderId} />
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
        <Clock className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.8} />
        Key on its way
      </p>
      <h2 className="display-title mt-2 text-xl font-semibold text-sumi">
        Polar is finishing the paperwork.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
        Your license key
        {customerEmail ? (
          <>
            {' '}
            is being generated and emailed to{' '}
            <span className="font-semibold text-sumi">{customerEmail}</span>
          </>
        ) : (
          ' is being generated and emailed to you'
        )}
        . We're rechecking every few seconds and will reveal it the moment
        it lands.
      </p>
      {/* Subtle live-pulse so the card visibly belongs to a running
          process rather than a frozen static message. */}
      <div className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-nezumi">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-hinomaru animate-pulse"
        />
        Checking…
      </div>
      <div className="mt-4">
        <a
          href={customerPortalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] text-sumi-soft underline-offset-4 hover:text-sumi hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.6} />
          Customer portal
        </a>
      </div>
    </div>
  )
}

function PolledOutCard({
  orderId,
  customerEmail,
  customerPortalUrl,
  onRecheck,
}: {
  orderId: string | null
  customerEmail: string | null
  customerPortalUrl: string
  onRecheck: () => void
}) {
  const [busy, setBusy] = useState(false)

  function handleRecheck() {
    if (busy) return
    setBusy(true)
    onRecheck()
    // The parent flips state via setState; this local flag just guards
    // against double-firing while React queues the next render.
    window.setTimeout(() => setBusy(false), 600)
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-24px_rgba(28,26,23,0.18)]">
      <OrderIdLine orderId={orderId} />
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
        <Mail className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.8} />
        Check your email
      </p>
      <h2 className="display-title mt-2 text-xl font-semibold text-sumi">
        Polar's still finishing up.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sumi-soft">
        We checked for 30 seconds and Polar hasn't returned the key yet.
        It usually lands within a minute, so the safest place to look
        right now is your inbox
        {customerEmail ? (
          <>
            {' '}
            (
            <span className="font-semibold text-sumi">{customerEmail}</span>,
            spam too)
          </>
        ) : (
          ' (and the spam folder)'
        )}
        . You can also try one more check, or open the customer portal
        where the key lives permanently.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleRecheck}
          disabled={busy}
          className="btn-sumi inline-flex h-10 items-center gap-2 rounded-md px-5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`}
            strokeWidth={1.8}
          />
          Check again
        </button>
        <a
          href={customerPortalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-5 text-[13px] font-medium text-sumi transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)]"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
          Open customer portal
        </a>
      </div>
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
