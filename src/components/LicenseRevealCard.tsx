import { useCallback, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Download as DownloadIcon } from 'lucide-react'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'
import { storeLicenseKey } from '#/lib/board-license'
import {
  DeliveryStrip,
  type DeliveryState,
} from '#/components/LicenseDeliveryStrip'

/**
 * Composite post-purchase delivery card. Mounted on /thanks/lifetime and
 * /thanks/support after the bow video plays out.
 *
 * Composition
 * -----------
 * One card, two surfaces, hairline between them:
 *
 *   ┌─────────────────────────────────────────┐
 *   │  ORDER #...                             │
 *   │  装 INSTALL SENSEI                       │
 *   │  Get the build, drop your key into …    │
 *   │  [Download for macOS]   ← primary CTA   │
 *   │  ──────────── hairline ────────────     │
 *   │  ◔ KEY ON ITS WAY · email               │
 *   │  Holding the brush steady.              │
 *   │  Customer portal →                      │
 *   └─────────────────────────────────────────┘
 *
 * The top section is always Install — including when there is no
 * `checkout_id` at all. Someone who bookmarked this page, reopened it
 * from history, or lost the query string to a redirect has still paid,
 * and must still be able to download the app, learn where their key is
 * and reach the customer portal. Only the bottom strip depends on the
 * id; its states live in LicenseDeliveryStrip.
 *
 * Lifecycle
 * ---------
 *   1. Mount, state = loading.
 *   2. Read checkout_id (prop > URL) and strip the query. No id →
 *      phase 'missing' and the strip points at the inbox.
 *   3. Poll /api/checkout/[id] every POLL_INTERVAL_MS until either the
 *      key arrives (ready), the server's freshness window closes
 *      (410 → expired), or POLL_TIMEOUT_MS passes with neither
 *      (→ timeout). No manual retry: the loop runs itself, and when it
 *      gives up it hands over a recovery instead of a spinner.
 */

const POLL_INTERVAL_MS = 10_000

// How long the loop may sit on "preparing your key" before it stops and
// shows a recovery. A healthy Polar grant lands on the first or second
// poll; past ~25 s the id is almost certainly stale or mistyped, and an
// endless spinner at the highest-anxiety moment of the funnel is worse
// than an honest "here is where your key is".
const POLL_TIMEOUT_MS = 25_000

// Minimum wait before flipping the strip to the key reveal, even when
// Polar returns the key on the first poll. With the bow-video buffer
// the API call usually lands ready, but a hard cut from "preparing"
// to a fully revealed key reads as a glitch. Holding for ~4 s lets
// the spinner spin and at least two slogans cycle so the reveal
// feels earned, not snatched away from the spinner.
const MIN_HOLD_MS = 4000

