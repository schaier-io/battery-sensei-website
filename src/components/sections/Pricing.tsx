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
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
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
            className="paper-card flex h-full flex-col p-7 md:p-8"
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
            <div className="mt-2 flex items-baseline gap-2">
              <PriceDisplay
                entry={{ amount: 0, currency: yearly.currency, locale: yearly.locale }}
                className="display-title inline-flex items-baseline text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none"
              />
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
            <div className="mt-auto pt-8">
              <div className="rounded-md border border-dashed border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-4 py-3.5">
                <p className="meta-label flex items-center gap-2 text-sumi-soft">
                  <span className="font-jp normal-case tracking-normal text-hinomaru/80">日 {TRIAL_DAYS}</span>
                  {t('pricing.free.trialEnd', { day: TRIAL_DAYS })}
                </p>
                <p className="mt-2 text-[0.875rem] leading-snug text-sumi-soft">
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
          <article
            aria-labelledby="pricing-tier-lifetime"
            className="paper-card flex h-full flex-col p-7 md:p-8 ring-1 ring-hinomaru/20"
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
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              {t('pricing.lifetime.blurb', { lifetimeScope })}
            </p>

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

            {/* Trust line + CTA bundled in mt-auto so they sit glued
                together at the bottom — peak-end rule: trust is the
                last thing the visitor reads before clicking. The
                trust line uses `min-h-[2.5rem]` so its row always
                reserves the same vertical space across all three
                cards (Free / Lifetime / Support), keeping the CTA
                buttons aligned even when one locale's trust copy
                wraps to two lines. */}
            <div className="mt-auto pt-8">
              <p className="inline-flex min-h-[2.5rem] items-center gap-1.5 text-[0.75rem] text-sumi-soft">
                <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                {t('pricing.lifetime.trust.combined', {
                  lifetimeScopeShort,
                  yearlyScopeShort,
                  notarizedCombined,
                })}
              </p>
              <Link
                to="/checkout"
                search={{ tier: 'lifetime', cur: undefined }}
                className="btn-sumi group mt-3 mb-9 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                {t('pricing.lifetime.ctaLabel')}
              </Link>
            </div>
          </article>
        </Reveal>

        {/* ---------- Yearly Patron card (right) ---------- */}
        <Reveal delay={320} className="h-full">
          <article
            aria-labelledby="pricing-tier-support"
            className="paper-card flex h-full flex-col p-7 md:p-8"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="pricing-tier-support"
                className="font-jp text-xs tracking-widest text-sumi-soft m-0 font-normal"
              >
                {t('pricing.support.tier')}
              </h3>
              <span className="meta-label inline-flex items-center gap-1 rounded-full bg-sumi/5 px-2 py-0.5 text-sumi-soft">
                {t('pricing.support.badge')}
              </span>
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
                return (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sumi/5 text-sumi-soft">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-medium text-sumi leading-tight">
                        {title}
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

            {/* Same pattern as Lifetime: trust + CTA bundled at the
                bottom so the white space lives ABOVE the conversion
                block. Trust line uses `min-h-[2.5rem]` so all three
                cards reserve the same vertical area and the buttons
                end on the same baseline. */}
            <div className="mt-auto pt-8">
              <p className="inline-flex min-h-[2.5rem] items-center gap-1.5 text-[0.75rem] text-sumi-soft">
                <RefreshCw className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                {t('pricing.lifetime.trust.subscription', {
                  lifetimeScopeShort,
                  yearlyScopeShort,
                  notarizedCombined,
                })}
              </p>
              <Link
                to="/checkout"
                search={{ tier: 'support', cur: undefined }}
                className="btn-sumi-soft group mt-3 mb-9 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-6 text-sm font-medium text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_40%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <Heart className="h-4 w-4 text-hinomaru" strokeWidth={1.8} />
                {t('pricing.support.ctaLabel')}
              </Link>
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
  const { max, remaining, live } = useDiscountAvailability()
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
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
    <form onSubmit={handleSubmit} className="mt-5" noValidate>
      <label
        htmlFor="free-download-email"
        className="meta-label block text-center text-sumi-soft"
      >
        {t('pricing.free.email.label')}
      </label>

      {/* Input + CTA are always stacked. On the previous side-by-side
          layout the placeholder `you@example.com` got chopped on small
          phones once the h-11 button squeezed alongside it; stacking
          also makes the submit button a full-width affordance that
          visually parallels the Lifetime / Support CTAs in the
          neighbouring cards, so all three columns end on the same
          shape. */}
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
          if (status === 'error') setStatus('idle')
        }}
        placeholder={t('pricing.free.email.placeholder')}
        className="mt-2 block h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/30"
      />
      {/* Footnote sits directly under the input so the "what you're
          signing up for" disclosure is read BEFORE the visitor commits
          to the click — reciprocity is clearest when the ask is named
          before the button label, not after. */}
      <p className="mt-2 text-center text-[0.75rem] leading-[1.5] text-sumi-soft">
        {t('pricing.free.email.footnote')}
      </p>
      <button
        ref={buttonRef}
        id="free-download-submit"
        type="submit"
        disabled={status === 'sending'}
        // `scroll-margin-bottom` gives the button breathing room from
        // the viewport edge when `scrollIntoView({ block: 'end' })` lands
        // on it from a Download link click — sits ~1.25rem above the
        // bottom edge instead of glued to it.
        style={{ scrollMarginBottom: '1.25rem' }}
        className="btn-sumi group mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] disabled:opacity-70"
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
      {/* `role="alert"` so screen readers announce validation failures
          the moment they appear; the visual hinomaru text already
          carries the visual signal. */}
      {status === 'error' && (
        <p role="alert" className="mt-1.5 text-center text-[0.75rem] text-hinomaru">
          {t('pricing.free.email.errorInvalid')}
        </p>
      )}
      {/* Skip link is intentionally bolder than the footnote above —
          self-determination beats "captured" lead-gen, and we don't want
          visitors to feel the email is a hard paywall. Underline always
          visible so it reads as an actionable second path, not legalese. */}
      <p className="mt-2 text-center">
        <MacOnlyConfirm onConfirm={startDownload}>
          {({ onClick }) => (
            <a
              href="/download/latest"
              onClick={onClick}
              className="text-[0.75rem] font-semibold text-sumi underline decoration-[var(--line-strong)] underline-offset-[5px] transition-colors duration-[220ms] hover:text-sumi hover:decoration-sumi"
            >
              {t('pricing.free.email.skip')}
            </a>
          )}
        </MacOnlyConfirm>
      </p>
      {/* Controlled dialog for the form-submit path. The render-prop
          variant above handles its own state for the skip-link click;
          this one is opened from `handleSubmit` after the email POST. */}
      <MacOnlyConfirmDialog
        open={macConfirmOpen}
        onOpenChange={setMacConfirmOpen}
        onContinue={() => {
          setMacConfirmOpen(false)
          startDownload()
        }}
      />
    </form>
  )
}
