import { useSyncExternalStore } from 'react'

/** Per-viewer dismissal. Scoped to this campaign so a later sale shows. */
const DISMISS_KEY = 'bs:black-friday-2026:dismissed'

const listeners = new Set<() => void>()
// Storage can be blocked. Then this in-memory flag keeps the strip
// hidden for the rest of the page view.
let dismissedInMemory = false

function read(): boolean {
  if (dismissedInMemory) return true
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Another tab dismissed the banner.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/**
 * True when this viewer hid the Black Friday banner. Reads true on the
 * server and during hydration, so prerendered HTML never carries the
 * banner and the nav badge does not flash.
 */
export function useBlackFridayDismissed(): boolean {
  return useSyncExternalStore(subscribe, read, () => true)
}

export function dismissBlackFriday(): void {
  dismissedInMemory = true
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Storage blocked: the in-memory flag covers this page view.
  }
  listeners.forEach((listener) => listener())
}