export function LicenseRevealCard({
  checkoutId: checkoutIdProp,
  onOrderId,
}: {
  /** Optional — when the parent already pulled the id off the URL and
   *  stripped the query string, pass it in here so the card doesn't
   *  have to re-read window.location. The card falls back to reading
   *  the URL itself when no prop is given (legacy callers). */
  checkoutId?: string | undefined
  /** Optional callback fired once the polling resolves an order id
   *  (and again if the order id ever changes for the same checkout,
   *  which shouldn't happen but the guard is cheap). Used by the
   *  thank-you page to surface the order id in the hero area, not
   *  just inside the card header. */
  onOrderId?: (orderId: string) => void
}) {
  const { t } = useTranslation()
  const [state, setState] = useState<DeliveryState>({ phase: 'loading' })
  // Checkout id resolved on the first effect run. Held in a ref because
  // that same run strips the query string, so any later run (React's
  // development double-mount, a Fast Refresh remount) can no longer
  // read the id off the URL.
  const resolvedIdRef = useRef<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const startPolling = useCallback((checkoutId: string) => {
    cancelRef.current?.()

    let cancelled = false
    // Flips once the loop reaches a terminal state (ready, expired or
    // timeout). Guards every deferred callback so a late poll or the
    // give-up timer can't overwrite a state already on screen.
    let settled = false
    let timeoutId: number | undefined
    let holdTimeoutId: number | undefined
    let giveUpTimeoutId: number | undefined
    const pollStart = Date.now()

    // Last order id / portal URL seen on the wire, so the timeout
    // recovery can name the buyer's own portal rather than the generic
    // one whenever the API answered at least once.
    let lastOrderId: string | null = null
    let lastPortalUrl = CUSTOMER_PORTAL_URL

    cancelRef.current = () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (holdTimeoutId !== undefined) window.clearTimeout(holdTimeoutId)
      if (giveUpTimeoutId !== undefined) window.clearTimeout(giveUpTimeoutId)
    }

    setState({ phase: 'loading' })

    /** Flip to the ready state, deferring if we're still inside the
     *  minimum hold window. While deferred we sit in the provisioning
     *  state (with the real customer/order data already attached) so
     *  the spinner + slogan rotator keep playing and the reveal lands
     *  as a clean cross-fade rather than a snap. */
    const flipToReady = (
      ready: Extract<DeliveryState, { phase: 'ready' }>,
    ): void => {
      if (cancelled) return
      settled = true
      const elapsed = Date.now() - pollStart
      if (elapsed >= MIN_HOLD_MS) {
        setState(ready)
        return
      }
      setState({
        phase: 'provisioning',
        orderId: ready.orderId,
        customerEmail: ready.customerEmail,
        customerPortalUrl: ready.customerPortalUrl,
      })
      holdTimeoutId = window.setTimeout(() => {
        if (!cancelled) setState(ready)
      }, MIN_HOLD_MS - elapsed)
    }

    // Hard stop on the wait. Runs on its own clock rather than off the
    // poll cadence, so the wait ends at POLL_TIMEOUT_MS no matter how
    // an in-flight request behaves.
    giveUpTimeoutId = window.setTimeout(() => {
      if (cancelled || settled) return
      settled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      setState({
        phase: 'timeout',
        orderId: lastOrderId,
        customerPortalUrl: lastPortalUrl,
      })
    }, POLL_TIMEOUT_MS)

    const attempt = async (): Promise<void> => {
      if (cancelled || settled) return
      try {
        const res = await fetch(
          `/api/checkout/${encodeURIComponent(checkoutId)}`,
          {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          },
        )
        if (cancelled || settled) return
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >
        const orderId = (data.orderId as string) ?? null
        const customerEmail = (data.customerEmail as string) ?? null
        const customerPortalUrl =
          (data.customerPortalUrl as string) ?? CUSTOMER_PORTAL_URL
        lastOrderId = orderId ?? lastOrderId
        lastPortalUrl = customerPortalUrl

        if (res.status === 410 || data.expired) {
          settled = true
          setState({ phase: 'expired', orderId, customerPortalUrl })
          return
        }

        const licenseKey = String(data.licenseKey ?? '').trim()
        if (licenseKey) {
          // Pre-arm feature-board voting: buyers landing from checkout
          // never have to re-enter their key on /roadmap.
          storeLicenseKey(licenseKey)
          flipToReady({
            phase: 'ready',
            licenseKey,
            orderId,
            customerEmail,
            customerPortalUrl,
          })
          return
        }

        setState({
          phase: 'provisioning',
          orderId,
          customerEmail,
          customerPortalUrl,
        })
        timeoutId = window.setTimeout(attempt, POLL_INTERVAL_MS)
      } catch {
        if (!cancelled && !settled) {
          settled = true
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

  // Effect is deliberately re-runnable. It used to bail out on a
  // `started` ref, which paired badly with its own cleanup: React
  // mounts, unmounts and remounts effects in development, so the first
  // run's cleanup cancelled the loop and the second run refused to
  // start a new one. The card then sat on "preparing your key" forever
  // no matter what the API answered. Resolving the id once and letting
  // every run restart the loop (startPolling cancels any predecessor)
  // makes a remount harmless.
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (resolvedIdRef.current === null) {
      let fromUrl = (checkoutIdProp ?? '').trim()
      if (!fromUrl) {
        const params = new URLSearchParams(window.location.search)
        fromUrl = params.get('checkout_id')?.trim() ?? ''
      }
      resolvedIdRef.current = fromUrl
      if (fromUrl && window.location.search) {
        const { pathname } = window.location
        window.history.replaceState({}, '', pathname)
      }
    }

    const checkoutId = resolvedIdRef.current
    if (!checkoutId) {
      setState({ phase: 'missing' })
      return
    }

    startPolling(checkoutId)

    return () => {
      cancelRef.current?.()
    }
  }, [checkoutIdProp, startPolling])

  // Surface the order id to the parent the moment polling resolves
  // one. Cached in a ref so we only call the parent's callback when
  // the id ACTUALLY changes (each re-render of the same state would
  // otherwise fire it). The callback ref pattern keeps the effect
  // closed over the latest callback identity without re-firing on
  // every parent render.
  const onOrderIdRef = useRef(onOrderId)
  onOrderIdRef.current = onOrderId
  const lastReportedOrderIdRef = useRef<string | null>(null)
  useEffect(() => {
    const id = orderIdOf(state)
    if (id && id !== lastReportedOrderIdRef.current) {
      lastReportedOrderIdRef.current = id
      onOrderIdRef.current?.(id)
    }
  }, [state])

  // Pull the order id out of the active state for the header chip.
  const orderId = orderIdOf(state)

  return (
    <section
      aria-label={t('thanks.delivery.label')}
      className="mx-auto max-w-2xl px-5 sm:px-6"
    >
      {/* Card frame mounts with a soft rise + scale (see
          .thanks-card-mount in styles.css). Internal sections layer
          their own staggered rises on top via inline animationDelay
          so the eye walks the card top → bottom rather than landing
          on everything at once. */}
      <div className="thanks-card-mount mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_30px_60px_-32px_rgba(28,26,23,0.22)]">
        <Header orderId={orderId} />
        <InstallSection />
        <Hairline />
        <DeliveryStrip
          state={state}
          t={t}
          checkoutEmailHint={
            state.phase === 'ready' || state.phase === 'provisioning'
              ? state.customerEmail
              : null
          }
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

/** Order id carried by whichever delivery state is active. Null for the
 *  two states that never had one: loading, and missing (no checkout id
 *  to look one up with). */
function orderIdOf(state: DeliveryState): string | null {
  return state.phase === 'ready' ||
    state.phase === 'provisioning' ||
    state.phase === 'expired' ||
    state.phase === 'timeout'
    ? state.orderId
    : null
}

// ─── Header ────────────────────────────────────────────────────────────────

/** Order id chip. Sits in the very top of the card so the buyer always
 *  has something concrete to quote in support, regardless of which
 *  delivery state they're looking at. Quiet typography — this is
 *  reference data, not a headline. First in the stagger sequence
 *  (120 ms after the card frame mounts). */
function Header({ orderId }: { orderId: string | null }) {
  // Always render the row — the order chip itself cross-fades in via
  // `data-ready` once polling resolves an order id. Mounting the same
  // box at all times keeps the card's top edge from jumping when the
  // order id eventually arrives mid-cycle (the "popin" buyers see when
  // the chip materializes after a few seconds of loading).
  const ready = Boolean(orderId)
  return (
    <div
      data-ready={ready ? 'true' : 'false'}
      className="thanks-section-rise relative flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 border-b border-[color-mix(in_oklab,var(--line)_60%,transparent)] px-5 py-2.5 sm:px-6 min-h-[2rem]"
      style={{ animationDelay: '120ms' }}
    >
      <div
        // `data-ready` flips when `orderId` becomes truthy; the chip
        // fades over 360ms so the order id appears like ink soaking
        // into paper rather than snapping into place.
        className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 transition-opacity duration-[360ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ opacity: ready ? 1 : 0 }}
        aria-hidden={!ready}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-nezumi">
          Order
        </span>
        <span aria-hidden className="text-nezumi/50">·</span>
        <code className="text-[10.5px] tracking-[0.02em] text-sumi-soft break-all license-mono">
          #{orderId ?? ' '.repeat(16)}
        </code>
      </div>
    </div>
  )
}

// ─── Install section (primary) ─────────────────────────────────────────────

/** Primary call to action. Install Sensei is what the buyer does NEXT
 *  regardless of whether the key has landed yet — they either have it
 *  in hand from the email or it's about to show up in the strip below.
 *  Either way, getting the app installed is the unblocking action. */
function InstallSection() {
  const { t } = useTranslation()
  return (
    <div className="px-5 pb-6 pt-5 sm:px-6 sm:pt-6">
      {/* Per-row stagger — kanji header → body → CTA → spam line.
          Each row carries its own animationDelay so the eye walks
          top-down rather than landing on the whole section at once. */}
      <div
        className="thanks-section-rise flex items-center gap-3"
        style={{ animationDelay: '240ms' }}
      >
        {/* 装 = "install / equip". Matches the kanji-seal vocabulary
            used elsewhere on the site (基 features, 価 pricing, 鍵 key). */}
        <span
          aria-hidden
          className="font-jp text-base leading-none text-hinomaru-ink/85 w-5 text-center"
        >
          装
        </span>
        <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.delivery.label')}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
        />
      </div>
      <p
        className="thanks-section-rise mt-3 text-[0.9375rem] leading-[1.6] text-sumi-soft"
        style={{ animationDelay: '320ms' }}
      >
        <Trans
          i18nKey="thanks.delivery.from"
          components={[
            <em className="font-display italic font-medium text-sumi" />,
          ]}
        />
      </p>
      {/* Step 1 — Download Sensei. Secondary visual weight so the
          downstream Activate CTA (step 2) wins the eye when the key
          eventually lands in the strip below. Outlined washi chip
          mirrors the secondary affordances elsewhere on /thanks and
          /checkout. */}
      <a
        href="/download/latest"
        className="thanks-section-rise group mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,var(--paper-lift))] px-5 text-[0.9375rem] font-medium text-sumi transition-[background-color,transform,box-shadow] duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:bg-[color-mix(in_oklab,var(--washi)_35%,var(--paper-lift))] hover:shadow-[0_4px_14px_-8px_rgba(28,26,23,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
        style={{ animationDelay: '400ms' }}
      >
        <DownloadIcon
          className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
          strokeWidth={1.8}
        />
        {t('thanks.delivery.downloadCta')}
      </a>
      <p
        className="thanks-section-rise mt-3 text-[12px] leading-[1.55] text-nezumi"
        style={{ animationDelay: '480ms' }}
      >
        <Trans
          i18nKey="thanks.delivery.spam"
          components={[
            <a
              href={`mailto:${t('thanks.delivery.supportEmail')}?subject=Install%20help`}
              className="font-medium text-sumi-soft underline decoration-[var(--line-strong)] underline-offset-[3px] hover:text-sumi hover:decoration-sumi transition-colors"
            />,
          ]}
        />
      </p>
    </div>
  )
}

// ─── Hairline ──────────────────────────────────────────────────────────────

/** Soft horizontal rule between install and delivery sections. Edges
 *  fade so it reads as a divider, not a sharp cut. Inset from the card
 *  edge so the surface still feels continuous. On mount it draws from
 *  center outward (.thanks-hairline-draw) so the eye reads the join
 *  forming, rather than a band appearing whole. */
function Hairline() {
  return (
    <div className="px-5 sm:px-6">
      <div
        className="thanks-hairline-draw h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent"
        style={{ animationDelay: '500ms' }}
      />
    </div>
  )
}
