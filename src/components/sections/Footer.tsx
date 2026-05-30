import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '#/components/LanguageSwitcher'
import { CurrencySwitcher } from '#/components/CurrencySwitcher'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

// Build-time injected ISO date of the latest meaningful commit
// (vite.config.ts → `lastUpdated()`). Falls back to today if git is
// unavailable (sandbox builds). This replaces the formerly hand-edited
// "Last updated 28 May 2026" string in the i18n locales — the date now
// updates automatically on every deploy that touches user-facing files.
declare const __LAST_UPDATED__: string
const LAST_UPDATED_ISO: string =
  typeof __LAST_UPDATED__ !== 'undefined'
    ? __LAST_UPDATED__
    : new Date().toISOString().slice(0, 10)

// Map i18n language codes to Intl locale tags. Keeps the date format
// idiomatic in each locale ("28 May 2026" / "28. Mai 2026" / "2026年5月28日")
// without baking the date into the translation string.
const INTL_LOCALES: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
}

function formatLastUpdated(iso: string, lang: string): string {
  // YYYY-MM-DD → local-format day month year. Parse as UTC noon to
  // dodge timezone day-boundary skew (no DST math needed at noon).
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  const tag = INTL_LOCALES[lang.split('-')[0]] ?? 'en-GB'
  try {
    return new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}

export function Footer() {
  const { t, i18n } = useTranslation()
  const formattedDate = formatLastUpdated(LAST_UPDATED_ISO, i18n.language)
  return (
    <footer className="relative border-t border-[var(--line)] py-10 sm:py-12 lg:py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 text-center sm:gap-6">
        {/* Brand block — logo + wordmark + tagline grouped tight so the
            three lines read as one mark instead of three spaced rows. */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden sm:h-12 sm:w-12">
              <img
                src="/logo-mark.svg"
                width="48"
                height="48"
                alt="Battery Sensei logo"
                decoding="async"
                loading="lazy"
                className="h-11 w-11 sm:h-12 sm:w-12"
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
          <time dateTime={LAST_UPDATED_ISO}>
            {t('footer.lastUpdated', { date: formattedDate })}
          </time>
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
