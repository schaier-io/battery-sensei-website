import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '#/components/LanguageSwitcher'
import { CurrencySwitcher } from '#/components/CurrencySwitcher'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="relative border-t border-[var(--line)] py-10 sm:py-12 lg:py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 text-center sm:gap-6">
        {/* Brand block — logo + wordmark + tagline grouped tight so the
            three lines read as one mark instead of three spaced rows. */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden sm:h-12 sm:w-12">
              <img
                src="/logo-256.webp"
                srcSet="/logo-256.webp 1x, /logo-512.webp 2x"
                width="48"
                height="48"
                alt="Battery Sensei logo"
                decoding="async"
                loading="lazy"
                className="h-11 w-11 scale-[1.12] sm:h-12 sm:w-12"
              />
            </span>
            <span className="flex items-baseline gap-2.5 leading-none">
              <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi">
                Battery Sensei
              </span>
              <span aria-hidden className="text-[var(--line-strong)] text-[10px]">·</span>
              <span className="font-jp text-[10px] tracking-[0.36em] text-hinomaru">
                電池先生
              </span>
            </span>
            <div
              aria-label={t('footer.ariaPrefs')}
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            >
              <LanguageSwitcher />
              <CurrencySwitcher />
            </div>
          </div>
          <p className="font-display italic text-[0.9rem] text-nezumi max-w-md leading-snug sm:text-[0.95rem]">
            {t('footer.tagline')}
          </p>
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
            {t('nav.support')}
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
          {/* English-only links (no i18n key) — the journal and glossary
              stay EN-only for now while we build out the content.
              Footer label is hardcoded; translations can be added later
              once we localize the body content. */}
          <Link to="/blog" className="zen-link-lift">
            Journal
          </Link>
          <FooterDot />
          <Link to="/glossary" className="zen-link-lift">
            Glossary
          </Link>
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
