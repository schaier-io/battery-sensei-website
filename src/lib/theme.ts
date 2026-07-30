/**
 * Theme preference.
 *
 * The palette itself lives in `styles.css` and keys off two classes on
 * <html>: `.dark` and `.light`. Neither is required for the default
 * experience: a `prefers-color-scheme: dark` media block applies the dark
 * palette to `:root:not(.light)`, so a visitor who never touches this
 * control gets their OS theme with zero JavaScript and zero flash.
 *
 * The classes exist only for an EXPLICIT override, which is why the stored
 * value has three states rather than two: forgetting "system" would strand
 * anyone who switches their Mac to dark at sunset.
 *
 * Storage is localStorage rather than a cookie on purpose. The site is
 * prerendered, so the HTML is built once and cached; a cookie could not be
 * read per-request to pre-render the class anyway, and localStorage keeps
 * the preference out of every network request.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'bs_theme'

/* System first: it is the default and the one most people want, so it should
   be the first thing read rather than something found between two overrides. */
export const THEME_OPTIONS: ReadonlyArray<ThemePreference> = ['system', 'light', 'dark']

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** Reads the stored preference. Returns 'system' on the server, on a first
    visit, or if storage is unavailable (Safari private mode throws). */
export function readThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return
  try {
    if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage blocked. The class below still applies for this page view.
  }
}

/** Puts the override class on <html>. 'system' clears both classes and lets
    the media query decide. */
export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', preference === 'dark')
  root.classList.toggle('light', preference === 'light')
}

/**
 * Runs in <head> before first paint so an override is already on <html> when
 * the page renders.
 *
 * React reconciles <html> during hydration and strips classes it did not
 * render, so this alone is not enough: `ThemeSwitcher` re-applies the class
 * in a layout effect, which fires before the browser paints the hydrated
 * tree. This script covers the window before hydration; the effect covers
 * everything after.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='dark'||p==='light'){document.documentElement.classList.add(p)}}catch(e){}})()`
