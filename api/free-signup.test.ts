import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockResend } = vi.hoisted(() => ({
  mockDb: {
    newsletterSignup: {
      count: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
  mockResend: {
    contacts: { create: vi.fn() },
    emails: { send: vi.fn() },
  },
}))

vi.mock('../lib/db.js', () => ({ db: mockDb, prisma: mockDb }))
vi.mock('../lib/resend.js', () => ({
  SUPPORTED_LOCALES: ['en', 'de', 'es', 'fr', 'ja'],
  getResendClient: () => mockResend,
  isAllowedOrigin: () => true,
  resendFrom: () => 'Battery Sensei <hello@battery-sensei.app>',
  resendReplyTo: () => undefined,
  signupSegments: () => [{ id: 'segment-releases' }],
  siteUrl: () => 'https://battery-sensei.app',
}))

import { POST } from './free-signup'

const EMAIL = 'reader@example.com'

function signupRequest(): Request {
  return new Request('https://battery-sensei.app/api/free-signup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://battery-sensei.app',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({ email: EMAIL, locale: 'en', source: 'pricing-free' }),
  })
}

beforeEach(() => {
  vi.stubEnv('NEWSLETTER_TOKEN_SECRET', 'test-newsletter-secret-0123456789abcdef')
  mockDb.newsletterSignup.count.mockResolvedValue(0)
  mockResend.contacts.create.mockResolvedValue({
    data: { id: 'contact-1' },
    error: null,
  })
  mockResend.emails.send.mockResolvedValue({ data: { id: 'email-1' }, error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/free-signup consent state', () => {
  it('turns an explicit opt-out into pending and requires fresh confirmation', async () => {
    const priorConfirmation = new Date('2026-01-10T12:00:00.000Z')
    mockDb.newsletterSignup.upsert.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 7,
      unsubscribedAt: new Date('2026-07-01T12:00:00.000Z'),
      confirmedAt: priorConfirmation,
      releasesContactId: 'contact-1',
    })
    mockDb.newsletterSignup.update.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 8,
      unsubscribedAt: null,
      confirmedAt: null,
      releasesContactId: 'contact-1',
    })

    const response = await POST(signupRequest())

    expect(response.status).toBe(200)
    expect(mockDb.newsletterSignup.update).toHaveBeenCalledTimes(1)
    expect(mockDb.newsletterSignup.update).toHaveBeenCalledWith({
      where: { email: EMAIL },
      data: {
        tokenEpoch: { increment: 1 },
        unsubscribedAt: null,
        confirmedAt: null,
        createdAt: expect.any(Date),
      },
    })
    expect(mockResend.contacts.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: EMAIL, unsubscribed: true }),
    )
  })

  it('keeps an existing confirmed subscriber confirmed and idempotent', async () => {
    const priorConfirmation = new Date('2026-01-10T12:00:00.000Z')
    mockDb.newsletterSignup.upsert.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 7,
      unsubscribedAt: null,
      confirmedAt: priorConfirmation,
      releasesContactId: 'contact-1',
    })

    const response = await POST(signupRequest())

    expect(response.status).toBe(200)
    expect(mockDb.newsletterSignup.update).not.toHaveBeenCalled()
    expect(mockResend.contacts.create).not.toHaveBeenCalled()
    expect(mockResend.emails.send).not.toHaveBeenCalled()
    const upsert = mockDb.newsletterSignup.upsert.mock.calls[0]![0]
    expect(upsert.update).not.toHaveProperty('confirmedAt')
    expect(upsert.update).not.toHaveProperty('unsubscribedAt')
  })

  it('refreshes the retention clock when issuing another pending link', async () => {
    mockDb.newsletterSignup.upsert.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 4,
      unsubscribedAt: null,
      confirmedAt: null,
      releasesContactId: 'contact-1',
    })
    mockDb.newsletterSignup.update.mockResolvedValue({ email: EMAIL })

    const response = await POST(signupRequest())

    expect(response.status).toBe(200)
    expect(mockDb.newsletterSignup.update).toHaveBeenCalledWith({
      where: { email: EMAIL },
      data: { createdAt: expect.any(Date) },
    })
    expect(mockResend.emails.send).toHaveBeenCalledTimes(1)
  })

  it('reports send failure when the Resend SDK returns an error result', async () => {
    mockDb.newsletterSignup.upsert.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 1,
      unsubscribedAt: null,
      confirmedAt: null,
      releasesContactId: 'contact-1',
    })
    mockResend.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'retry', statusCode: 429 },
    })

    const response = await POST(signupRequest())

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ ok: false, error: 'send-failed' })
  })

  it('does not log raw transport errors from the email provider', async () => {
    mockDb.newsletterSignup.upsert.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 1,
      unsubscribedAt: null,
      confirmedAt: null,
      releasesContactId: 'contact-1',
    })
    const transportError = new Error(`transport failed for ${EMAIL}`)
    mockResend.emails.send.mockRejectedValue(transportError)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await POST(signupRequest())

    expect(response.status).toBe(502)
    const logged = JSON.stringify(errorLog.mock.calls)
    expect(errorLog.mock.calls.flat()).not.toContain(transportError)
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain('transport failed')
    errorLog.mockRestore()
  })
})
