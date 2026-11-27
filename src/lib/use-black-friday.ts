import { isBlackFridayActive } from '../../lib/black-friday'
import { useMounted } from './use-mounted'
import type { LifetimePrice } from './use-price'

/**
 * Highest discounted/original ratio that still counts as the Black
 * Friday half price. Polar rounds to the cent, so 50% of 12.99 quotes
 * as 6.50 (a ratio just above 0.5).
 */
const HALF_PRICE_MAX_RATIO = 0.51

/**
 * True when the Black Friday offer is live for this visitor: the window
 * is open AND Polar's live preview actually quotes the half price. The
 * second gate keeps every Black Friday claim hidden when the code is
 * missing in Polar and checkout fell back to the launch discount.
 *
 * Client-only (false during SSR and the first paint), because the
 * window depends on the visitor's clock and pages are prerendered.
 */
export function useBlackFriday(lifetime: LifetimePrice): boolean {
  const mounted = useMounted()
  const { original, discounted, hasDiscount } = lifetime
  return (
    mounted &&
    isBlackFridayActive() &&
    hasDiscount &&
    original.amount > 0 &&
    discounted.amount / original.amount <= HALF_PRICE_MAX_RATIO
  )
}
