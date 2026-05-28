import { Link } from '@tanstack/react-router'
import { Download, MessageCircle } from 'lucide-react'
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
          <div className="flex items-center gap-3">
            <img
              src="/logo-256.webp"
              srcSet="/logo-256.webp 1x, /logo-512.webp 2x"
              width="48"
              height="48"
              alt="Battery Sensei logo"
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

        {/* Actions row — single primary chip (Download free) + the two
            preference switchers. Earlier rev had Download + Get-in-touch
            + Purchase + Lang + Currency all jostling in one line, which
            read as a button salad. Purchase moved up to the Pricing
            section + Nav CTA; Get-in-touch dropped to a quiet text
            link below the row. */}
        <div
          aria-label={t('footer.ariaGetApp')}
          className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <a
            href="/#free-download-email"
            className="btn-sumi group inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-[0.875rem] font-medium transition-[transform,box-shadow] duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:shadow-[0_6px_18px_-8px_rgba(28,26,23,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Download
              className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
              strokeWidth={1.7}
            />
            {t('common.downloadFree')}
          </a>

          <LanguageSwitcher />
          <CurrencySwitcher />
        </div>

        {/* Quiet link + icon, beneath the actions row. Replaces the
            UPPERCASE "Get in touch" chip — same destination, less
            shouty visual weight. */}
        <a
          href="#contact"
          className="group inline-flex items-center gap-1.5 text-[0.8125rem] text-sumi-soft underline-offset-[5px] decoration-[var(--line-strong)] transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-hinomaru hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:rounded-md"
        >
          <MessageCircle
            className="h-3.5 w-3.5 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-px"
            strokeWidth={1.7}
            aria-hidden
          />
          <span>{t('nav.support')}</span>
        </a>

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
