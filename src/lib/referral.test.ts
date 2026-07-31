import { describe, expect, it } from 'vitest'
import {
  downloadHref,
  referralSearchSchema,
  sanitizeSenseiId,
} from './referral'

describe('sanitizeSenseiId', () => {
  it('accepts the 4-digit codes the app generates', () => {
    expect(sanitizeSenseiId('1234')).toBe('1234')
    expect(sanitizeSenseiId('0007')).toBe('0007')
  })

  it('accepts short alphanumeric tokens (forward-compat)', () => {
    expect(sanitizeSenseiId('a1B2')).toBe('a1B2')
    expect(sanitizeSenseiId('12345678')).toBe('12345678')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeSenseiId(' 1234 ')).toBe('1234')
  })

  it('rejects malformed ids', () => {
    expect(sanitizeSenseiId('')).toBeNull()
    expect(sanitizeSenseiId('   ')).toBeNull()
    expect(sanitizeSenseiId('123456789')).toBeNull() // too long
    expect(sanitizeSenseiId('12-34')).toBeNull()
    expect(sanitizeSenseiId('<script>')).toBeNull()
    expect(sanitizeSenseiId('%2F..%2F')).toBeNull()
    expect(sanitizeSenseiId(null)).toBeNull()
    expect(sanitizeSenseiId(undefined)).toBeNull()
  })
})

describe('referralSearchSchema', () => {
  it('parses the exact query the app stamps onto cards', () => {
    const parsed = referralSearchSchema.parse({
      card: 'rescue',
      ref: '1234',
      utm_source: 'card',
      utm_medium: 'share',
      utm_campaign: 'rescue',
    })
    expect(parsed).toEqual({
      card: 'rescue',
      ref: '1234',
      utm_source: 'card',
      utm_medium: 'share',
      utm_campaign: 'rescue',
    })
  })

  it('collapses an unknown card type to undefined without dropping utm params', () => {
    const parsed = referralSearchSchema.parse({
      card: 'mystery',
      utm_source: 'card',
    })
    expect(parsed.card).toBeUndefined()
    expect(parsed.utm_source).toBe('card')
  })

  it('keeps JSON-parsed numeric values as-is (no URL-rewriting transform)', () => {
    // TanStack Router JSON-parses search values, so the app's `ref=1234`
    // arrives as the number 1234. It must survive validation untouched —
    // transforming it would trigger a 307 URL normalization on every
    // canonical card URL. downloadHref stringifies on the way out.
    const parsed = referralSearchSchema.parse({ ref: 1234 })
    expect(parsed.ref).toBe(1234)
  })

  it('drops structured and over-long values field by field', () => {
    const parsed = referralSearchSchema.parse({
      card: ['rescue', 'health'],
      ref: { nested: true },
      utm_source: 'x'.repeat(200),
      utm_medium: 'share',
    })
    expect(parsed.card).toBeUndefined()
    expect(parsed.ref).toBeUndefined()
    expect(parsed.utm_source).toBeUndefined()
    expect(parsed.utm_medium).toBe('share')
  })
})

describe('downloadHref', () => {
  it('returns the bare download path when nothing is attributable', () => {
    expect(downloadHref({})).toBe('/download/latest')
  })

  it('does not pass referral or campaign values to GitHub', () => {
    const href = downloadHref({
      card: 'rescue',
      ref: 1234,
      utm_source: 'card',
      utm_medium: 'share',
      utm_campaign: 'rescue',
    })
    expect(href).toBe('/download/latest')
  })

  it('returns the same path for malformed-but-sanitized attribution', () => {
    expect(downloadHref({ utm_source: 'a b&c=d' })).toBe('/download/latest')
  })
})
