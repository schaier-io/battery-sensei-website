import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Check,
  Copy,
  Download as DownloadIcon,
  ExternalLink,
  Mail,
} from 'lucide-react'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

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
 * The top section is always Install. The bottom strip is state-aware:
 *   loading      → small spinner + "Preparing your key"
 *   provisioning → spinner + rotating slogan + email + portal link
 *   ready        → license key + copy button + meta row
 *   expired      → "Check your email" with portal CTA
 *
 * The frame doesn't re-render between states; only the strip morphs.
 * Continuity carries the eye, so the buyer never sees "the page
 * changed" between waiting and key-arrives.
 *
 * Lifecycle
 * ---------
 *   1. Mount, state = loading.
 *   2. Read checkout_id (prop > URL) and strip the query.
 *   3. Poll /api/checkout/[id] every POLL_INTERVAL_MS until either
 *      the key arrives (ready) or the server's 15-min freshness
 *      window closes (410 → expired). No manual retry: the loop runs
 *      for the full server-side window so a slow Polar grant always
 *      lands on screen if it lands at all.
 */

const POLL_INTERVAL_MS = 10_000

// Rotating progress slogans for the wait. Each line names a small,
// concrete step so the wait reads as work being done rather than a
// stall. List does NOT loop — the last line is the resting state.
const SLOGAN_INTERVAL_MS = 3400

// Minimum wait before flipping the strip to the key reveal, even when
// Polar returns the key on the first poll. With the bow-video buffer
// the API call usually lands ready, but a hard cut from "preparing"
// to a fully revealed key reads as a glitch. Holding for ~4 s lets
// the spinner spin and at least two slogans cycle so the reveal
// feels earned, not snatched away from the spinner.
const MIN_HOLD_MS = 4000

