import {
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
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
import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { CurrencySwitcher } from '#/components/CurrencySwitcher'
import { PriceDisplay } from '#/components/zen/PriceDisplay'
import { Reveal } from '#/components/zen/Reveal'
import { PricingTerms } from '#/components/sections/PricingTerms'
import { MacScopeBadge, PRICING_CTA_BTN, PricingCardFooter } from '#/components/sections/PricingCardParts'
import { LimitedRedeemBar } from '#/components/sections/PricingRedeemBar'
import { FreeDownloadForm } from '#/components/sections/PricingFreeDownload'
import { TRIAL_DAYS } from '#/lib/polar'
import { usePremiumPrice, useLifetimePrice } from '#/lib/use-price'
import { useDiscountAvailability } from '#/lib/use-discount-availability'
import { PromoCode } from '#/components/PromoCode'

// Order mirrors `pricing.lifetime.items` in en.json:
// 1. lifetime updates (∞), 2. all features, 3. Meeting Guard,
// 4. unlimited history, 5. custom warning rules.
const lifetimeIcons: readonly LucideIcon[] = [InfinityIcon, Sparkles, Clock, Activity, Bell]
// Order mirrors `pricing.support.items` in en.json:
// 1. full Pro feature set, 2. you fund the next release, 3. direct line, 4. cancel anytime.
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
  const {
    remaining: zenmodeRemaining,
    live: hasLiveZenmodeCount,
  } = useDiscountAvailability()
  // "Launch is open" only when BOTH gates agree:
  //   1. ZENMODE redemption count > 0 (marketing scarcity bar)
  //   2. Polar's live price preview reports the discount is still being
  //      honoured AND the two amounts actually differ.
  //
  // Without the Polar gate, the strikethrough used to render even after
  // Polar quietly stopped applying ZENMODE — the page then showed
  // identical "was" and current prices because `lifetime.original` and `lifetime.discounted`
  // came back identical from `/api/price` while `zenmodeRemaining` was
  // still positive on our side.
  const hasRealDiscount =
    lifetime.hasDiscount && lifetime.original.amount > lifetime.discounted.amount
  // A confirmed Black Friday quote is a live discount on its own: it
  // does not depend on the launch code's redemption count.
  const blackFridayCode = lifetime.blackFridayCode
  // Launch copy needs the launch code AND redemptions left. Any other
  // real discount (Black Friday) shows its price without launch copy.
  const launchOpen =
    lifetime.isLaunchOffer && hasLiveZenmodeCount && zenmodeRemaining > 0 && hasRealDiscount
  const showDiscount = hasRealDiscount && (!lifetime.isLaunchOffer || launchOpen)
  // While the launch discount is active we show the discounted price as
  // the headline; once exhausted, the original full price becomes the
  // headline and the strikethrough is gone too.
  const lifetimePrice = showDiscount ? lifetime.discounted : lifetime.original
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
        {/* Currency belongs at the decision, not only in the footer. A
            visitor weighing the price shouldn't have to scroll past the
            whole page to find out the amounts come in their own currency. */}
        <Reveal delay={340} className="mt-6">
          <CurrencySwitcher />
        </Reveal>
      </div>

      {/* Three-card layout. Lifetime sits in the middle as the recommended
          tier (headline buy); Free on the left, Yearly Patron on
          the right as the lower-commitment yearly alternative. RECOMMENDED
          is an inline pill in the normal flow so the .paper-card > * rule
          doesn't pin it out of place. */}
      <div
        id="free-download-email"
        className="grid scroll-mt-20 gap-6 lg:grid-cols-3 lg:items-stretch"
      >
        {/* ---------- Free card (left) ---------- */}
        <Reveal delay={120} className="h-full">
          <article
            aria-labelledby="pricing-tier-free"
            className="paper-card flex h-full flex-col px-7 pt-7 pb-5 md:px-8 md:pt-8 md:pb-6"
          >
            <div className="flex min-h-[1.5rem] items-center gap-3">
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
                <span className="font-jp normal-case tracking-normal text-hinomaru-ink/80">日 {TRIAL_DAYS}</span>{' '}
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
            <div className="flex min-h-[1.5rem] items-center gap-3">
              <h3
                id="pricing-tier-lifetime"
                className="font-jp text-xs tracking-widest text-hinomaru-ink/80 m-0 font-normal"
              >
                {t('pricing.lifetime.tier')}
              </h3>
              {blackFridayCode ? (
                <span className="meta-label inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-hinomaru px-2 py-0.5 text-[#fdf8ee]">
                  {t('blackFriday.pill')}
                </span>
              ) : (
                <span className="meta-label inline-flex items-center gap-1 rounded-full bg-hinomaru/10 px-2 py-0.5 text-hinomaru-ink">
                  {t('common.recommended')}
                </span>
              )}
            </div>
            {/* Strikethrough only renders while ZENMODE has redemptions
                left. Once exhausted, the original price IS the headline
                price below — keeping a struck-through "was" line on
                top of that would be a lie. */}
            {showDiscount && (
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
            <MacScopeBadge label={t('pricing.lifetime.macsBadge')} accent />
            {blackFridayCode && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <PromoCode code={blackFridayCode} />
                <span className="text-[0.8125rem] leading-snug text-sumi-soft">
                  {t('blackFriday.appliedShort')}
                </span>
              </div>
            )}
            {/* Launch-discount marketing chrome (note + scarcity bar)
                appears ONLY while ZENMODE still has redemptions. Past
                that, the card reads as a plain lifetime product at
                full price, no stale urgency cues. */}
            {launchOpen && false && (
              <>
                <p className="mt-2 text-[0.75rem] uppercase tracking-[0.16em] font-medium text-hinomaru-ink/90">
                  {t('pricing.lifetime.discountNote')}
                </p>
                <LimitedRedeemBar fullPriceFormatted={lifetime.original.formatted} />
              </>
            )}
            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="meta-label mt-6 font-jp text-hinomaru-ink/80">
              {t('pricing.lifetime.premiumAdds')}
            </p>
            <ul className="mt-4 space-y-4">
              {lifetimeFeatures.map(({ title, body }, idx) => {
                const Icon = lifetimeIcons[idx] ?? Sparkles
                return (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--hinomaru)_10%,var(--washi))] text-hinomaru-ink">
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
        {/* `paper-card--muted` recedes this tier: flatter background, softer
            elevation, slightly lowered opacity (restored on hover). It reads
            as the quiet support option next to the Free and RECOMMENDED
            Lifetime cards, not a competing headline buy. */}
        <Reveal delay={320} className="h-full">
          <article
            aria-labelledby="pricing-tier-support"
            className="paper-card paper-card--muted flex h-full flex-col px-7 pt-7 pb-5 md:px-8 md:pt-8 md:pb-6"
          >
            {/* Single-line tier label (min-h shared with the Free and
                Lifetime headers so all three price rows align). The "support
                indie development" message is carried by the blurb and the
                gold "You fund the next release" perk, not a loud header pill —
                keeping this receded tier quiet. */}
            <div className="flex min-h-[1.5rem] items-center gap-2">
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
                          <span className="ml-auto shrink-0 inline-flex rotate-3 items-center rounded-full border border-hinomaru/35 bg-[color-mix(in_oklab,var(--hinomaru)_12%,var(--washi))] px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-hinomaru-ink">
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
                  className={`btn-sumi-soft border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_40%,var(--paper-lift))] ${PRICING_CTA_BTN}`}
                >
                  <Heart
                    className="h-4 w-4 text-hinomaru-ink fill-transparent transition-[fill,transform] duration-[460ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:fill-current group-hover:scale-110"
                    strokeWidth={1.8}
                  />
                  {t('pricing.support.ctaLabel')}
                </Link>
              }
            />
          </article>
        </Reveal>
      </div>

      <PricingTerms />
    </section>
  )
}
