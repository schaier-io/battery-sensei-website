import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import de from './locales/de.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'

export const SUPPORTED_LOCALES = ['en', 'de', 'es', 'fr', 'ja'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_COOKIE = 'bs_locale'

// Map locale → IETF tag used for <html lang> and og:locale.
export const HTML_LANG: Record<Locale, string> = {
  en: 'en',
  de: 'de',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
}

export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  fr: 'fr_FR',
  ja: 'ja_JP',
}

// Initial language. On the client, read it from the URL path so a prerendered
// /de page hydrates as German with no mismatch — the locale bundles are all
// included below, so this lookup is synchronous. On the server it is the
// default; the root route's beforeLoad sets the language per prerender/request.
function initialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const seg = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  return seg && seg !== 'en' && (SUPPORTED_LOCALES as readonly string[]).includes(seg)
    ? (seg as Locale)
    : DEFAULT_LOCALE
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      // All locales are bundled so prerendered localized pages (/de, /es, ...)
      // hydrate in their language synchronously. loadLocale therefore resolves
      // immediately; it stays for the language switcher's prefetch API.
      resources: {
        en: { translation: en },
        de: { translation: de },
        es: { translation: es },
        fr: { translation: fr },
        ja: { translation: ja },
      },
      lng: initialLocale(),
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: false },
    })
}

// Each locale lives in its own chunk; the importer is the only place these
// JSONs are referenced, so Vite emits separate files (~5–7 KB gz each).
const localeLoaders: Record<Exclude<Locale, 'en'>, () => Promise<{ default: unknown }>> = {
  de: () => import('./locales/de.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  ja: () => import('./locales/ja.json'),
}

const loadingLocales = new Map<Locale, Promise<void>>()

export function loadLocale(locale: Locale): Promise<void> {
  if (locale === 'en') return Promise.resolve()
  if (i18n.hasResourceBundle(locale, 'translation')) return Promise.resolve()
  const existing = loadingLocales.get(locale)
  if (existing) return existing
  const promise = localeLoaders[locale]().then((mod) => {
    i18n.addResourceBundle(locale, 'translation', mod.default, true, true)
  })
  loadingLocales.set(locale, promise)
  return promise
}

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

// Locale encoded in the URL path: /de, /es, /fr, /ja. English has no prefix
// (it lives at the root), so "/" and unprefixed paths resolve to the default.
export function localeFromPath(pathname: string): Locale | null {
  const seg = pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  return seg && seg !== 'en' && isLocale(seg) ? seg : null
}

// Home-page path for a locale: "/" for English, "/de" (etc.) otherwise. Use
// for every "back to homepage" / logo link so the language survives the hop.
export function localeHomePath(locale: string | null | undefined): string {
  return isLocale(locale) && locale !== 'en' ? `/${locale}` : '/'
}

// URL path → cookie → browser. Safe to call on server (returns DEFAULT_LOCALE).
export function detectClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE

  // URL path wins: a shared or crawled /de URL renders German and its client
  // hydration matches the prerendered HTML instead of fighting the cookie.
  const fromPath = localeFromPath(window.location.pathname)
  if (fromPath) return fromPath

  // Explicit ?locale beats cookie/browser. Transactional links (the
  // confirm/unsubscribe landing pages) and the subpage language switcher
  // pass it, so someone opening a German signup email on a fresh device
  // still lands in German.
  const fromQuery = new URLSearchParams(window.location.search).get('locale')
  if (isLocale(fromQuery)) return fromQuery

  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`),
  )
  const fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
  if (isLocale(fromCookie)) return fromCookie

  const nav = navigator.languages ?? [navigator.language]
  for (const candidate of nav) {
    const short = candidate?.split('-')[0]?.toLowerCase()
    if (isLocale(short)) return short
  }
  return DEFAULT_LOCALE
}

export function persistLocale(locale: Locale) {
  if (typeof document === 'undefined') return
  // 1 year, root path, lax — matches SPA conventions.
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`
}

export default i18n
