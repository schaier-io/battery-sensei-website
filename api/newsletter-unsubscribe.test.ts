import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockResend } = vi.hoisted(() => ({
  mockDb: {
    newsletterSignup: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockResend: {
    contacts: { update: vi.fn() },
  },
}))

vi.mock('../lib/db.js', () => ({ db: mockDb, prisma: mockDb }))
vi.mock('../lib/resend.js', () => ({
  getResendClient: () => mockResend,
  siteUrl: () => 'https://battery-sensei.app',
}))

import { createToken } from '../lib/newsletter-token'
import { POST } from './newsletter/unsubscribe'

const EMAIL = 'reader@example.com'

beforeEach(() => {
  vi.stubEnv('NEWSLETTER_TOKEN_SECRET', 'test-newsletter-secret-0123456789abcdef')
  mockDb.newsletterSignup.findUnique.mockResolvedValue({
    email: EMAIL,
    tokenEpoch: 2,
  })
  mockDb.newsletterSignup.update.mockResolvedValue({ email: EMAIL })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/newsletter/unsubscribe logging', () => {
  it('keeps provider transport errors free of subscriber data', async () => {
    const transportError = new Error(`transport failed for ${EMAIL}`)
    mockResend.contacts.update.mockRejectedValue(transportError)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const token = createToken(EMAIL, 'unsubscribe', 'en', 2)

    const response = await POST(
      new Request(
        `https://battery-sensei.app/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: 'POST' },
      ),
    )

    expect(response.status).toBe(200)
    const logged = JSON.stringify(errorLog.mock.calls)
    expect(errorLog.mock.calls.flat()).not.toContain(transportError)
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain('transport failed')
    errorLog.mockRestore()
  })

  it('fails for retry without changing Resend when the local write fails', async () => {
    mockDb.newsletterSignup.update.mockRejectedValue(
      new Error(`database failed for ${EMAIL}`),
    )
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const token = createToken(EMAIL, 'unsubscribe', 'en', 2)

    const response = await POST(
      new Request(
        `https://battery-sensei.app/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: 'POST' },
      ),
    )

    expect(response.status).toBe(503)
    expect(mockResend.contacts.update).not.toHaveBeenCalled()
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(EMAIL)
    errorLog.mockRestore()
  })
})
