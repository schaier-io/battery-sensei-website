import { Link } from '@tanstack/react-router'
import { Download, MessageCircle, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '#/components/LanguageSwitcher'
import { CurrencySwitcher } from '#/components/CurrencySwitcher'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'
import { useLifetimePrice } from '#/lib/use-price'

export function Footer() {
  const lifetime = useLifetimePrice()
  const price = lifetime.discounted
  const { t } = useTranslation()
  return (
    <footer className="relative border-t border-[var(--line)] py-10 sm:py-12 lg:py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 text-center sm:gap-6">
        {/* Brand block — logo + wordmark + tagline grouped tight so the
            three lines read as one mark instead of three spaced rows. */}
        <div className="flex flex-col items-center gap-2.5">
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
              className="h-11 w-11 sm:h-12 sm:w-12"
            />
            <span className="flex items-baseline gap-2.5 leading-none">
              <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi">
                Battery Sensei
              </span>
              <span aria-hidden className="text-[var(--line-strong)] text-[10px]">·</span>
              <span className="font-jp text-[10px] tracking-[0.36em] text-hinomaru">
                電池先生
              </span>
            </span>
          </div>
          <p className="font-display italic text-[0.9rem] text-nezumi max-w-md leading-snug sm:text-[0.95rem]">
            {t('footer.tagline')}
          </p>
        </div>

        {/* Actions row — at <sm stacks vertical; from sm wraps to two
            rows naturally; at lg+ collapses to ONE horizontal row that
            holds [Download free · Get in touch · Purchase · Lang · Currency].
            Items-center keeps the h-10 buttons and h-9 chips on the
            same visual centerline. */}
        <div
          aria-label={t('footer.ariaGetApp')}
          className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap lg:gap-3.5"
        >
          <a
            href="/#free-download-email"
            className="group inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-5 text-[0.875rem] font-medium text-sumi transition-[colors,transform,box-shadow] duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] hover:shadow-[0_3px_10px_-6px_rgba(28,26,23,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Download
              className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
              strokeWidth={1.7}
            />
            {t('common.downloadFree')}
          </a>

          <a
            href="#contact"
            aria-label={t('nav.supportAria')}
            className="group inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3 text-[12px] font-medium uppercase tracking-[0.18em] text-sumi-soft transition-[colors,transform] duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:text-hinomaru hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            <span>{t('nav.support')}</span>
          </a>

          <Link
            to="/checkout"
            search={{ tier: 'lifetime', cur: undefined }}
            className="btn-sumi group inline-flex h-10 items-center justify-center gap-2.5 rounded-md px-5 text-[0.875rem] font-medium transition-[transform,box-shadow] duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:shadow-[0_6px_18px_-8px_rgba(28,26,23,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Sparkles
              className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:rotate-[10deg]"
              strokeWidth={1.7}
            />
            <span>{t('common.purchaseNow')}</span>
            <span aria-hidden className="text-washi/40">·</span>
            <span className="tabular-nums text-washi/85">{price.formatted}</span>
          </Link>

          {/* Lang + Currency are h-9 chips by default; the parent
              `items-center` centerlines them with the h-10 buttons. */}
          <LanguageSwitcher />
          <CurrencySwitcher />
        </div>

        {/* Hairline divider — narrow centered brush so the secondary
            nav below reads as the footer's colophon row. */}
        <span
          aria-hidden
          className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent"
        />

        <nav
          aria-label={t('footer.ariaFooter')}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[0.8125rem] text-sumi-soft"
        >
          <a href="#contact" className="zen-link-lift">
            {t('footer.contact')}
          </a>
          <FooterDot />
          <a
            href="https://github.com/schaier-io/battery-sensei-releases/issues/new/choose"
            target="_blank"
            rel="noreferrer"
            className="zen-link-lift"
          >
            {t('footer.reportIssue')}
          </a>
          <FooterDot />
          <a
            href="https://github.com/schaier-io/battery-sensei-releases"
            target="_blank"
            rel="noreferrer"
            className="zen-link-lift"
          >
            {t('footer.releases')}
          </a>
          <FooterDot />
          <a href="#pricing" className="zen-link-lift">
            {t('footer.pricing')}
          </a>
          <FooterDot />
          {/* Polar customer portal — buyers sign in with the email
              they used at checkout to view receipts, manage the
              subscription, or resend a lost license key. */}
          <a
            href={CUSTOMER_PORTAL_URL}
            target="_blank"
            rel="noreferrer"
            className="zen-link-lift"
          >
            {t('footer.managePurchase')}
          </a>
          <FooterDot />
          <Link to="/privacy" className="zen-link-lift">
            {t('privacy.footerLink')}
          </Link>
          <FooterDot />
          <Link to="/legal" className="zen-link-lift">
            {t('legal.footerLink')}
          </Link>
        </nav>

        <p className="text-[0.7rem] tracking-[0.06em] text-nezumi tabular-nums">
          {t('footer.copyright', { year: new Date().getFullYear() })}
          <span className="mx-2 text-nezumi/60" aria-hidden>·</span>
          <time dateTime="2026-05-24">{t('footer.lastUpdated')}</time>
        </p>
      </div>
    </footer>
  )
}

function FooterDot() {
  return (
    <span aria-hidden className="text-[10px] leading-none text-[var(--line-strong)]">
      ·
    </span>
  )
}
