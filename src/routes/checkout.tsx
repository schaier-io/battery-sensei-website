import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  Sparkles,
  Heart,
  XCircle,
  Mail,
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Hanko } from '#/components/zen/Hanko'
import { PolarInlineCheckout } from '#/components/PolarInlineCheckout'
import { PriceDisplay } from '#/components/zen/PriceDisplay'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { useDiscountAvailability } from '#/lib/use-discount-availability'
import { usePremiumPrice, useLifetimePrice } from '#/lib/use-price'

const SITE_URL = 'https://battery-sensei.app'
const PATH = '/checkout'
const PAGE_TITLE = 'Checkout — Battery Sensei Pro'
const PAGE_DESC =
  'Secure purchase of Battery Sensei Pro through Polar. Lifetime or yearly support. Promo codes accepted. 14-day refund guarantee.'

const tierSchema = z.enum(['lifetime', 'support']).catch('lifetime')
type Tier = z.infer<typeof tierSchema>

export const Route = createFileRoute('/checkout')({
  validateSearch: (search) => ({
    tier: tierSchema.parse((search as { tier?: unknown }).tier),
  }),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      // Checkout pages are not search-index targets — keep them out of SERPs
      // but let crawlers still follow the back-to-home link for site graph.
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: CheckoutPage,
})

