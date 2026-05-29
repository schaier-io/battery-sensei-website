import { createFileRoute, notFound } from '@tanstack/react-router'
import { isLocale, type Locale } from '#/lib/i18n'
import { HomePage } from '#/components/HomePage'
import { alternateLinks, localeUrl, localizedSeo, OG_LOCALE } from '#/lib/seo'

/**
 * Localized home pages: /de, /es, /fr, /ja. English lives at "/" (not "/en").
 * The root beforeLoad has already loaded the matching locale bundle and set the
 * active language from the path, so the body and <html lang> render localized;
 * here we only validate the segment and emit localized meta + hreflang.
 */
export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.lang) || params.lang === 'en') throw notFound()
  },
  head: ({ params }) => {
    const locale = params.lang as Locale
    const { title, description } = localizedSeo(locale)
    const url = localeUrl(locale)
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        { property: 'og:locale', content: OG_LOCALE[locale] },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [{ rel: 'canonical', href: url }, ...alternateLinks()],
    }
  },
  component: HomePage,
})
