import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  Sparkles,
  Tag,
  Heart,
  XCircle,
  Mail,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Hanko } from '#/components/zen/Hanko'
import { PriceDisplay } from '#/components/zen/PriceDisplay'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import {
  LIFETIME_DISCOUNT_CODE,
  lifetimeCheckoutUrl,
  supportCheckoutUrl,
} from '#/lib/polar'
import { usePremiumPrice, useLifetimePrice } from '#/lib/use-price'
import { usePolarCheckout } from '#/lib/use-polar-embed'

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
  const openPolarCheckout = usePolarCheckout()
  const yearly = usePremiumPrice()
  const lifetime = useLifetimePrice()
  const [discountCode, setDiscountCode] = useState('')

  const isLifetime = tier === 'lifetime'

  // Lifetime card shows the discounted ZENMODE price (first 500 buyers);
  // Support tier is the plain yearly recurring price. Both update live as
  // /api/price returns the visitor's currency.
  const price = isLifetime ? lifetime.discounted : yearly

  // Recompute the Polar URL whenever the user types so the link always
  // carries the latest discount code at click time. Both tier helpers
  // accept a discountCode override — lifetimeCheckoutUrl falls back to
  // ZENMODE when nothing is typed.
  const checkoutHref = useMemo(() => {
    return isLifetime
      ? lifetimeCheckoutUrl({ discountCode })
      : supportCheckoutUrl({ discountCode })
  }, [isLifetime, discountCode])

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
                {isLifetime ? (
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

            {isLifetime ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-hinomaru/10 px-3 py-1 text-[0.75rem] font-medium text-hinomaru">
                <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
                {t('checkout.lifetimeAutoNote')}
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

            {/* Promo code field — local-only validation; Polar verifies the
                code server-side when checkout loads. We pre-fill via the URL
                so a wrong code surfaces inside the Polar form, not as a
                guessing game on our side. */}
            <label
              htmlFor="checkout-promo"
              className="flex flex-col gap-2"
            >
              <span className="flex items-center gap-2 text-[0.8125rem] font-medium uppercase tracking-[0.2em] text-sumi">
                <Tag className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {t('checkout.discountLabel')}
              </span>
              <input
                id="checkout-promo"
                name="discount_code"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                maxLength={64}
                placeholder={
                  isLifetime ? LIFETIME_DISCOUNT_CODE : t('checkout.discountPlaceholder')
                }
                className="h-11 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3 text-[0.9375rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/30"
              />
            </label>

            <a
              href={checkoutHref}
              onClick={(e) => {
                e.preventDefault()
                // `discountCode` carries whatever the visitor typed into
                // the promo field. If the embed-session API fails the
                // hook now shows an inline error overlay (no off-domain
                // redirect) — the anchor's `href` still works as a
                // no-JS escape hatch.
                void openPolarCheckout({
                  tier: isLifetime ? 'lifetime' : 'support',
                  discountCode: discountCode || undefined,
                })
              }}
              className="btn-sumi group mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-[0.9375rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              aria-label={t('checkout.continueAria')}
            >
              {isLifetime ? (
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              ) : (
                <Heart className="h-4 w-4" strokeWidth={1.8} />
              )}
              {t('checkout.continueAction')}
            </a>

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
      className={`flex-1 rounded-[5px] px-4 py-2 text-[0.8125rem] font-medium transition-colors duration-200 ${
        active
          ? 'bg-sumi text-[var(--washi)] shadow-sm'
          : 'text-sumi-soft hover:text-sumi'
      }`}
    >
      {label}
    </button>
  )
}