function CheckoutPage() {
  const { t } = useTranslation()
  const { tier } = Route.useSearch()
  const navigate = Route.useNavigate()
  const yearly = usePremiumPrice()
  const lifetime = useLifetimePrice()
  // ZENMODE availability gates every "launch discount" surface on the
  // page: the strikethrough above the headline price, the
  // "ZENMODE applied" pill, and the inline hint chip above the embed.
  // Once `remaining` hits 0 we revert to the full lifetime price and
  // hide all of them — no stale urgency.
  const { remaining: zenmodeRemaining } = useDiscountAvailability()
  const launchOpen = zenmodeRemaining > 0

  const isLifetime = tier === 'lifetime'

  // Lifetime headline price is the ZENMODE-discounted figure while the
  // launch is open; falls back to the original full price once the cap
  // is reached. Support tier is the plain yearly recurring price.
  const price = isLifetime
    ? launchOpen
      ? lifetime.discounted
      : lifetime.original
    : yearly

  const summaryLines = (t('checkout.summaryLines', { returnObjects: true }) as {
    lifetime: string[]
    support: string[]
  })[tier]
  const headingMain = (t('checkout.heading', { returnObjects: true }) as Record<Tier, string>)[tier]
  const headingItalic = (t('checkout.headingItalic', {
    returnObjects: true,
  }) as Record<Tier, string>)[tier]
  const intro = (t('checkout.intro', { returnObjects: true }) as Record<Tier, string>)[tier]
  const priceLabel = (t('checkout.priceLabel', {
    returnObjects: true,
  }) as Record<Tier, string>)[tier]

  function switchTier(next: Tier) {
    if (next === tier) return
    void navigate({ search: { tier: next }, replace: true })
  }

  return (
    <>
      <Nav />
      <main className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
        <div className="mb-10 flex flex-col items-center text-center">
          <Hanko kanji="会" className="mb-5" />
          <Reveal as="p" delay={120} className="kicker-row mb-4">
            {t('checkout.kicker')}
          </Reveal>
          <Reveal as="h1" delay={200} className="section-heading text-sumi max-w-2xl">
            {headingMain}
            <span className="block italic text-sumi-soft font-normal">
              {headingItalic}
            </span>
          </Reveal>
          <Reveal
            as="p"
            delay={280}
            className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
          >
            {intro}
          </Reveal>
        </div>

        {/* Tier toggle — segmented control swapping between Lifetime and
            yearly Ongoing Developer Support. Stays in URL via ?tier= so a
            user can deep-link or refresh without losing their selection. */}
        <Reveal delay={160}>
          <div
            role="tablist"
            aria-label={t('checkout.tierToggleLabel')}
            className="mb-6 inline-flex w-full rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] p-1 sm:w-auto"
          >
            <TierTab
              active={isLifetime}
              onClick={() => switchTier('lifetime')}
              label={t('checkout.tierLifetime')}
            />
            <TierTab
              active={!isLifetime}
              onClick={() => switchTier('support')}
              label={t('checkout.tierSupport')}
            />
          </div>
        </Reveal>

        <Reveal delay={200}>
          <article className="paper-card p-7 md:p-10">
            {/* Summary block — price + what you get, mirrors the matching
                card on the homepage. Lifetime adds a strikethrough original. */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <span className="font-jp text-xs tracking-widest text-hinomaru/80 uppercase">
                  {t('checkout.summaryTitle')}
                </span>
                <h2 className="display-title mt-1 text-[1.5rem] font-medium text-sumi leading-tight">
                  Battery Sensei Pro
                </h2>
              </div>
              <div className="text-right">
                <span className="block text-xs uppercase tracking-[0.22em] text-sumi-soft">
                  {priceLabel}
                </span>
                <PriceDisplay
                  entry={price}
                  className="display-title inline-flex items-baseline text-[2rem] md:text-[2.5rem] font-medium text-sumi leading-none"
                />
                {/* Strikethrough only when the launch discount is live.
                    Once ZENMODE is exhausted the headline IS the
                    original price; a "was X" line over the same number
                    would be a lie. */}
                {isLifetime && launchOpen ? (
                  <span className="mt-1 block text-[0.6875rem] text-nezumi">
                    {t('checkout.originalLabel')}{' '}
                    <span className="line-through decoration-hinomaru/50">
                      <PriceDisplay
                        entry={lifetime.original}
                        className="inline-flex items-baseline"
                        symbolClassName="text-[0.85em] font-sans text-nezumi"
                      />
                    </span>
                  </span>
                ) : null}
                {price.taxNote ? (
                  <span className="mt-1 block text-[0.6875rem] text-nezumi">
                    {price.taxNote}
                  </span>
                ) : null}
              </div>
            </header>

            {/* Launch-discount chip with live remaining count. Replaces
                the older static "ZENMODE applied" pill — same intent,
                but now visible above the fold and self-updating from
                /api/discount-availability. Hidden once the cap is hit
                so we don't dangle "0 codes left" stale copy. */}
            {isLifetime && launchOpen ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-hinomaru/10 px-3 py-1 text-[0.75rem] font-medium text-hinomaru tabular-nums">
                <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                <Trans
                  i18nKey="checkout.inline.hint"
                  values={{ remaining: zenmodeRemaining }}
                  components={[<span className="font-semibold" />]}
                />
              </p>
            ) : null}

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {summaryLines.map((line) => {
                const Icon = isLifetime ? Sparkles : Heart
                return (
                  <li
                    key={line}
                    className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-sumi-soft"
                  >
                    <Icon
                      className="mt-[3px] h-3.5 w-3.5 shrink-0 text-hinomaru/80"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                )
              })}
            </ul>

            <div aria-hidden className="my-7 h-px w-full bg-[var(--line)]" />

            {/* Live-count chip moved up next to the price (above the
                fold). Polar iframe drops straight under the divider
                here — no extra chrome between the visitor's eyes and
                the card form. */}
            <div className="mt-5">
              <PolarInlineCheckout tier={tier} />
            </div>

            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.75rem] text-nezumi">
              {isLifetime ? (
                <>
                  <li className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                    {t('pricing.lifetime.trust.notarized')}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <RotateCcw className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                    {t('checkout.refundNote')}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                    {t('pricing.lifetime.trust.noSub')}
                  </li>
                </>
              ) : (
                <>
                  <li className="inline-flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                    {t('pricing.support.badge')}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Mail className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                    {
                      (t('pricing.support.items', { returnObjects: true }) as string[])[3]
                    }
                  </li>
                </>
              )}
            </ul>
          </article>
        </Reveal>

        <Reveal delay={300}>
          <p className="mt-6 text-center text-[0.875rem] text-sumi-soft">
            <Trans
              i18nKey={isLifetime ? 'checkout.lifetimeSwapNote' : 'checkout.supportSwapNote'}
              components={[
                <button
                  type="button"
                  onClick={() => switchTier(isLifetime ? 'support' : 'lifetime')}
                  className="underline decoration-dotted underline-offset-4 hover:text-sumi"
                />,
              ]}
            />
          </p>
        </Reveal>

        {/* Activation pane — moved here from the Pricing card.
            Buyers see it after they've decided to purchase, not while
            still browsing. Keeps the pricing cards short. */}
        <Reveal delay={340}>
          <aside className="mt-8 rounded-md border border-dashed border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-5 py-4">
            <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] font-medium text-sumi-soft">
              <span className="font-jp normal-case tracking-normal text-hinomaru/80">鍵</span>
              {t('pricing.lifetime.activationLabel')}
            </p>
            <p className="mt-2 text-[0.875rem] leading-snug text-sumi-soft">
              <Trans
                i18nKey="pricing.lifetime.activationBody"
                components={[<span className="font-medium text-sumi" />]}
              />
            </p>
          </aside>
        </Reveal>

        <Reveal delay={400}>
          <aside className="mt-4 rounded-md border border-dashed border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-5 py-4">
            <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] font-medium text-sumi-soft">
              <span className="font-jp normal-case tracking-normal text-hinomaru/80">鍵</span>
              {t('checkout.alreadyOwnTitle')}
            </p>
            <p className="mt-2 text-[0.875rem] leading-snug text-sumi-soft">
              {t('checkout.alreadyOwnBody')}
            </p>
            {/* Newcomers occasionally land here without Sensei installed
                — usually visitors clicking through from a referral with
                a key in hand. Surface the download as an outlined
                secondary CTA so it's reachable without burying the
                primary "paste your key" instructions above. */}
            <a
              href="/download/latest"
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)] px-3.5 text-[0.8125rem] font-medium text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_35%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              {t('checkout.alreadyOwnDownload')}
            </a>
          </aside>
        </Reveal>

        <div className="mt-10 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[0.875rem] text-sumi-soft hover:text-sumi"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            {t('checkout.backToHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}

function TierTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      // Inactive tabs get a soft washi-tint hover background + sumi
      // text shift so the toggle feels alive on pointer move; the
      // active tab keeps its sumi pill and only deepens slightly on
      // hover so the click target stays self-evident.
      className={[
        'flex-1 rounded-[5px] px-4 py-2 text-[0.8125rem] font-medium',
        'transition-colors duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--washi)]',
        active
          ? 'bg-sumi text-[var(--washi)] shadow-sm hover:bg-[color-mix(in_oklab,var(--sumi)_92%,#000)]'
          : 'text-sumi-soft hover:text-sumi hover:bg-[color-mix(in_oklab,var(--washi)_40%,#fff)]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
