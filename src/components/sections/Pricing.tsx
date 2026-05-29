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
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { Hanko } from '#/components/zen/Hanko'
import { PriceDisplay } from '#/components/zen/PriceDisplay'
import { Reveal } from '#/components/zen/Reveal'
import { MacOnlyConfirm, MacOnlyConfirmDialog } from '#/components/MacOnlyConfirm'
import { detectIsMac } from '#/lib/use-is-mac'
import { TRIAL_DAYS } from '#/lib/polar'
import { usePremiumPrice, useLifetimePrice } from '#/lib/use-price'
import { useDiscountAvailability } from '#/lib/use-discount-availability'

const lifetimeIcons: readonly LucideIcon[] = [Sparkles, InfinityIcon, Clock, Headphones]
// Order mirrors `pricing.support.items` in en.json:
// 1. full Premium feature set, 2. you fund the next release, 3. direct line, 4. cancel anytime.
const supportIcons: readonly LucideIcon[] = [Sparkles, TrendingUp, Inbox, XCircle]
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

/** Shared primary CTA geometry — all three tiers lock to exactly 2.75rem tall. */
const PRICING_CTA_BTN =
  'group box-border inline-flex h-11 min-h-11 max-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]'

/**
 * Pins pre-CTA copy, the CTA, and the post-CTA row (skip link / spacer) to the
 * card bottom with a fixed footer height so all three primary buttons share
 * the same baseline across the pricing grid.
 */
function PricingCardFooter({
  pre,
  cta,
  post,
}: {
  pre: ReactNode
  cta: ReactNode
  post?: ReactNode
}) {
  return (
    <div className="pricing-card-footer">
      <div className="pricing-card-footer__pre">{pre}</div>
      <div className="pricing-card-footer__cta">{cta}</div>
      <div className="pricing-card-footer__post">
        {post ?? <span className="block w-full" aria-hidden />}
      </div>
    </div>
  )
}