// Fallback used only if the locale ships without the slogan array
// (broken JSON, mid-deploy gap, etc.) so the strip never blanks.
const FALLBACK_SLOGAN = 'Polar is preparing the paperwork.'

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
  const startedRef = useRef(false)
  const cancelRef = useRef<(() => void) | null>(null)

  const startPolling = useCallback((checkoutId: string) => {
    cancelRef.current?.()

    let cancelled = false
    let timeoutId: number | undefined
    let holdTimeoutId: number | undefined
    const pollStart = Date.now()

    cancelRef.current = () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (holdTimeoutId !== undefined) window.clearTimeout(holdTimeoutId)
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

        if (res.status === 410 || data.expired) {
          setState({ phase: 'expired', orderId, customerPortalUrl })
          return
        }

        const licenseKey = String(data.licenseKey ?? '').trim()
        if (licenseKey) {
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

    let checkoutId = (checkoutIdProp ?? '').trim()
    if (!checkoutId) {
      const params = new URLSearchParams(window.location.search)
      checkoutId = params.get('checkout_id')?.trim() ?? ''
    }

    if (!checkoutId) {
      setState({ phase: 'missing' })
      return
    }

    if (window.location.search) {
      const { pathname } = window.location
      window.history.replaceState({}, '', pathname)
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
    const id =
      state.phase === 'ready' ||
      state.phase === 'provisioning' ||
      state.phase === 'expired'
        ? state.orderId
        : null
    if (id && id !== lastReportedOrderIdRef.current) {
      lastReportedOrderIdRef.current = id
      onOrderIdRef.current?.(id)
    }
  }, [state])

  if (state.phase === 'missing') return null

  // Pull the order id out of the active state for the header chip.
  const orderId =
    state.phase === 'ready' ||
    state.phase === 'provisioning' ||
    state.phase === 'expired'
      ? state.orderId
      : null

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
      <div className="thanks-card-mount mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_30px_60px_-32px_rgba(28,26,23,0.22)]">
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

// ─── Header ────────────────────────────────────────────────────────────────

/** Order id chip. Sits in the very top of the card so the buyer always
 *  has something concrete to quote in support, regardless of which
 *  delivery state they're looking at. Quiet typography — this is
 *  reference data, not a headline. First in the stagger sequence
 *  (120 ms after the card frame mounts). */
function Header({ orderId }: { orderId: string | null }) {
  if (!orderId) return null
  return (
    <div
      className="thanks-section-rise flex items-center justify-end gap-2 border-b border-[color-mix(in_oklab,var(--line)_60%,transparent)] px-5 py-2 sm:px-6"
      style={{ animationDelay: '120ms' }}
    >
      <span className="text-[10px] uppercase tracking-[0.18em] text-nezumi">
        Order
      </span>
      <code className="font-mono text-[10.5px] tracking-[0.04em] text-sumi-soft">
        #{orderId}
      </code>
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
    <div
      className="thanks-section-rise px-5 pb-6 pt-5 sm:px-6 sm:pt-6"
      style={{ animationDelay: '240ms' }}
    >
      <div className="flex items-center gap-3">
        {/* 装 = "install / equip". Matches the kanji-seal vocabulary
            used elsewhere on the site (基 features, 価 pricing, 鍵 key). */}
        <span
          aria-hidden
          className="font-jp text-base leading-none text-hinomaru/85 w-5 text-center"
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
      <p className="mt-3 text-[0.9375rem] leading-[1.6] text-sumi-soft">
        <Trans
          i18nKey="thanks.delivery.from"
          components={[
            <em className="font-display italic font-medium text-sumi" />,
          ]}
        />
      </p>
      {/* Full-width on small screens, naturally sized above sm. Primary
          visual weight: the btn-sumi treatment is the loudest thing on
          the whole card and that's intentional — install is the
          unblocking action. */}
      <a
        href="/download/latest"
        className="btn-sumi group mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-[0.9375rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] sm:w-auto"
      >
        <DownloadIcon
          className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
          strokeWidth={1.8}
        />
        {t('thanks.delivery.downloadCta')}
      </a>
      <p className="mt-3 text-[12px] leading-[1.55] text-nezumi">
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
        style={{ animationDelay: '380ms' }}
      />
    </div>
  )
}

// ─── Delivery strip (secondary, state-aware) ───────────────────────────────

function DeliveryStrip({
  state,
  t,
  checkoutEmailHint,
}: {
  state: DeliveryState
  t: ReturnType<typeof useTranslation>['t']
  checkoutEmailHint: string | null
}) {
  // Tinted surface so the strip reads as a different layer of the
  // card without becoming a nested container. ~3% darker washi. Stays
  // on the OUTER wrapper so the colored band doesn't flash during
  // state changes — only the contents inside `<StripContent>` morph.
  return (
    <div
      className="thanks-section-rise bg-[color-mix(in_oklab,var(--washi)_84%,var(--sumi)_4%)] px-5 py-4 sm:px-6"
      style={{ animationDelay: '460ms' }}
    >
      {/* `key={state.phase}` makes React unmount + remount the inner
          contents whenever the polling loop hands off between states,
          which re-fires .thanks-strip-state's keyframe. The visual
          result: each new state lands with a small breath rather than
          a hard swap, and the surrounding card frame stays put. */}
      <div key={state.phase} className="thanks-strip-state">
        {state.phase === 'loading' && (
          <LoadingLine label={t('thanks.delivery.preparing')} />
        )}
        {state.phase === 'provisioning' && (
          <ProvisioningLine
            customerEmail={state.customerEmail}
            customerPortalUrl={state.customerPortalUrl}
          />
        )}
        {state.phase === 'ready' && (
          <KeyLine
            licenseKey={state.licenseKey}
            customerEmail={state.customerEmail ?? checkoutEmailHint}
            customerPortalUrl={state.customerPortalUrl}
          />
        )}
        {state.phase === 'expired' && (
          <ExpiredLine customerPortalUrl={state.customerPortalUrl} />
        )}
      </div>
    </div>
  )
}

// ─── Strip variants ────────────────────────────────────────────────────────

function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <ZenSpinner small />
      <span className="text-[12px] uppercase tracking-[0.22em] text-sumi-soft">
        {label}
      </span>
    </div>
  )
}

function ProvisioningLine({
  customerEmail,
  customerPortalUrl,
}: {
  customerEmail: string | null
  customerPortalUrl: string
}) {
  const { t } = useTranslation()

  const slogans = useMemo<readonly string[]>(() => {
    const raw = t('thanks.provisioning.slogans', { returnObjects: true })
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter((s): s is string => typeof s === 'string')
    }
    return [FALLBACK_SLOGAN]
  }, [t])

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
    <div role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <ZenSpinner small />
        <span className="text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.provisioning.kicker')}
          {customerEmail && (
            <>
              {' · '}
              <span className="normal-case tracking-normal font-mono text-[11.5px] text-sumi">
                {customerEmail}
              </span>
            </>
          )}
        </span>
      </div>
      <p className="mt-2 pl-[1.625rem] text-[14px] leading-[1.45] text-sumi">
        <span key={sloganIdx} className="zen-slogan inline-block">
          {slogans[sloganIdx] ?? FALLBACK_SLOGAN}
        </span>
      </p>
      <div className="mt-2 pl-[1.625rem]">
        <a
          href={customerPortalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] text-nezumi underline-offset-4 hover:text-sumi-soft hover:underline"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
          {t('thanks.delivery.portalLink')}
        </a>
      </div>
    </div>
  )
}

