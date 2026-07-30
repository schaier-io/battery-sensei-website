import { useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, Mail, Sparkles } from 'lucide-react'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

/**
 * The state-aware bottom half of the post-purchase delivery card (see
 * LicenseRevealCard for the frame and the polling loop that drives it).
 *
 * Split out of LicenseRevealCard so the card file keeps one job — the
 * polling lifecycle plus the always-on install section — and this file
 * keeps the other: rendering whichever of the six delivery states the
 * loop has landed on.
 *
 *   loading      → small spinner + "Preparing your key"
 *   provisioning → spinner + rotating slogan + email + portal link
 *   ready        → license key + copy button + meta row
 *   expired      → "Check your email" with portal CTA
 *   timeout      → polling gave up; inbox + support + portal
 *   missing      → no checkout_id at all (bookmark / revisit); inbox +
 *                  portal, no failure language
 *
 * The last three are the same message to the buyer — your key is not on
 * this screen, here is where it lives — so they share one shape
 * (`KeyElsewhereLine`) and differ only in kicker and body.
 */

// Rotating progress slogans for the wait. Each line names a small,
// concrete step so the wait reads as work being done rather than a
// stall. List does NOT loop — the last line is the resting state.
const SLOGAN_INTERVAL_MS = 3400

// Fallback used only if the locale ships without the slogan array
// (broken JSON, mid-deploy gap, etc.) so the strip never blanks.
const FALLBACK_SLOGAN = 'Polar is preparing the paperwork.'

export type DeliveryState =
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
  | {
      phase: 'timeout'
      orderId: string | null
      customerPortalUrl: string
    }

// ─── Delivery strip (secondary, state-aware) ───────────────────────────────

export function DeliveryStrip({
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
      className="thanks-section-rise bg-[color-mix(in_oklab,var(--washi)_84%,var(--sumi)_4%)] px-5 py-5 sm:px-6 sm:py-6"
      style={{ animationDelay: '560ms' }}
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
        {state.phase === 'timeout' && (
          <TimeoutLine customerPortalUrl={state.customerPortalUrl} />
        )}
        {state.phase === 'missing' && <MissingLine />}
      </div>
    </div>
  )
}

// ─── Strip variants ────────────────────────────────────────────────────────

