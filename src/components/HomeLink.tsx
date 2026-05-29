import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isLocale } from '#/lib/i18n'

type HomeLinkProps = {
  className?: string
  children: ReactNode
  /** Optional in-page anchor on the home route (e.g. "faq-refund"). */
  hash?: string
  'aria-label'?: string
}

/**
 * A "home" link that preserves the active language by URL.
 *
 * English lives at "/", the other locales at "/de", "/es", "/fr", "/ja"
 * (the $lang route). A bare <Link to="/"> would bounce a German reader to
 * the English home and drop the language from the URL — this routes them to
 * /de instead, so the language is preserved on navigate, reload, and share.
 */
export function HomeLink({
  className,
  children,
  hash,
  'aria-label': ariaLabel,
}: HomeLinkProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language

  if (isLocale(locale) && locale !== 'en') {
    return (
      <Link
        to="/$lang"
        params={{ lang: locale }}
        hash={hash}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    )
  }
  return (
    <Link to="/" hash={hash} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}