export function Pricing() {
  const yearly = usePremiumPrice()
  const lifetime = useLifetimePrice()
  const { t } = useTranslation()
  const lifetimeScope = t('licenseScope.lifetime')
  const yearlyScope = t('licenseScope.yearly')
  const lifetimeScopeShort = t('licenseScope.lifetimeShort')
  const yearlyScopeShort = t('licenseScope.yearlyShort')
  const notarizedCombined = t('licenseScope.notarizedCombined')
  // ZENMODE redemption count drives every "launch discount" surface on
  // this section. Once `remaining` hits 0 we hide the scarcity bar, the
  // discount-note chip, AND the strikethrough — the page then reads as
  // a plain full-price product, not a stale "was X / now Y" anchor that
  // would lie about the active offer.
  const { remaining: zenmodeRemaining } = useDiscountAvailability()
  // "Launch is open" only when BOTH gates agree:
  //   1. ZENMODE redemption count > 0 (marketing scarcity bar)
  //   2. Polar's live price preview reports the discount is still being
  //      honoured AND the two amounts actually differ.
  //
  // Without the Polar gate, the strikethrough used to render even after
  // Polar quietly stopped applying ZENMODE — the page then showed
  // "was $4.49 / $4.49" because `lifetime.original` and `lifetime.discounted`
  // came back identical from `/api/price` while `zenmodeRemaining` was
  // still positive on our side.
  const hasRealDiscount =
    lifetime.hasDiscount && lifetime.original.amount > lifetime.discounted.amount
  const launchOpen = zenmodeRemaining > 0 && hasRealDiscount
  // While the launch discount is active we show the discounted price as
  // the headline; once exhausted, the original full price becomes the
  // headline and the strikethrough is gone too.
  const lifetimePrice = launchOpen ? lifetime.discounted : lifetime.original
  const freeFeatures = t('pricing.free.items', {
    returnObjects: true,
  }) as Array<{ title: string; body: string }>
  const lifetimeFeatures = t('pricing.lifetime.items', {
    returnObjects: true,
  }) as Array<{ title: string; body: string }>
  // English now ships `support.items` as `{ title, body }[]` so the Yearly
  // card matches the marketing weight of Lifetime. Legacy locales still
  // have it as `string[]`; normalize both shapes here so the JSX stays one
  // template until the other locales are translated.
  const rawSupportItems = t('pricing.support.items', {
    returnObjects: true,
  }) as Array<string | { title: string; body?: string }>
  const supportFeatures: Array<{ title: string; body?: string }> = (
    Array.isArray(rawSupportItems) ? rawSupportItems : []
  ).map((entry) => (typeof entry === 'string' ? { title: entry } : entry))

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
            lifetimeScope,
            yearlyScope,
          })}
        </Reveal>
      </div>

      {/* Three-card layout. Lifetime sits in the middle as the recommended
          tier (headline buy); Free on the left, Yearly Patron on
          the right as the lower-commitment yearly alternative. RECOMMENDED
          is an inline pill in the normal flow so the .paper-card > * rule
          doesn't pin it out of place. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* ---------- Free card (left) ---------- */}
        <Reveal delay={120} className="h-full">
          <article
            aria-labelledby="pricing-tier-free"
            className="paper-card flex h-full flex-col px-7 pt-7 pb-5 md:px-8 md:pt-8 md:pb-6"
          >
            <div className="flex items-center gap-3">
              {/* `id` on the tier label gives the surrounding <article> an
                  accessible name via aria-labelledby. The element stays a
                  span so the kanji tracking + font-jp styling are
                  preserved; no visual change. */}
              <h3
                id="pricing-tier-free"
                className="font-jp text-xs tracking-widest text-sumi-soft m-0 font-normal"
              >
                {t('pricing.free.tier')}
              </h3>
            </div>
            {/* "Free" instead of "$0 / forever". Zero-price effect:
                a word triggers an irrational positive response that a
                number doesn't, and "$0" reads as a transaction with
                no payment rather than the absence of one. Same type
                scale as the paid tiers' price so the visual ladder
                still reads cleanly side-by-side. */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-title inline-flex items-baseline text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none">
                {t('pricing.free.priceWord')}
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              {t('pricing.free.blurb')}
              <span className="mt-1.5 block text-[0.82rem] uppercase tracking-[0.12em] text-sumi-soft/80">
                <span className="font-jp normal-case tracking-normal text-hinomaru/80">日 {TRIAL_DAYS}</span>{' '}
                {t('pricing.free.trialEnd', { day: TRIAL_DAYS })}
              </span>
              <span className="mt-1 block text-sumi">
                <Trans
                  i18nKey="pricing.free.trialChoice"
                  values={{ price: lifetime.discounted.formatted }}
                  components={[
                    <span className="font-medium text-sumi" />,
                    <span className="font-medium text-sumi" />,
                  ]}
                />
              </span>
            </p>

            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="meta-label mt-6 font-jp text-nezumi">
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
                      <span className="mt-0.5 block text-[0.875rem] leading-snug text-sumi-soft">
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
            <FreeDownloadForm />
          </article>
        </Reveal>

        {/* ---------- Lifetime card (middle, RECOMMENDED) ---------- */}
        <Reveal delay={220} className="h-full">
          <article
            aria-labelledby="pricing-tier-lifetime"
            className="paper-card flex h-full flex-col px-7 pt-7 pb-5 md:px-8 md:pt-8 md:pb-6 ring-1 ring-hinomaru/20"
          >
            <div className="flex items-center gap-3">
              <h3
                id="pricing-tier-lifetime"
                className="font-jp text-xs tracking-widest text-hinomaru/80 m-0 font-normal"
              >
                {t('pricing.lifetime.tier')}
              </h3>
              <span className="meta-label inline-flex items-center gap-1 rounded-full bg-hinomaru/10 px-2 py-0.5 text-hinomaru">
                {t('common.recommended')}
              </span>
            </div>
            {/* Strikethrough only renders while ZENMODE has redemptions
                left. Once exhausted, the original price IS the headline
                price below — keeping a struck-through "was" line on
                top of that would be a lie. */}
            {launchOpen && (
              <div className="mt-2.5 inline-flex items-baseline gap-2 text-sumi-soft">
                <span className="meta-label text-nezumi">
                  {t('pricing.lifetime.originalLabel')}
                </span>
                {/* Strikethrough original price — same symbol-split
                    treatment as the headline so the slash + diagonal
                    line still cross cleanly even with two glyph
                    families in the run. */}
                <span className="relative inline-block leading-none">
                  <PriceDisplay
                    entry={lifetime.original}
                    className="display-title inline-flex items-baseline text-[1.25rem] md:text-[1.375rem] font-medium text-sumi/85 leading-none"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[-2px] right-[-2px] top-1/2 h-[2px] -translate-y-1/2 rotate-[-6deg] bg-hinomaru"
                  />
                </span>
              </div>
            )}
            {/* `aria-live="polite" aria-atomic="true"` announces the
                full headline (price + period) as one unit when the
                live `/api/price` round-trip swaps in the visitor's
                real currency. Wrapping the row instead of each
                <PriceDisplay> prevents the symbol + amount from being
                announced as separate live regions. */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <PriceDisplay
                entry={lifetimePrice}
                className="display-title inline-flex items-baseline text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none"
              />
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                {t('pricing.lifetime.period')}
              </span>
            </div>
            {/* Launch-discount marketing chrome (note + scarcity bar)
                appears ONLY while ZENMODE still has redemptions. Past
                that, the card reads as a plain lifetime product at
                full price, no stale urgency cues. */}
            {launchOpen && (
              <>
                <p className="mt-2 text-[0.75rem] uppercase tracking-[0.16em] font-medium text-hinomaru/90">
                  {t('pricing.lifetime.discountNote')}
                </p>
                <LimitedRedeemBar fullPriceFormatted={lifetime.original.formatted} />
              </>
            )}
            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="meta-label mt-6 font-jp text-hinomaru/80">
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
                      <span className="mt-0.5 block text-[0.875rem] leading-snug text-sumi-soft">
                        {body}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>

            <PricingCardFooter
              pre={
                <p className="inline-flex items-center gap-1.5 text-[0.73rem] leading-[1.55] text-sumi-soft/90">
                  <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                  {t('pricing.lifetime.trust.combined', {
                    lifetimeScopeShort,
                    yearlyScopeShort,
                    notarizedCombined,
                  })}
                </p>
              }
              cta={
                <Link
                  to="/checkout"
                  search={{ tier: 'lifetime', cur: undefined }}
                  className={`btn-sumi ${PRICING_CTA_BTN}`}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                  {t('pricing.lifetime.ctaLabel')}
                </Link>
              }
            />
          </article>
        </Reveal>

        {/* ---------- Yearly Patron card (right) ---------- */}
        <Reveal delay={320} className="h-full">
          <article
            aria-labelledby="pricing-tier-support"
            className="paper-card flex h-full flex-col px-7 pt-7 pb-5 md:px-8 md:pt-8 md:pb-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="pricing-tier-support"
                className="font-jp text-xs tracking-widest text-sumi-soft m-0 font-normal"
              >
                {t('pricing.support.tier')}
              </h3>
            </div>
            {/* Live region wraps the full price line — see the parallel
                comment on the Lifetime card above. */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="mt-2 flex items-baseline gap-2"
            >
              <PriceDisplay
                entry={yearly}
                className="display-title inline-flex items-baseline text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none"
              />
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                {t('pricing.support.period')}
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              {t('pricing.support.blurb')}
            </p>

            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="meta-label mt-6 font-jp text-sumi-soft">
              {t('pricing.support.perksTitle')}
            </p>
            <ul className="mt-4 space-y-4">
              {supportFeatures.map(({ title, body }, idx) => {
                const Icon = supportIcons[idx] ?? Sparkles
                const goldSparkle = idx === 0
                const goldPerkStatic = idx === 1
                const goldChip = goldSparkle || goldPerkStatic
                return (
                  <li key={title} className="flex items-start gap-3">
                    <span
                      className={
                        goldChip
                          ? 'mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--kin)_14%,var(--washi))] text-[var(--kin)]'
                          : 'mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sumi/5 text-sumi-soft'
                      }
                    >
                      {goldSparkle ? (
                        <span className="pricing-sparkle-shimmer-shell">
                          <Icon
                            className="pricing-sparkle-gold h-3.5 w-3.5"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth={0.85}
                            aria-hidden
                          />
                        </span>
                      ) : (
                        <Icon
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex w-full flex-wrap items-center gap-2 text-[0.9375rem] font-medium text-sumi leading-tight">
                        <span>{title}</span>
                        {idx === 3 && (
                          <span className="ml-auto shrink-0 inline-flex rotate-3 items-center rounded-full border border-hinomaru/35 bg-[color-mix(in_oklab,var(--hinomaru)_12%,#fff)] px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-hinomaru">
                            {t('pricing.support.anytimeTag', { defaultValue: 'Anytime' })}
                          </span>
                        )}
                      </span>
                      {body && (
                        <span className="mt-0.5 block text-[0.875rem] leading-snug text-sumi-soft">
                          {body}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>

            <PricingCardFooter
              pre={
                <p className="inline-flex items-center gap-1.5 text-[0.73rem] leading-[1.55] text-sumi-soft/90">
                  <RefreshCw className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                  {t('pricing.lifetime.trust.subscription', {
                    lifetimeScopeShort,
                    yearlyScopeShort,
                    notarizedCombined,
                  })}
                </p>
              }
              cta={
                <Link
                  to="/checkout"
                  search={{ tier: 'support', cur: undefined }}
                  className={`btn-sumi-soft border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_40%,#fff)] ${PRICING_CTA_BTN}`}
                >
                  <Heart
                    className="h-4 w-4 text-hinomaru fill-transparent transition-[fill,transform] duration-[460ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:fill-current group-hover:scale-110"
                    strokeWidth={1.8}
                  />
                  {t('pricing.support.ctaLabel')}
                </Link>
              }
            />
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
  const { max, remaining } = useDiscountAvailability()
  if (max <= 0) return null
  // Fill = `remaining`, not `used`. Starts at 100% on day one with
  // the full 500 codes available; shrinks as buyers claim. The
  // visual matches the verbal copy ("X of 500 remaining") and reads
  // intuitively as scarcity: a wide bar today, a sliver tomorrow.
  const pct = Math.min(100, Math.max(0, (remaining / max) * 100))
  const soldOut = remaining === 0
  const almostGone = !soldOut && remaining <= 50

  const accentClass = soldOut
    ? 'bg-nezumi/45'
    : almostGone
      ? 'bg-hinomaru'
      : 'bg-hinomaru/70'

  return (
    <div className="mt-3.5 select-none" aria-live="polite">
      <div className="meta-label flex items-baseline justify-between gap-3">
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
              values={{ remaining }}
              components={[<span className="font-semibold text-sumi tabular-nums" />]}
            />
          </span>
        )}
      </div>
      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className={`h-full ${accentClass} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
        {/* Quiet sheen that sweeps the bar every ~7s — replaces the old
            blinking live-dot. Only while the offer is still open. */}
        {!soldOut && <span aria-hidden className="redeem-bar-shimmer" />}
      </div>
      {soldOut && (
        <p className="mt-1.5 text-[0.75rem] text-sumi-soft">
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
 * the download. The visitor is always served the .pkg installer.
 */
function FreeDownloadForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  // 'invalid' = bad email (client). 'success'/'error' = signup POST
  // outcome, surfaced after we fire the download so the visitor gets a
  // clear "check your inbox" / "didn't go through" confirmation.
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'invalid' | 'success' | 'error'
  >('idle')
  const [macConfirmOpen, setMacConfirmOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Every "Download for macOS" CTA on the site scrolls to this input
  // via `href="#free-download-email"`. Native hash navigation puts the
  // anchor's top at the viewport top, which leaves the submit button
  // below the fold on most laptops — visitors have to scroll again to
  // see "Get download". Override: re-scroll so the BUTTON sits near
  // the bottom of the viewport (block: 'end' + a `scroll-margin-bottom`
  // breathing room), then focus the email input so they can start
  // typing without losing the button from view.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isTarget = () => window.location.hash === '#free-download-email'
    function landOnDownload() {
      if (!isTarget()) return
      // One frame after the browser's initial hash-jump scroll so our
      // override lands without fighting the easing. Smooth so the two
      // motions merge into a single feeling rather than a snap.
      window.requestAnimationFrame(() => {
        buttonRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
        // Wait for the scroll to settle before focusing the input —
        // `preventScroll` keeps focus from yanking the page back, but
        // we still want the button visible at the time the focus ring
        // appears so the visitor sees the full path: input → button.
        window.setTimeout(() => {
          inputRef.current?.focus({ preventScroll: true })
        }, 420)
      })
    }
    landOnDownload()
    window.addEventListener('hashchange', landOnDownload)
    return () => window.removeEventListener('hashchange', landOnDownload)
  }, [])

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  function startDownload() {
    window.location.assign('/download/latest')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || status === 'sending') {
      if (!isValid) setStatus('invalid')
      return
    }
    setStatus('sending')
    // Best-effort signup — a failure never blocks the download. We DO
    // surface the outcome though: the visitor stays on the page (the
    // download/dialog doesn't unload it), so a "check your inbox" /
    // "didn't go through" line is worth showing.
    let ok = false
    try {
      const res = await fetch('/api/free-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale: i18n.language,
          source: 'pricing-free',
        }),
        keepalive: true,
      })
      ok = res.ok
    } catch {
      // intentional: don't block download on network/api failure
    }
    setStatus(ok ? 'success' : 'error')
    // Platform check happens after the API ping so the email-capture
    // signup still lands even if the visitor cancels the download
    // (someone researching on Windows for a Mac at home is still a
    // qualified lead). On Mac or pre-hydration: go straight to the
    // download. On a confirmed non-Mac: open the dialog instead.
    if (detectIsMac()) {
      startDownload()
    } else {
      setMacConfirmOpen(true)
    }
  }

  return (
    <>
      {/* The form is the Free card's bottom-anchored flex child. It wraps
          PricingCardFooter, whose own `margin-top:auto` can't fire inside a
          block <form>, so the form carries `mt-auto` instead — this lines the
          "Get download" CTA up with "Get Lifetime" / "Become a patron". */}
      <form onSubmit={handleSubmit} noValidate className="mt-auto">
        <PricingCardFooter
          pre={
            <>
              <label
                htmlFor="free-download-email"
                className="block text-[0.74rem] font-medium uppercase tracking-[0.14em] text-sumi-soft/85"
              >
                {t('pricing.free.email.label')}
              </label>
              <input
                ref={inputRef}
                id="free-download-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status !== 'idle' && status !== 'sending') setStatus('idle')
                }}
                placeholder={t('pricing.free.email.placeholder')}
                aria-invalid={status === 'invalid'}
                className="mt-2 block h-11 w-full min-w-0 rounded-md border border-[color-mix(in_oklab,var(--sumi)_16%,transparent)] bg-[color-mix(in_oklab,var(--washi)_72%,#fff)] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/25"
              />
              {/* One line occupies this slot in every state, so the fixed
                  footer height never shifts: footnote → invalid/success/error. */}
              {status === 'success' ? (
                <p className="mt-2 inline-flex items-start gap-1.5 text-[0.73rem] leading-[1.55] text-matcha">
                  <Check className="mt-[2px] h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                  {t('pricing.free.email.success')}
                </p>
              ) : status === 'error' ? (
                <p role="alert" className="mt-2 text-[0.73rem] leading-[1.55] text-hinomaru">
                  {t('pricing.free.email.error')}
                </p>
              ) : status === 'invalid' ? (
                <p role="alert" className="mt-2 text-[0.73rem] leading-[1.55] text-hinomaru">
                  {t('pricing.free.email.errorInvalid')}
                </p>
              ) : (
                <p className="mt-2 text-[0.73rem] leading-[1.55] text-sumi-soft/90">
                  {t('pricing.free.email.footnote')}
                </p>
              )}
            </>
          }
          cta={
            <button
              ref={buttonRef}
              id="free-download-submit"
              type="submit"
              disabled={status === 'sending'}
              style={{ scrollMarginBottom: '1.25rem' }}
              className={`btn-sumi ${PRICING_CTA_BTN} disabled:opacity-70`}
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
          }
          post={
            <p className="text-center">
              <MacOnlyConfirm onConfirm={startDownload}>
                {({ onClick }) => (
                  <a
                    href="/download/latest"
                    onClick={onClick}
                    className="text-[0.8rem] font-medium text-sumi/90 underline decoration-[var(--line-strong)] underline-offset-[5px] transition-colors duration-[220ms] hover:text-sumi hover:decoration-sumi"
                  >
                    {t('pricing.free.email.skip')}
                  </a>
                )}
              </MacOnlyConfirm>
            </p>
          }
        />
      </form>
      <MacOnlyConfirmDialog
        open={macConfirmOpen}
        onOpenChange={setMacConfirmOpen}
        onContinue={() => {
          setMacConfirmOpen(false)
          startDownload()
        }}
      />
    </>
  )
}