function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <ZenSpinner small />
      <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
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
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <ZenSpinner small />
        <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
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
      <p className="text-[14px] leading-[1.5] text-sumi">
        <span key={sloganIdx} className="zen-slogan inline-block">
          {slogans[sloganIdx] ?? FALLBACK_SLOGAN}
        </span>
      </p>
      <a
        href={customerPortalUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] text-nezumi underline-offset-4 transition-colors hover:text-sumi-soft hover:underline"
      >
        <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
        {t('thanks.delivery.portalLink')}
      </a>
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
    // Inner stack with consistent vertical rhythm. Each row sits flush
    // with the section padding (no kanji-column indent) so the content
    // edges line up with the InstallSection above. Per-row stagger
    // turns the key reveal into a small cascade: label → code+copy →
    // activate CTA → meta line. Delays are computed off the strip
    // state-change so they fire each time `<DeliveryStrip>` swaps
    // states (the parent `key={state.phase}` remount).
    <div className="space-y-3.5">
      <div
        className="thanks-key-row flex items-center gap-3"
        style={{ ['--row-delay' as string]: '0ms' }}
      >
        {/* Kanji lands like a hanko press: starts oversize + invisible,
            settles to 1× with a quick easing curve (.thanks-kanji-stamp).
            Reads as the key being "stamped" into existence. */}
        <span
          aria-hidden
          className="thanks-kanji-stamp font-jp text-base leading-none text-hinomaru-ink/85 w-5 text-center"
        >
          鍵
        </span>
        <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.delivery.keyLabel')}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
        />
      </div>

      {/* Code + Copy. Stack vertically on phones (so the UUID gets the
          full width and the copy button reads as a separate affordance,
          not a sliver glued to the code). Side-by-side from sm up. */}
      <div
        className="thanks-key-row flex flex-col gap-2 sm:flex-row sm:items-stretch"
        style={{ ['--row-delay' as string]: '120ms' }}
      >
        <code
          // Geist Mono w/ slashed zero + slightly tighter tracking +
          // small caps via OpenType `cv11` (alternate `a`) keeps the
          // long UUID readable without looking like a developer log
          // line. Falls back through ui-monospace → SF Mono on macOS.
          className="flex-1 min-w-0 select-all rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,var(--paper-lift))] px-3 py-2.5 text-[12.5px] leading-[1.4] tracking-[0.015em] text-sumi shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_1px_2px_rgba(28,26,23,0.04)]"
          style={{
            wordBreak: 'break-all',
            fontFamily: 'var(--font-mono)',
            fontFeatureSettings: '"ss01", "cv11", "zero"',
            fontVariantNumeric: 'tabular-nums slashed-zero',
          }}
        >
          {licenseKey || '—'}
        </code>
        <button
          key={copyAnim}
          type="button"
          onClick={copy}
          className={`group inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[12px] font-medium shrink-0 transition-[colors,transform,box-shadow] duration-[200ms] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 ${
            copied
              ? 'thanks-copy-bump border-matcha/45 bg-[color-mix(in_oklab,var(--matcha)_14%,var(--washi))] text-matcha'
              : 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,var(--paper-lift))] text-sumi hover:bg-[color-mix(in_oklab,var(--washi)_35%,var(--paper-lift))]'
          }`}
          aria-label={t('thanks.delivery.copyAria')}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t('thanks.delivery.copied')}
            </>
          ) : (
            <>
              <Copy
                className="h-3.5 w-3.5 transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-px"
                strokeWidth={1.8}
              />
              {t('thanks.delivery.copy')}
            </>
          )}
        </button>
      </div>

      {/* Activate-in-app deeplink. Once the key is in hand, the
          primary action is "open Sensei and prefill this key" — the
          macOS app registers the `batterysensei://activate?key=...`
          URL scheme and routes straight to the Pro activation
          sheet with the key already filled. Falls back gracefully:
          if the URL scheme isn't registered (app not installed),
          the OS shows its standard "no app" dialog, and the user
          still has the Copy button + the email above.

          `encodeURIComponent` on the key escapes any characters Polar
          might one day put in the format (today they're ASCII-only). */}
      {/* Step 2 — Open Sensei & activate. The TRUE primary action of
          the whole card: this is the deeplink that takes the buyer
          from "I have a key" to "Pro is on". Slightly taller +
          softer shadow than the secondary Download chip above so it
          reads as the loudest affordance on the card. */}
      <a
        href={`batterysensei://activate?key=${encodeURIComponent(licenseKey)}`}
        className="thanks-key-row btn-sumi group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-[0.9375rem] font-semibold shadow-[0_8px_22px_-10px_rgba(28,26,23,0.45)] transition-[transform,box-shadow] duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(28,26,23,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
        style={{ ['--row-delay' as string]: '240ms' }}
      >
        <Sparkles
          className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:rotate-[10deg]"
          strokeWidth={1.8}
          aria-hidden
        />
        {t('thanks.delivery.activateInApp')}
      </a>

      {/* Meta row — email confirmation + portal link. Two separate
          inline-flex chunks so each is its own focus/hit target.
          Wraps gracefully to a second line on narrow widths. */}
      <div
        className="thanks-key-row flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] leading-[1.45] text-nezumi"
        style={{ ['--row-delay' as string]: '360ms' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3 w-3 text-sumi-soft/70" strokeWidth={1.6} />
          {customerEmail ? (
            <>
              {t('thanks.delivery.alsoSentTo')}{' '}
              <span className="font-medium text-sumi-soft">{customerEmail}</span>
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
          className="inline-flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-sumi-soft hover:underline"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
          {t('thanks.delivery.portalLink')}
        </a>
      </div>
    </div>
  )
}

// ─── "Your key lives elsewhere" variants ───────────────────────────────────

/** Shared layout for every state where the key is NOT on screen. Same
 *  three beats each time — mail kicker, one paragraph, portal link — so
 *  the buyer reads the same reassurance whether they lost the query
 *  string, waited past the polling window, or came back tomorrow. */
function KeyElsewhereLine({
  kicker,
  customerPortalUrl,
  children,
}: {
  kicker: string
  customerPortalUrl: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 text-hinomaru-ink" strokeWidth={1.8} />
        <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
          {kicker}
        </span>
      </div>
      <p className="text-[13px] leading-[1.55] text-sumi-soft">{children}</p>
      <a
        href={customerPortalUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] text-nezumi underline-offset-4 transition-colors hover:text-sumi-soft hover:underline"
      >
        <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
        {t('thanks.delivery.portalLink')}
      </a>
    </div>
  )
}

function ExpiredLine({ customerPortalUrl }: { customerPortalUrl: string }) {
  const { t } = useTranslation()
  return (
    <KeyElsewhereLine
      kicker={t('thanks.delivery.expiredKicker')}
      customerPortalUrl={customerPortalUrl}
    >
      {t('thanks.delivery.expiredBody')}
    </KeyElsewhereLine>
  )
}

/** Polling ran past its window without a key. Deliberately says nothing
 *  about ids, statuses or codes — the buyer can't act on any of that.
 *  It names the two places the key definitely is, then the human. */
function TimeoutLine({ customerPortalUrl }: { customerPortalUrl: string }) {
  const { t } = useTranslation()
  return (
    <KeyElsewhereLine
      kicker={t('thanks.delivery.timeoutKicker')}
      customerPortalUrl={customerPortalUrl}
    >
      <Trans
        i18nKey="thanks.delivery.timeoutBody"
        components={[
          <a
            href={`mailto:${t('thanks.delivery.supportEmail')}?subject=Missing%20license%20key`}
            className="font-medium text-sumi-soft underline decoration-[var(--line-strong)] underline-offset-[3px] hover:text-sumi hover:decoration-sumi transition-colors"
          />,
        ]}
      />
    </KeyElsewhereLine>
  )
}

/** No `checkout_id` in the URL at all: a bookmark, a revisit, a redirect
 *  that dropped the query string. Nothing failed, so nothing here reads
 *  like a failure — the buyer still gets the install card above and the
 *  two places their key is waiting. */
function MissingLine() {
  const { t } = useTranslation()
  return (
    <KeyElsewhereLine
      kicker={t('thanks.delivery.missingKicker')}
      customerPortalUrl={CUSTOMER_PORTAL_URL}
    >
      {t('thanks.delivery.missingBody')}
    </KeyElsewhereLine>
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
