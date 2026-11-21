import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs build script without type declarations
import { parseUnicodeRange, unicodeRange } from './build-fonts.mjs'

describe('unicode-range helpers', () => {
  it('collapses runs and keeps singles (known answer)', () => {
    expect(unicodeRange([0x41, 0x20ac, 0x42, 0x43, 0x10d])).toBe('U+41-43,U+10D,U+20AC')
  })

  it('round-trips through the fontsource range syntax', () => {
    const cps = parseUnicodeRange('U+0000-00FF,U+0131,U+2000-206F')
    expect(cps.size).toBe(256 + 1 + 112)
    expect(parseUnicodeRange(unicodeRange(cps))).toEqual(cps)
  })
})
