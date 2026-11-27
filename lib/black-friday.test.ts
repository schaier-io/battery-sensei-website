import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

// The sale end date lives in this file. Any import from src/ would put
// it into the client bundle.
describe('client bundle', () => {
  // Any extension (.js, .ts) and any quote, including a template literal.
  const importsBlackFriday = /lib\/black-friday(\.\w+)?['"`]/

  it('recognises every import form', () => {
    for (const line of [
      "import { X } from '../../lib/black-friday.js'",
      'import { X } from "#/../lib/black-friday.ts"',
      "const m = await import('@/../lib/black-friday')",
      'const m = await import(`../lib/black-friday`)',
    ]) {
      expect(importsBlackFriday.test(line), line).toBe(true)
    }
  })

  it('never imports lib/black-friday', () => {
    const offenders = readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => importsBlackFriday.test(readFileSync(join('src', file), 'utf8')))
    expect(offenders).toEqual([])
  })
})
