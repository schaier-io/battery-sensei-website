import { useEffect, useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import i18n, {
  DEFAULT_LOCALE,
  HTML_LANG,
  detectClientLocale,
  isLocale,
  loadLocale,
  type Locale,
} from './index'

/**
 * Wraps the app in an i18next provider. On mount, detects locale from cookie
 * or browser, loads the matching translation chunk (en is bundled up-front;
 * de/es/fr/ja stream in lazily), and keeps `<html lang>` in sync.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const detected = detectClientLocale()
    if (detected === i18n.language) {
      setReady(true)
      return
    }
    let cancelled = false
    loadLocale(detected)
      .then(() => {
        if (cancelled) return
        return i18n.changeLanguage(detected)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const updateHtmlLang = (lng: string) => {
      if (typeof document === 'undefined') return
      const locale = isLocale(lng) ? lng : DEFAULT_LOCALE
      document.documentElement.setAttribute('lang', HTML_LANG[locale])
    }
    updateHtmlLang(i18n.language)
    i18n.on('languageChanged', updateHtmlLang)
    return () => {
      i18n.off('languageChanged', updateHtmlLang)
    }
  }, [])

  // Children render before `ready` flips — the first pass uses the SSR default
  // (en) so hydration matches. If detection picks another locale, the chunk
  // streams in and the second render swaps without unmounting trees.
  void ready

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

/**
 * Imperative locale setter that also persists the choice to a cookie.
 * Loads the locale chunk before switching so the UI doesn't flash English.
 */
export function useLocaleSwitcher() {
  const { i18n: instance } = useTranslation()
  return {
    current: (isLocale(instance.language) ? instance.language : DEFAULT_LOCALE) as Locale,
    setLocale: async (locale: Locale) => {
      await loadLocale(locale)
      await instance.changeLanguage(locale)
      // Persist only after the switch succeeds so a failed load doesn't lock
      // the user into a missing-resources state.
      const oneYear = 60 * 60 * 24 * 365
      document.cookie = `bs_locale=${encodeURIComponent(locale)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`
    },
  }
}
