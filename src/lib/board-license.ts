/**
 * Client-side persistence of the visitor's license key for feature-board
 * voting. The ONLY module that touches the storage slot.
 *
 * localStorage, deliberately not a cookie: a cookie would auto-attach
 * the license key to every same-origin HTTP request (and its logs). From
 * here the key is read explicitly and sent solely inside vote POST
 * bodies — never in URLs, headers, or cookies.
 *
 * Written from two places: the checkout thank-you page (auto-arms voting
 * for fresh buyers) and the board's key-entry dialog. Cleared when the
 * server reports the key invalid.
 */

const STORAGE_KEY = 'bs_board_license'

export function getStoredLicenseKey(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value && value.trim().length > 0 ? value.trim() : null
  } catch {
    // Private mode / storage disabled — voting just re-prompts.
    return null
  }
}

export function storeLicenseKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed) return
  try {
    window.localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    // Best effort only.
  }
}

export function clearStoredLicenseKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best effort only.
  }
}
