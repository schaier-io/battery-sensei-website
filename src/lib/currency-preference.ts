import { useSyncExternalStore } from 'react'
import { isSupportedCurrency, type SupportedCurrency } from './pricing'

/**
 * Cross-page currency preference, persisted in `localStorage`.
 *
 * Detection priority (resolved inside `usePremiumPrice` / `useLifetimePrice`):
 *   1. Explicit `?cur=` query (the /checkout switcher writes here)
 *   2. Stored preference from this module — set by the global
 *      `CurrencySwitcher` chip in the footer + nav
 *   3. Server geo detection (`x-vercel-ip-country` on `/api/price`)
 *   4. Client locale region (`Intl.Locale(navigator.language).region`)
 *   5. USD canonical fallback
 *
 * Steps 1–2 are user-driven and persist; 3–5 are auto-detect and never
 * write to storage. The footer switcher always shows the resolved code
 * and saves an explicit pick (`setCurrencyPreference`) so later visits
 * skip auto-detect. `null` means no override yet (auto still active).
 */

const STORAGE_KEY = 'bs:currency'
const EVENT_NAME = 'bs:currency-changed'

function readStored(): SupportedCurrency | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const upper = raw.toUpperCase()
    return isSupportedCurrency(upper) ? (upper as SupportedCurrency) : null
  } catch {
    return null
  }
}

// In-memory cache so `useSyncExternalStore`'s `getSnapshot` returns a
// stable reference between renders (returning a fresh value from
// `localStorage.getItem` each call trips React's tearing detection).
let cached: SupportedCurrency | null | undefined

function snapshot(): SupportedCurrency | null {
  if (cached === undefined) cached = readStored()
  return cached
}

// SSR snapshot — no preference, no localStorage. The first client render
// (after hydration) calls `snapshot()` and may swap in the stored value;
// that's a deliberate hydration mismatch confined to the price display
// and not the surrounding markup.
function serverSnapshot(): SupportedCurrency | null {
  return null
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    cached = readStored()
    callback()
  }
  // Custom event covers same-tab updates; `storage` covers other tabs.
  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', handler)
  }
}

/** Read the stored override, if any. Returns `null` for "auto-detect". */
export function getCurrencyPreference(): SupportedCurrency | null {
  return snapshot()
}

/** Persist an override, or pass `null` to clear (return to auto-detect). */
export function setCurrencyPreference(next: SupportedCurrency | null): void {
  if (typeof window === 'undefined') return
  try {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, next)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore quota / privacy-mode failures — in-memory cache still updates
  }
  cached = next
  window.dispatchEvent(new Event(EVENT_NAME))
}

/**
 * React hook — subscribes to preference changes so any component reading
 * a price re-renders the moment the visitor swaps currencies in the
 * footer chip (or the /checkout switcher writes through).
 */
export function useCurrencyPreference(): SupportedCurrency | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
