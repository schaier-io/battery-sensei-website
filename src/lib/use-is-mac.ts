import { useEffect, useState } from 'react'

/**
 * Detect whether the current visitor is on a Mac.
 *
 * Returns three states:
 *   - `null` during SSR + the first paint, before `navigator` is read.
 *   - `true` if the visitor looks like a Mac running macOS.
 *   - `false` for everything else (Windows, Linux, iPhone, iPad,
 *      Android, ChromeOS).
 *
 * The null phase matters: any UI that conditionally renders a "you're
 * not on a Mac" warning should treat `null` as "don't show anything yet"
 * to avoid a one-frame flash of the warning before the check resolves.
 *
 * Two known false-positives we have to defuse:
 *   1. iPadOS 13+ in "Request Desktop Website" mode reports the same
 *      `userAgent` as a Mac. The only reliable tell is `maxTouchPoints
 *      > 1` plus the iPad-shaped Mac UA — real Macs (including those
 *      with a Touch Bar) report 0 or 1 touch point. The Touch Bar
 *      reports 0; trackpad gestures don't count as touch points.
 *   2. Older `navigator.platform` is deprecated and unreliable on
 *      Chromium-based browsers — we use `userAgent` as the primary
 *      signal and `maxTouchPoints` only as the iPad disambiguator.
 *
 * Why a hook instead of a one-liner? Two reasons. First, SSR — calling
 * `navigator` on the server throws. Second, hydration — if the server
 * renders nothing and the client renders a warning banner on first
 * paint, the visitor sees a flash of false-positive content. The
 * `null → boolean` transition lets components render a stable initial
 * state and only mount the platform-conditional UI after hydration.
 */
export function useIsMac(): boolean | null {
  const [isMac, setIsMac] = useState<boolean | null>(null)
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    // Dev override: `?force=mac` and `?force=nonmac` let us preview the
    // dialog + banner without needing two devices. Strips out of
    // production via DEV check below.
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search)
      const force = params.get('force')
      if (force === 'mac') {
        setIsMac(true)
        return
      }
      if (force === 'nonmac') {
        setIsMac(false)
        return
      }
    }
    setIsMac(detectIsMac())
  }, [])
  return isMac
}

/**
 * Pure synchronous check. Exported for the rare cases where a hook
 * isn't usable (e.g. an event handler outside a component). Always
 * guarded for SSR — returns `false` when `navigator` isn't defined,
 * which is the safe default for any "warn if not Mac" branch.
 */
export function detectIsMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // Anything that openly says iPhone / iPad is not a Mac.
  if (/iPhone|iPod/.test(ua)) return false
  if (/iPad/.test(ua)) return false
  // iPad in desktop mode pretends to be macOS but always has multi-touch
  // available. Real Macs report 0 (Touch Bar models included).
  if (/Mac/.test(ua) && navigator.maxTouchPoints > 1) return false
  // Real Mac: UA contains "Mac" (Macintosh / Mac OS X / both).
  return /Mac/.test(ua)
}
