/**
 * Black Friday 2026: 50% off Lifetime, auto-applied at checkout.
 *
 * While the window is open, the server attaches the Black Friday Polar
 * code instead of the launch code (Polar takes one discount per
 * checkout). If the Black Friday code does not resolve in Polar, the
 * server falls back to the launch code, so a missing dashboard entry
 * never removes the launch price.
 *
 * Server only. Only `api/*` may import this file. Never import it from
 * `src/*`: that would put the end date into the client bundle. The
 * site learns about the sale from `/api/price` (`lifetime.campaign`).
 */
export const BLACK_FRIDAY_CODE = 'BLACKFRIDAY'
export const BLACK_FRIDAY_PERCENT = 50

/** Friday 27 Nov 2026, 00:00 UTC. */
export const BLACK_FRIDAY_STARTS_AT = Date.parse('2026-11-27T00:00:00Z')
/** End of Tuesday 1 Dec 2026, 23:59 US Pacific. Not shown to visitors. */
export const BLACK_FRIDAY_ENDS_AT = Date.parse('2026-12-02T08:00:00Z')

export function isBlackFridayActive(now: number = Date.now()): boolean {
  return now >= BLACK_FRIDAY_STARTS_AT && now < BLACK_FRIDAY_ENDS_AT
}

/**
 * Discount codes to try for Lifetime, in order. During the window the
 * Black Friday code comes first and the launch code is the fallback.
 */
export function lifetimeDiscountCodes(
  launchCode: string,
  blackFridayCode: string = BLACK_FRIDAY_CODE,
  now: number = Date.now(),
): string[] {
  return isBlackFridayActive(now) ? [blackFridayCode, launchCode] : [launchCode]
}
