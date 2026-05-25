import {
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
  Headphones,
  Download,
  ShieldCheck,
  Heart,
  TrendingUp,
  Inbox,
  XCircle,
  RefreshCw,
  Bell,
  BatteryCharging,
  ScrollText,
  Activity,
  Laptop,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TRIAL_DAYS, lifetimeCheckoutUrl, supportCheckoutUrl } from '#/lib/polar'
import { usePremiumPrice, useLifetimePrice } from '#/lib/use-price'
import { useDiscountAvailability } from '#/lib/use-discount-availability'

const lifetimeIcons: readonly LucideIcon[] = [Sparkles, InfinityIcon, Clock, Headphones]
const supportIcons: readonly LucideIcon[] = [Sparkles, TrendingUp, XCircle, Inbox]
// Mirrors the order of `pricing.free.items`. Icons are intentionally
// quieter (sumi-soft / nezumi container) than Lifetime's hinomaru wash
// so the Free card stays second-fiddle visually.
const freeIcons: readonly LucideIcon[] = [
  Bell,             // smart low-battery alert presets
  BatteryCharging,  // charge limit with Travel Mode
  ScrollText,       // 30-day Sensei Saga
  Activity,         // menu-bar charge + watts
  ShieldCheck,      // notarized + signed auto-updates
  Laptop,           // runs entirely on your Mac
]

