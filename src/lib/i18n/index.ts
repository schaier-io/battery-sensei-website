import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'

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

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      // Only `en` is bundled up-front. Other locales are loaded on demand by
      // `loadLocale` so visitors pay only for the language they actually read.
      resources: { en: { translation: en } },
      lng: DEFAULT_LOCALE,
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

// Cookie + browser detection. Safe to call on server (returns DEFAULT_LOCALE).
export function detectClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE

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
