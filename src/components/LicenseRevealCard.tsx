import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, KeyRound, Mail } from 'lucide-react'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

// How long each provisioning slogan stays on screen before the next
// one takes over. 3.4 s reads comfortably without becoming jittery.
//
// The slogan list itself lives in i18n (thanks.provisioning.slogans)
// so all five locales can phrase the wait in voice — see the locale
// files for the craft-step progression (paperwork → ink → polish →
// wax → seal → final stroke → resting). The list does NOT loop: once
// we reach the final line we stop rotating and let it sit. Looping
// would tell the truth ("we're still waiting") in a way that undoes
// the progress feeling we just built.
const SLOGAN_INTERVAL_MS = 3400

// Hardcoded fallback used only when the locale somehow ships without
// the slogan array (broken JSON, mid-deploy gap, etc.) so the card
// never renders an empty headline.
const FALLBACK_SLOGAN = 'Polar is preparing the paperwork.'

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
 *       - provisioning          → order paid, key not yet exposed by
 *                                 Polar. We poll the API every
 *                                 POLL_INTERVAL_MS until either the
 *                                 key arrives or the server tells us
 *                                 the window has passed (410). No
 *                                 manual recheck — the loop runs for
 *                                 the full server-side 15-min
 *                                 freshness window.
 *       - hard expired (410)    → outside the 15-min server window or
 *                                 upstream failed; show the email
 *                                 fallback and stop polling. Terminal.
 *
 * Every card shows the order id at the top so the buyer always has
 * something concrete to quote in support.
 */

// How often to re-hit /api/checkout/[id] while the order is in the
// provisioning state. 10 s is slack enough to not hammer Polar through
// our own API across the full 15-minute window (~90 calls worst case)
// and tight enough that a key landing partway through still feels
// near-instant on the page.
const POLL_INTERVAL_MS = 10_000