export function Pricing() {
  const yearly = usePremiumPrice()
  const lifetime = useLifetimePrice()
  const { t } = useTranslation()
  const freeFeatures = t('pricing.free.items', {
    returnObjects: true,
  }) as Array<{ title: string; body: string }>
  const lifetimeFeatures = t('pricing.lifetime.items', {
    returnObjects: true,
  }) as Array<{ title: string; body: string }>
  const supportFeatures = t('pricing.support.items', {
    returnObjects: true,
  }) as string[]

  return (
    <section id="pricing" className="zen-section mx-auto max-w-6xl px-5 sm:px-6">
      <div className="mb-12 flex flex-col items-center text-center">
        <Hanko kanji="価" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          {t('pricing.kicker')}
        </Reveal>
        <Reveal as="h2" delay={200} className="section-heading text-sumi max-w-2xl">
          {t('pricing.heading')}
          <span className="block italic text-sumi-soft font-normal">
            {t('pricing.headingItalic')}
          </span>
        </Reveal>
        <Reveal
          as="p"
          delay={280}
          className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
        >
          {t('pricing.intro', {
            trial: TRIAL_DAYS,
            lifetime: lifetime.discounted.formatted,
            support: yearly.formatted,
          })}
        </Reveal>
      </div>

      {/* Three-card layout. Lifetime sits in the middle as the recommended
          tier (headline buy); Free on the left, Ongoing Developer Support on
          the right as the lower-commitment yearly alternative. RECOMMENDED
          is an inline pill in the normal flow so the .paper-card > * rule
          doesn't pin it out of place. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* ---------- Free card (left) ---------- */}
        <Reveal delay={120} className="h-full">
          <article className="paper-card flex h-full flex-col p-7 md:p-8">
            <div className="flex items-center gap-3">
              <span className="font-jp text-xs tracking-widest text-sumi-soft">
                {t('pricing.free.tier')}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-title text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none tabular-nums">
                {yearly.zero}
              </span>
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                {t('pricing.free.period')}
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              {t('pricing.free.blurb')}
              <span className="block mt-1 text-sumi">
                {t('pricing.free.blurbBonus', { trial: TRIAL_DAYS })}
              </span>
            </p>

            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="mt-6 font-jp text-[11px] tracking-[0.32em] text-nezumi uppercase">
              {t('pricing.free.whatYouKeep')}
            </p>
            <ul className="mt-4 space-y-4">
              {freeFeatures.map(({ title, body }, idx) => {
                const Icon = freeIcons[idx] ?? Sparkles
                return (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sumi/[0.06] text-sumi-soft">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-medium text-sumi leading-tight">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-snug text-sumi-soft">
                        {body}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* Trial-end pitch + email form + CTA all live INSIDE the
                mt-auto wrapper so the whole conversion block pins to the
                bottom of the card. Avoids the floating-whitespace look
                between feature list and CTA. */}
            <div className="mt-auto pt-8">
              <div className="rounded-md border border-dashed border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-4 py-3.5">
                <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] font-medium text-sumi-soft">
                  <span className="font-jp normal-case tracking-normal text-hinomaru/80">日 {TRIAL_DAYS}</span>
                  {t('pricing.free.trialEnd', { day: TRIAL_DAYS })}
                </p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-sumi-soft">
                  <Trans
                    i18nKey="pricing.free.trialChoice"
                    values={{ price: lifetime.discounted.formatted }}
                    components={[
                      <span className="font-medium text-sumi" />,
                      <span className="font-medium text-sumi" />,
                    ]}
                  />
                </p>
              </div>
              <FreeDownloadForm />
            </div>
          </article>
        </Reveal>

        {/* ---------- Lifetime card (middle, RECOMMENDED) ---------- */}
        <Reveal delay={220} className="h-full">
          <article className="paper-card flex h-full flex-col p-7 md:p-8 ring-1 ring-hinomaru/20">
            <div className="flex items-center gap-3">
              <span className="font-jp text-xs tracking-widest text-hinomaru/80">
                {t('pricing.lifetime.tier')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-hinomaru/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-hinomaru">
                {t('common.recommended')}
              </span>
            </div>
            {/* Strikethrough is now stacked ABOVE the current price and
                visually focused — anchoring effect: the eye sees the higher
                number first, then the discounted price lands as relief. */}
            <div className="mt-2.5 inline-flex items-baseline gap-2 text-sumi-soft tabular-nums">
              <span className="uppercase tracking-[0.2em] text-[0.6875rem] text-nezumi">
                {t('pricing.lifetime.originalLabel')}
              </span>
              <span className="display-title relative text-[1.25rem] md:text-[1.375rem] font-medium text-sumi/85 leading-none">
                <span className="relative inline-block">
                  {lifetime.original.formatted}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[-2px] right-[-2px] top-1/2 h-[2px] -translate-y-1/2 rotate-[-6deg] bg-hinomaru"
                  />
                </span>
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="display-title text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none tabular-nums">
                {lifetime.discounted.formatted}
              </span>
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                {t('pricing.lifetime.period')}
              </span>
            </div>
            <p className="mt-2 text-[0.75rem] uppercase tracking-[0.16em] font-medium text-hinomaru/90">
              {t('pricing.lifetime.discountNote')}
            </p>
            <LimitedRedeemBar fullPriceFormatted={lifetime.original.formatted} />
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              {t('pricing.lifetime.blurb')}
            </p>

            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="mt-6 font-jp text-[11px] tracking-[0.32em] text-hinomaru/80 uppercase">
              {t('pricing.lifetime.premiumAdds')}
            </p>
            <ul className="mt-4 space-y-4">
              {lifetimeFeatures.map(({ title, body }, idx) => {
                const Icon = lifetimeIcons[idx] ?? Sparkles
                return (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--hinomaru)_10%,var(--washi))] text-hinomaru">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-medium text-sumi leading-tight">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-snug text-sumi-soft">
                        {body}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* Trust line + CTA bundled in mt-auto so they sit glued
                together at the bottom — peak-end rule: trust is the
                last thing the visitor reads before clicking. */}
            <div className="mt-auto pt-8">
              <p className="inline-flex items-center gap-1.5 text-[0.7rem] text-nezumi">
                <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                {t('pricing.lifetime.trust.combined')}
              </p>
              <a
                href={lifetimeCheckoutUrl()}
                className="btn-sumi group mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                {t('pricing.lifetime.ctaLabel')}
              </a>
            </div>
          </article>
        </Reveal>

        {/* ---------- Ongoing Developer Support card (right) ---------- */}
        <Reveal delay={320} className="h-full">
          <article className="paper-card flex h-full flex-col p-7 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-jp text-xs tracking-widest text-sumi-soft">
                {t('pricing.support.tier')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sumi/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-sumi-soft">
                {t('pricing.support.badge')}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-title text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none tabular-nums">
                {yearly.formatted}
              </span>
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                {t('pricing.support.period')}
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              {t('pricing.support.blurb')}
            </p>

            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="mt-6 font-jp text-[11px] tracking-[0.32em] text-sumi-soft uppercase">
              {t('pricing.support.perksTitle')}
            </p>
            <ul className="mt-4 space-y-4">
              {supportFeatures.map((line, idx) => {
                const Icon = supportIcons[idx] ?? Sparkles
                return (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sumi/5 text-sumi-soft">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="text-[0.9375rem] leading-snug text-sumi-soft">
                      {line}
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* Same pattern as Lifetime: trust + CTA bundled at the
                bottom so the white space lives ABOVE the conversion
                block, not between trust and button. */}
            <div className="mt-auto pt-8">
              <p className="inline-flex items-center gap-1.5 text-[0.7rem] text-nezumi">
                <RefreshCw className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                {t('pricing.lifetime.trust.subscription')}
              </p>
              <a
                href={supportCheckoutUrl()}
                className="btn-sumi-soft group mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-6 text-sm font-medium text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_40%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <Heart className="h-4 w-4 text-hinomaru" strokeWidth={1.8} />
                {t('pricing.support.ctaLabel')}
              </a>
            </div>
          </article>
        </Reveal>
      </div>

      <Reveal as="p" delay={420} className="spec-strip mt-10 text-center">
        {t('pricing.alreadyBought')}
      </Reveal>
    </section>
  )
}

/**
 * Scarcity bar for the ZENMODE first-500 discount on the Lifetime card.
 *
 * Live counts come from `/api/discount-availability` (Polar). On any
 * failure the hook returns a static fallback (`used: 0`) so the bar
 * still renders an anchor (the 500-redemption cap) without making any
 * false scarcity claim.
 *
 * Three visual states:
 *   - Normal      → soft hinomaru fill, "X of 500 claimed"
 *   - Almost gone → ≤50 left, brighter hinomaru fill + warning copy
 *   - Sold out    → fully redeemed, neutral bar + "price returns to {full}"
 */
function LimitedRedeemBar({ fullPriceFormatted }: { fullPriceFormatted: string }) {
  const { t } = useTranslation()
  const { used, max, remaining, live } = useDiscountAvailability()
  if (max <= 0) return null
  const pct = Math.min(100, (used / max) * 100)
  const soldOut = remaining === 0
  const almostGone = !soldOut && remaining <= 50

  const accentClass = soldOut
    ? 'bg-nezumi/45'
    : almostGone
      ? 'bg-hinomaru'
      : 'bg-hinomaru/70'

  return (
    <div className="mt-3.5 select-none" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 text-[10.5px] uppercase tracking-[0.16em]">
        {soldOut ? (
          <span className="font-semibold text-nezumi">
            {t('pricing.lifetime.redeem.soldOut')}
          </span>
        ) : almostGone ? (
          <span className="font-semibold text-hinomaru">
            {t('pricing.lifetime.redeem.almostGone', { remaining })}
          </span>
        ) : (
          <span className="text-sumi-soft">
            <Trans
              i18nKey="pricing.lifetime.redeem.label"
              values={{ remaining, max }}
              components={[
                <span className="font-semibold text-sumi tabular-nums" />,
                <span className="tabular-nums" />,
              ]}
            />
          </span>
        )}
        {!soldOut && live && (
          <span
            aria-hidden
            className="relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-matcha"
          >
            <span className="absolute inset-0 -m-0.5 animate-ping rounded-full bg-matcha/60" />
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className={`h-full ${accentClass} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {soldOut && (
        <p className="mt-1.5 text-[11px] text-nezumi">
          {t('pricing.lifetime.redeem.soldOutHint', { full: fullPriceFormatted })}
        </p>
      )}
    </div>
  )
}

/**
 * Email-gated download for the Free card.
 *
 * Marketing-psychology design:
 *   - Default path is the email opt-in (Default Effect). The form is
 *     the visible action; the no-email link sits below as a quiet
 *     escape hatch.
 *   - Reciprocity: you give us an email, we hand you the download
 *     plus one quiet email per release. Honest trade, no clutter.
 *   - Self-determination: skip link preserves autonomy — no dark
 *     pattern, no gate, the download is still one click away.
 *   - Reduced friction (BJ Fogg): single email field, no name, no
 *     extra confirmation; submit fires the download immediately so
 *     the visitor never waits for an email-link round-trip.
 *
 * The API call is fire-and-forget — a network failure never blocks
 * the download. The visitor is always served the .dmg.
 */
function FreeDownloadForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || status === 'sending') {
      if (!isValid) setStatus('error')
      return
    }
    setStatus('sending')
    // Best-effort signup. Failures are silent — the visitor still
    // gets the download. Logging happens server-side.
    try {
      await fetch('/api/free-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale: i18n.language,
          source: 'pricing-free',
        }),
        keepalive: true,
      })
    } catch {
      // intentional: don't block download on network/api failure
    }
    window.location.assign('/download/latest')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5" noValidate>
      <label
        htmlFor="free-download-email"
        className="block text-center text-[0.7rem] uppercase tracking-[0.16em] text-sumi-soft"
      >
        {t('pricing.free.email.label')}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="free-download-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder={t('pricing.free.email.placeholder')}
          className="h-11 flex-1 min-w-0 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/30"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-sumi group inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] disabled:opacity-70"
        >
          <Download
            className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
            strokeWidth={1.8}
            aria-hidden
          />
          {status === 'sending'
            ? t('pricing.free.email.sending')
            : t('pricing.free.email.cta')}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-1.5 text-center text-[11px] text-hinomaru">
          {t('pricing.free.email.errorInvalid')}
        </p>
      )}
      <p className="mt-2 text-center text-[0.7rem] leading-[1.45] text-nezumi">
        {t('pricing.free.email.footnote')}
      </p>
      <p className="mt-1.5 text-center">
        <a
          href="/download/latest"
          className="text-[0.7rem] text-nezumi underline-offset-[6px] hover:text-sumi-soft hover:underline"
        >
          {t('pricing.free.email.skip')}
        </a>
      </p>
    </form>
  )
}
