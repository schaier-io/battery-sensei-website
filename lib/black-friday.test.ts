import { describe, expect, it } from 'vitest'
import {
  BLACK_FRIDAY_ENDS_AT,
  BLACK_FRIDAY_STARTS_AT,
  isBlackFridayActive,
  lifetimeDiscountCodes,
} from './black-friday'

describe('Black Friday window', () => {
  it('opens at the start instant and closes at the end instant', () => {
    expect(isBlackFridayActive(BLACK_FRIDAY_STARTS_AT - 1)).toBe(false)
    expect(isBlackFridayActive(BLACK_FRIDAY_STARTS_AT)).toBe(true)
    expect(isBlackFridayActive(BLACK_FRIDAY_ENDS_AT - 1)).toBe(true)
    expect(isBlackFridayActive(BLACK_FRIDAY_ENDS_AT)).toBe(false)
  })

  it('tries the Black Friday code first only inside the window', () => {
    expect(lifetimeDiscountCodes('ZENMODE', 'BF', BLACK_FRIDAY_STARTS_AT)).toEqual(['BF', 'ZENMODE'])
    expect(lifetimeDiscountCodes('ZENMODE', 'BF', BLACK_FRIDAY_ENDS_AT)).toEqual(['ZENMODE'])
  })
})
