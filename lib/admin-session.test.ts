import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adminCookie,
  checkAdminKey,
  clearAdminCookie,
  createAdminToken,
  requireAdmin,
  verifyAdminToken,
} from './admin-session'

const SECRET = 'test-admin-session-secret-0123456789abcdef'

describe('admin session tokens', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SESSION_SECRET', SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('round-trips a freshly created token', () => {
    expect(verifyAdminToken(createAdminToken())).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const [payload, sig] = createAdminToken().split('.')
    const forged = Buffer.from(JSON.stringify({ a: 'admin', x: Date.now() + 1e9, n: 'x' }))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    expect(verifyAdminToken(`${forged}.${sig}`)).toBe(false)
    expect(verifyAdminToken(`${payload}.AAAA`)).toBe(false)
    expect(verifyAdminToken('garbage')).toBe(false)
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    const token = createAdminToken()
    vi.advanceTimersByTime(13 * 60 * 60 * 1000) // TTL is 12h
    expect(verifyAdminToken(token)).toBe(false)
  })

  it('rejects tokens signed with a different secret', () => {
    const token = createAdminToken()
    vi.stubEnv('ADMIN_SESSION_SECRET', 'another-secret-that-is-long-enough-000000')
    expect(verifyAdminToken(token)).toBe(false)
  })

  it('emits hardened cookie attributes', () => {
    const cookie = adminCookie(createAdminToken())
    expect(cookie).toContain('bs_admin=')
    expect(cookie).toContain('Path=/api/admin')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(clearAdminCookie()).toContain('Max-Age=0')
  })

  it('extracts and verifies the cookie from a request', () => {
    const token = createAdminToken()
    const good = new Request('https://battery-sensei.app/api/admin/feature-requests', {
      headers: { cookie: `foo=bar; bs_admin=${token}` },
    })
    const bad = new Request('https://battery-sensei.app/api/admin/feature-requests', {
      headers: { cookie: 'bs_admin=not-a-token' },
    })
    const none = new Request('https://battery-sensei.app/api/admin/feature-requests')
    expect(requireAdmin(good)).toBe(true)
    expect(requireAdmin(bad)).toBe(false)
    expect(requireAdmin(none)).toBe(false)
  })
})

describe('checkAdminKey', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('accepts only the exact configured key', () => {
    vi.stubEnv('ADMIN_DASHBOARD_KEY', 'correct-horse-battery-staple-key')
    expect(checkAdminKey('correct-horse-battery-staple-key')).toBe(true)
    expect(checkAdminKey('correct-horse-battery-staple-keY')).toBe(false)
    expect(checkAdminKey('')).toBe(false)
  })

  it('fails closed when unconfigured or configured too short', () => {
    expect(checkAdminKey('anything')).toBe(false)
    vi.stubEnv('ADMIN_DASHBOARD_KEY', 'short')
    expect(checkAdminKey('short')).toBe(false)
  })
})