export function LicenseRevealCard({
  checkoutId: checkoutIdProp,
}: {
  /** Optional — when the parent already pulled the id off the URL and
   *  stripped the query string, pass it in here so the card doesn't
   *  have to re-read window.location. The card falls back to reading
   *  the URL itself when no prop is given (legacy callers). */
  checkoutId?: string | undefined
}) {
  const [state, setState] = useState<DeliveryState>({ phase: 'loading' })
  const startedRef = useRef(false)
  // Handle to whichever poll runner is currently in flight, so we can
  // cancel it on unmount.
  const cancelRef = useRef<(() => void) | null>(null)

  const startPolling = useCallback((checkoutId: string) => {
    // Cancel any prior runner so its callbacks can't race the new state
    // (StrictMode double-invocation, etc.).
    cancelRef.current?.()

    let cancelled = false
    let timeoutId: number | undefined

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

        // Hard server-side expiry: 15-min window passed OR upstream
        // call completely failed. Terminal — stop polling and show the
        // email fallback.
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

        // Provisioning — Polar hasn't surfaced the key yet. Update the
        // visible card (so it stops showing the initial "Preparing
        // your key…" loader) and schedule the next poll. We keep
        // looping until the server returns either a key or a 410; the
        // 410 ends the loop naturally at the 15-min mark.
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

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (typeof window === 'undefined') return

    // Prefer the prop the parent handed us. Falls back to reading the
    // URL ourselves — useful when the card is mounted by a caller that
    // hasn't already parsed the success-redirect query.
    let checkoutId = (checkoutIdProp ?? '').trim()
    if (!checkoutId) {
      const params = new URLSearchParams(window.location.search)
      checkoutId = params.get('checkout_id')?.trim() ?? ''
    }

    if (!checkoutId) {
      setState({ phase: 'missing' })
      return
    }

    // Strip the query string regardless of where the id came from, so
    // a back/forward navigation or a copied URL can never leak the
    // checkout id again.
    if (window.location.search) {
      const { pathname } = window.location
      window.history.replaceState({}, '', pathname)
    }

    startPolling(checkoutId)

    return () => {
      cancelRef.current?.()
    }
  }, [checkoutIdProp, startPolling])

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
  const { t } = useTranslation()

  // Pull the slogan list out of i18n once per render. `returnObjects`
  // hands back the raw array; we defensively normalize anything weird
  // (missing key, wrong shape, empty array) back to a single-line
  // fallback so the card never blanks out the headline.
  const slogans = useMemo<readonly string[]>(() => {
    const raw = t('thanks.provisioning.slogans', { returnObjects: true })
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter((s): s is string => typeof s === 'string')
    }
    return [FALLBACK_SLOGAN]
  }, [t])

  // Walk through the slogan list once, then stop on the final line.
  // Re-renders the headline with a new React key on every step, which
  // re-fires the CSS fade animation. We use setTimeout-per-step rather
  // than setInterval so the loop can self-terminate at the last index
  // without a `clearInterval` race.
  const [sloganIdx, setSloganIdx] = useState(0)
  useEffect(() => {
    if (sloganIdx >= slogans.length - 1) return
    const id = window.setTimeout(
      () => setSloganIdx((i) => i + 1),
      SLOGAN_INTERVAL_MS,
    )
    return () => window.clearTimeout(id)
  }, [sloganIdx, slogans.length])

  return (
    <div
      className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-6 py-7 text-center shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_50px_-24px_rgba(28,26,23,0.18)]"
      role="status"
      aria-live="polite"
    >
      <OrderIdLine orderId={orderId} />

      {/* Zen enso spinner + tiny tracked label. Sits between the order
          line and the rotating slogan as the card's visual anchor —
          the eye lands on it first and reads "something is happening"
          before the words register. */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <ZenSpinner />
        <p className="text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.provisioning.kicker')}
        </p>
      </div>

      {/* Rotating slogan. The `key` change makes React unmount + remount
          the span, re-firing the .zen-slogan fade-in keyframe. Min
          height holds the line so the surrounding text doesn't jump
          when a longer slogan rotates in. */}
      <h2
        className="display-title mt-3 text-xl font-semibold text-sumi"
        style={{ minHeight: '1.6em' }}
      >
        <span key={sloganIdx} className="zen-slogan inline-block">
          {slogans[sloganIdx] ?? FALLBACK_SLOGAN}
        </span>
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-sumi-soft">
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
        it lands. If nothing arrives, your inbox is the safe fallback.
      </p>

      <div className="mt-5">
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

/**
 * Zen enso spinner. A thin circular brush arc rotating slowly, with
 * a subtle gold (kin) accent fading into a deeper sumi at the tail
 * end — echoes the ChargeRing in the hero. Background ring is the
 * site's faint line color so the rotating arc reads as ink on paper
 * rather than as a hard loader.
 *
 * Two-layer rendering:
 *   1. Static faint full circle — the "paper" the brush draws on.
 *   2. Animated stroked arc — the brush itself, rotated by CSS.
 *
 * Linecap is round so the leading and trailing ends taper softly
 * rather than ending in geometric caps. The dash pattern (60/88)
 * exposes ~40% of the circumference as inked.
 */
function ZenSpinner() {
  return (
    <svg
      role="presentation"
      aria-hidden
      viewBox="0 0 40 40"
      className="h-8 w-8"
    >
      <defs>
        <linearGradient
          id="zen-spinner-grad"
          x1="100%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          {/* Tail of the brushstroke — transparent so the ink fades
              into the paper rather than starting hard. */}
          <stop offset="0%" stopColor="var(--sumi)" stopOpacity="0" />
          <stop offset="55%" stopColor="var(--sumi)" stopOpacity="0.55" />
          {/* Leading edge — a hint of hinomaru red so the brush has a
              clear direction of travel without becoming a "loading
              spinner" cliché. */}
          <stop offset="100%" stopColor="var(--hinomaru)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {/* Faint "paper" circle — same value as the site's --line so it
          almost disappears against the washi background. */}
      <circle
        cx="20"
        cy="20"
        r="14.5"
        fill="none"
        stroke="var(--line)"
        strokeWidth="1"
      />
      {/* Animated arc. strokeDasharray + offset exposes ~40% of the
          circumference; CSS class spins the whole element. */}
      <circle
        className="zen-spinner"
        cx="20"
        cy="20"
        r="14.5"
        fill="none"
        stroke="url(#zen-spinner-grad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="38 100"
      />
    </svg>
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
