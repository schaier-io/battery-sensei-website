import i18n, { SUPPORTED_LOCALES, OG_LOCALE, type Locale } from '#/lib/i18n'

export const SITE_URL = 'https://www.battery-sensei.app'

/** Canonical URL for a locale's home page. English lives at the site root. */
export function localeUrl(locale: Locale): string {
  return locale === 'en' ? `${SITE_URL}/` : `${SITE_URL}/${locale}`
}

/**
 * hreflang alternate set — every home variant advertises all five language
 * URLs plus x-default (English). Identical on `/` and each `/$lang` page so the
 * cluster is internally consistent for Google.
 */
export function alternateLinks() {
  const links: Array<{ rel: string; hrefLang: string; href: string }> =
    SUPPORTED_LOCALES.map((l) => ({
      rel: 'alternate',
      hrefLang: l as string,
      href: localeUrl(l),
    }))
  links.push({ rel: 'alternate', hrefLang: 'x-default', href: localeUrl('en') })
  return links
}

/**
 * Localized <title> / meta description for a locale. The locale bundle must be
 * loaded first (the `/$lang` route awaits `loadLocale` in beforeLoad; `en` is
 * bundled up-front), otherwise getFixedT falls back to the key.
 */
export function localizedSeo(locale: Locale) {
  const t = i18n.getFixedT(locale)
  return { title: t('seo.title'), description: t('seo.description') }
}

export { OG_LOCALE }
