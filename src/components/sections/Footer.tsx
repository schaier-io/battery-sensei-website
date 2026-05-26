import { Download, MessageCircle, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '#/components/LanguageSwitcher'
import { lifetimeCheckoutUrl } from '#/lib/polar'
import { useLifetimePrice } from '#/lib/use-price'

export function Footer() {
  const lifetime = useLifetimePrice()
  const price = lifetime.discounted
  const { t } = useTranslation()
  return (
    <footer className="relative border-t border-[var(--line)] py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center">
        <div className="flex items-center gap-3">
          <img
            src="/logo-256.webp"
            srcSet="/logo-256.webp 1x, /logo-512.webp 2x"
            width="48"
            height="48"
            alt=""
            aria-hidden
            decoding="async"
            loading="lazy"
            className="h-12 w-12"
          />
          <span className="flex items-baseline gap-2.5 leading-none">
            <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi">
              Battery Sensei
            </span>
            <span aria-hidden className="text-hinomaru/60 text-[10px]">·</span>
            {/* Full hinomaru red — replaces the previously stacked Hanko seal
                as the page's red beat. Keeps the brand mark compact while
                preserving the ink-on-washi accent the footer needs. */}
            <span className="font-jp text-[10px] tracking-[0.36em] text-hinomaru">
              電池先生
            </span>
          </span>
        </div>

        <p className="font-display italic text-[0.95rem] text-nezumi max-w-md leading-snug">
          {t('footer.tagline')}
        </p>

        <div
          aria-label={t('footer.ariaGetApp')}
          className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <a
            href="/download/latest"
            className="group inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-5 text-[0.875rem] font-medium text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Download
              className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
              strokeWidth={1.7}
            />
            {t('common.downloadFree')}
          </a>
          <a
            href={lifetimeCheckoutUrl()}
            className="group inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-5 text-[0.875rem] font-medium text-sumi transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <ShoppingBag
              className="h-4 w-4 text-hinomaru transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
              strokeWidth={1.7}
            />
            {t('common.purchaseNow')}
            <span className="text-nezumi font-normal">{t('footer.purchaseSub', { price: price.formatted })}</span>
          </a>
        </div>

        {/* Header utilities relocated for sub-lg viewports. The header
            drops the chat icon + language switcher below lg to keep the
            wordmark visible without crowding the nav; this row puts both
            back in reach without forcing a hamburger trip. The lg:hidden
            keeps it invisible on desktop where the header already shows
            both, so the affordance only appears where it's needed. */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:hidden">
          <a
            href="#contact"
            aria-label={t('nav.supportAria')}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-3 text-[0.8125rem] text-sumi-soft transition-colors duration-200 hover:text-hinomaru hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            <span>{t('nav.support')}</span>
          </a>
          <LanguageSwitcher />
        </div>

        <nav
          aria-label={t('footer.ariaFooter')}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.8125rem] text-sumi-soft"
        >
          <a href="#contact" className="hover:text-sumi transition-colors">
            {t('footer.contact')}
          </a>
          <span aria-hidden className="text-nezumi/50">·</span>
          <a
            href="https://github.com/schaier-io/battery-sensei-releases/issues/new/choose"
            target="_blank"
            rel="noreferrer"
            className="hover:text-sumi transition-colors"
          >
            {t('footer.reportIssue')}
          </a>
          <span aria-hidden className="text-nezumi/50">·</span>
          <a
            href="https://github.com/schaier-io/battery-sensei-releases"
            target="_blank"
            rel="noreferrer"
            className="hover:text-sumi transition-colors"
          >
            {t('footer.releases')}
          </a>
          <span aria-hidden className="text-nezumi/50">·</span>
          <a href="#pricing" className="hover:text-sumi transition-colors">
            {t('footer.pricing')}
          </a>
        </nav>

        <p className="text-[0.75rem] tracking-[0.05em] text-nezumi tabular-nums">
          {t('footer.copyright', { year: new Date().getFullYear() })}
          <span className="mx-2 text-nezumi/60" aria-hidden>·</span>
          <time dateTime="2026-05-20">{t('footer.lastUpdated')}</time>
        </p>
      </div>
    </footer>
  )
}