function KeyLine({
  licenseKey,
  customerEmail,
  customerPortalUrl,
}: {
  licenseKey: string
  customerEmail: string | null
  customerPortalUrl: string
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  // Re-key the copy button on each successful copy so the bump
  // keyframe replays even when the user clicks twice rapidly.
  const [copyAnim, setCopyAnim] = useState(0)

  async function copy() {
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      setCopyAnim((n) => n + 1)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard API unavailable — user can select-all instead */
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {/* Kanji lands like a hanko press: starts oversize + invisible,
            settles to 1× with a quick easing curve (.thanks-kanji-stamp).
            Reads as the key being "stamped" into existence. */}
        <span
          aria-hidden
          className="thanks-kanji-stamp font-jp text-base leading-none text-hinomaru/85 w-5 text-center"
        >
          鍵
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.delivery.keyLabel')}
        </span>
      </div>
      <div className="mt-2 flex items-stretch gap-2 pl-[2rem]">
        <code
          className="flex-1 min-w-0 select-all rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-2.5 py-2 font-mono text-[12px] leading-tight tracking-[0.04em] text-sumi"
          style={{ wordBreak: 'break-all' }}
        >
          {licenseKey || '—'}
        </code>
        <button
          key={copyAnim}
          type="button"
          onClick={copy}
          className={`btn-sumi inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium shrink-0 transition-transform active:scale-[0.97] ${copied ? 'thanks-copy-bump' : ''}`}
          aria-label={t('thanks.delivery.copyAria')}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              {t('thanks.delivery.copied')}
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t('thanks.delivery.copy')}
            </>
          )}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[2rem] text-[11.5px] text-nezumi">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3 w-3" strokeWidth={1.6} />
          {customerEmail ? (
            <>
              {t('thanks.delivery.alsoSentTo')}{' '}
              <span className="font-medium text-sumi-soft">
                {customerEmail}
              </span>
            </>
          ) : (
            t('thanks.delivery.alsoSentDefault')
          )}
        </span>
        <span aria-hidden className="text-[var(--line-strong)]">
          ·
        </span>
        <a
          href={customerPortalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-sumi-soft hover:underline"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
          {t('thanks.delivery.portalLink')}
        </a>
      </div>
    </div>
  )
}

function ExpiredLine({ customerPortalUrl }: { customerPortalUrl: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 text-hinomaru" strokeWidth={1.8} />
        <span className="text-[11px] uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.delivery.expiredKicker')}
        </span>
      </div>
      <p className="mt-2 pl-[1.75rem] text-[13px] leading-[1.5] text-sumi-soft">
        {t('thanks.delivery.expiredBody')}
      </p>
      <div className="mt-2 pl-[1.75rem]">
        <a
          href={customerPortalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] text-nezumi underline-offset-4 hover:text-sumi-soft hover:underline"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
          {t('thanks.delivery.portalLink')}
        </a>
      </div>
    </div>
  )
}

// ─── Spinner ────────────────────────────────────────────────────────────────

/**
 * Zen enso spinner. Thin circular brush arc rotating slowly with a
 * gradient that fades from transparent → sumi → hinomaru at the
 * leading edge. `small` toggles between the inline strip size (16px)
 * and the original card-anchor size (32px). The compact size is used
 * everywhere in the new composite card.
 */
function ZenSpinner({ small = false }: { small?: boolean }) {
  const size = small ? 'h-4 w-4' : 'h-8 w-8'
  return (
    <svg
      role="presentation"
      aria-hidden
      viewBox="0 0 40 40"
      className={size}
    >
      <defs>
        <linearGradient
          id="zen-spinner-grad"
          x1="100%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--sumi)" stopOpacity="0" />
          <stop offset="55%" stopColor="var(--sumi)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--hinomaru)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <circle
        cx="20"
        cy="20"
        r="14.5"
        fill="none"
        stroke="var(--line)"
        strokeWidth="1"
      />
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

