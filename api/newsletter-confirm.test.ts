import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockResend } = vi.hoisted(() => ({
  mockDb: {
    newsletterSignup: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockResend: {
    contacts: {
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('../lib/db.js', () => ({ db: mockDb, prisma: mockDb }))
vi.mock('../lib/resend.js', () => ({
  getResendClient: () => mockResend,
  isAllowedOrigin: () => true,
  normalizeLocale: (locale: string) => locale,
  signupSegments: () => [{ id: 'segment-releases' }],
  siteUrl: () => 'https://battery-sensei.app',
}))

import { createToken } from '../lib/newsletter-token'
import { POST } from './newsletter/confirm'

const EMAIL = 'reader@example.com'

function confirmRequest(token: string): Request {
  return new Request(
    `https://battery-sensei.app/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { origin: 'https://battery-sensei.app' },
    },
  )
}

beforeEach(() => {
  vi.stubEnv('NEWSLETTER_TOKEN_SECRET', 'test-newsletter-secret-0123456789abcdef')
  mockDb.newsletterSignup.update.mockResolvedValue({
    email: EMAIL,
    confirmedAt: new Date(),
    releasesContactId: 'contact-1',
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/newsletter/confirm provider reconciliation', () => {
  it('does not record confirmation when Resend returns a transient error', async () => {
    mockDb.newsletterSignup.findUnique.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 3,
      confirmedAt: null,
      releasesContactId: 'contact-1',
    })
    mockResend.contacts.update.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'retry', statusCode: 429 },
    })
    const token = createToken(EMAIL, 'confirm', 'en', 3)

    const response = await POST(confirmRequest(token))

    expect(response.status).toBe(503)
    expect(mockDb.newsletterSignup.update).not.toHaveBeenCalled()
    expect(mockResend.contacts.create).not.toHaveBeenCalled()
  })

  it('recreates a missing contact before recording local confirmation', async () => {
    mockDb.newsletterSignup.findUnique.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 3,
      confirmedAt: null,
      releasesContactId: null,
    })
    mockResend.contacts.update.mockResolvedValue({
      data: null,
      error: { name: 'not_found', message: 'missing', statusCode: 404 },
    })
    mockResend.contacts.create.mockResolvedValue({
      data: { id: 'contact-recovered' },
      error: null,
    })
    const token = createToken(EMAIL, 'confirm', 'en', 3)

    const response = await POST(confirmRequest(token))

    expect(response.status).toBe(200)
    expect(mockResend.contacts.create).toHaveBeenCalledWith({
      email: EMAIL,
      unsubscribed: false,
      firstName: 'src:confirm-recovery|lang:en',
      segments: [{ id: 'segment-releases' }],
    })
    expect(mockDb.newsletterSignup.update).toHaveBeenCalledWith({
      where: { email: EMAIL },
      data: {
        confirmedAt: expect.any(Date),
        unsubscribedAt: null,
        locale: 'en',
        releasesContactId: 'contact-recovered',
      },
    })
    expect(mockResend.contacts.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.newsletterSignup.update.mock.invocationCallOrder[0]!,
    )
  })

  it('repairs Resend on a later click even when the local row is already confirmed', async () => {
    mockDb.newsletterSignup.findUnique.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 3,
      confirmedAt: new Date('2026-07-01T00:00:00.000Z'),
      releasesContactId: 'contact-1',
    })
    mockResend.contacts.update
      .mockResolvedValueOnce({
        data: null,
        error: { name: 'internal_server_error', message: 'retry', statusCode: 500 },
      })
      .mockResolvedValueOnce({ data: { id: 'contact-1' }, error: null })
    const token = createToken(EMAIL, 'confirm', 'en', 3)

    const first = await POST(confirmRequest(token))
    const second = await POST(confirmRequest(token))

    expect(first.status).toBe(503)
    expect(second.status).toBe(200)
    expect(mockResend.contacts.update).toHaveBeenCalledTimes(2)
    expect(mockDb.newsletterSignup.update).not.toHaveBeenCalled()
  })

  it('does not confirm when missing-contact recreation returns an SDK error', async () => {
    mockDb.newsletterSignup.findUnique.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 3,
      confirmedAt: null,
      releasesContactId: null,
    })
    mockResend.contacts.update.mockResolvedValue({
      data: null,
      error: { name: 'not_found', message: 'missing', statusCode: 404 },
    })
    mockResend.contacts.create.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'retry', statusCode: 429 },
    })
    const token = createToken(EMAIL, 'confirm', 'en', 3)

    const response = await POST(confirmRequest(token))

    expect(response.status).toBe(503)
    expect(mockDb.newsletterSignup.update).not.toHaveBeenCalled()
  })

  it('does not log raw database errors when the final local write fails', async () => {
    mockDb.newsletterSignup.findUnique.mockResolvedValue({
      email: EMAIL,
      tokenEpoch: 3,
      confirmedAt: null,
      releasesContactId: 'contact-1',
    })
    mockResend.contacts.update.mockResolvedValue({
      data: { id: 'contact-1' },
      error: null,
    })
    const databaseError = new Error(`query failed for ${EMAIL}`)
    mockDb.newsletterSignup.update.mockRejectedValue(databaseError)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const token = createToken(EMAIL, 'confirm', 'en', 3)

    const response = await POST(confirmRequest(token))

    expect(response.status).toBe(503)
    const logged = JSON.stringify(errorLog.mock.calls)
    expect(errorLog.mock.calls.flat()).not.toContain(databaseError)
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain('query failed')
    errorLog.mockRestore()
  })
})
