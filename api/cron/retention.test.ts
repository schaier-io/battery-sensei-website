import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createRetentionHandler,
  deletePendingResendContact,
  isCronAuthorized,
  minimizeUnsubscribedResendContact,
} from './retention'
import type { RetentionDatabase } from '../../lib/retention'

function emptyDatabase(): RetentionDatabase {
  return {
    newsletterSignup: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    supportRequest: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    featureRequest: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    featureVote: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    licenseVoter: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    adminLoginAttempt: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('retention cron authorization', () => {
  it('accepts only the configured bearer secret and fails closed when missing', () => {
    const request = new Request('https://battery-sensei.app/api/cron/retention', {
      headers: { authorization: 'Bearer retention-secret-123456789' },
    })

    expect(isCronAuthorized(request, 'retention-secret-123456789')).toBe(true)
    expect(isCronAuthorized(request, 'different-secret-123456789')).toBe(false)
    expect(isCronAuthorized(request, undefined)).toBe(false)
    expect(isCronAuthorized(request, 'short')).toBe(false)
  })

  it('returns an authenticated count-only report through the HTTP endpoint', async () => {
    const handler = createRetentionHandler({
      db: emptyDatabase(),
      deletePendingContact: vi.fn(async () => undefined),
      minimizeUnsubscribedContact: vi.fn(async () => undefined),
      getSecret: () => 'retention-secret-123456789',
      now: () => new Date('2026-07-31T12:00:00.000Z'),
    })
    const request = new Request('https://battery-sensei.app/api/cron/retention', {
      headers: { authorization: 'Bearer retention-secret-123456789' },
    })

    const response = await handler(request)
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      pendingNewslettersDeleted: 0,
      unsubscribedNewslettersMinimized: 0,
      supportRequestsDeleted: 0,
      privateFeatureRequestsDeleted: 0,
      publicFeatureRequestsAnonymized: 0,
      featureVoteIpsMinimized: 0,
      licenseVotersDeleted: 0,
      adminLoginAttemptsDeleted: 0,
      failures: [],
    })
    expect(JSON.stringify(body)).not.toContain('@')
  })

  it('returns 401 for missing or wrong HTTP secrets before touching storage', async () => {
    const db = emptyDatabase()
    const handler = createRetentionHandler({
      db,
      deletePendingContact: vi.fn(async () => undefined),
      minimizeUnsubscribedContact: vi.fn(async () => undefined),
      getSecret: () => 'retention-secret-123456789',
    })

    const missing = await handler(
      new Request('https://battery-sensei.app/api/cron/retention'),
    )
    const wrong = await handler(
      new Request('https://battery-sensei.app/api/cron/retention', {
        headers: { authorization: 'Bearer wrong-secret-1234567890' },
      }),
    )

    expect(missing.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(db.newsletterSignup.findMany).not.toHaveBeenCalled()
  })

  it('returns 503 without personal data when a provider deletion needs retry', async () => {
    const db = emptyDatabase()
    vi.mocked(db.newsletterSignup.findMany).mockResolvedValue([
      {
        id: 'signup-retry',
        email: 'private@example.com',
        releasesContactId: 'contact-1',
        launchesContactId: null,
      },
    ])
    const handler = createRetentionHandler({
      db,
      deletePendingContact: vi.fn(async () => {
        throw new Error('provider unavailable')
      }),
      minimizeUnsubscribedContact: vi.fn(async () => undefined),
      getSecret: () => 'retention-secret-123456789',
    })

    const response = await handler(
      new Request('https://battery-sensei.app/api/cron/retention', {
        headers: { authorization: 'Bearer retention-secret-123456789' },
      }),
    )
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.failures).toEqual(['pending-newsletter:signup-retry'])
    expect(JSON.stringify(body)).not.toContain('private@example.com')
  })

  it('returns 500 when database enforcement fails unexpectedly', async () => {
    const db = emptyDatabase()
    vi.mocked(db.newsletterSignup.findMany).mockRejectedValue(
      new Error('database unavailable'),
    )
    const handler = createRetentionHandler({
      db,
      deletePendingContact: vi.fn(async () => undefined),
      minimizeUnsubscribedContact: vi.fn(async () => undefined),
      getSecret: () => 'retention-secret-123456789',
    })
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await handler(
      new Request('https://battery-sensei.app/api/cron/retention', {
        headers: { authorization: 'Bearer retention-secret-123456789' },
      }),
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'retention-failed',
    })
    expect(errorLog).toHaveBeenCalled()
    errorLog.mockRestore()
  })
})

describe('pending Resend contact deletion', () => {
  it('deletes both stored contacts and the email selector, accepting prior deletion', async () => {
    const remove = vi
      .fn()
      .mockResolvedValueOnce({ data: { deleted: true }, error: null })
      .mockResolvedValueOnce({ data: { deleted: true }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { name: 'application_error', message: 'missing', statusCode: 404 },
      })

    await deletePendingResendContact(
      {
        id: 'signup-1',
        email: 'pending@example.com',
        releasesContactId: 'contact-release',
        launchesContactId: 'contact-launch',
      },
      { contacts: { remove } },
    )

    expect(remove.mock.calls).toEqual([
      ['contact-release'],
      ['contact-launch'],
      [{ email: 'pending@example.com' }],
    ])
  })

  it('throws on a transient deletion error so the database row remains retryable', async () => {
    const remove = vi.fn(async () => ({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'retry', statusCode: 429 },
    }))

    await expect(
      deletePendingResendContact(
        {
          id: 'signup-2',
          email: 'retry@example.com',
          releasesContactId: null,
          launchesContactId: null,
        },
        { contacts: { remove } },
      ),
    ).rejects.toThrow('Resend contact deletion failed')
  })
})

describe('unsubscribed Resend contact minimization', () => {
  it('enforces opt-out and clears contact names by email', async () => {
    const update = vi.fn(async () => ({ data: { id: 'contact-1' }, error: null }))

    await minimizeUnsubscribedResendContact(
      {
        id: 'signup-3',
        email: 'unsubscribed@example.com',
        releasesContactId: 'contact-1',
        launchesContactId: null,
      },
      { contacts: { update } },
    )

    expect(update).toHaveBeenCalledWith({
      email: 'unsubscribed@example.com',
      unsubscribed: true,
      firstName: null,
      lastName: null,
    })
  })

  it('accepts an already-absent contact but throws on transient errors', async () => {
    const absent = vi.fn(async () => ({
      data: null,
      error: { name: 'application_error', message: 'missing', statusCode: 404 },
    }))
    await expect(
      minimizeUnsubscribedResendContact(
        {
          id: 'signup-4',
          email: 'absent@example.com',
          releasesContactId: null,
          launchesContactId: null,
        },
        { contacts: { update: absent } },
      ),
    ).resolves.toBeUndefined()

    const transient = vi.fn(async () => ({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'retry', statusCode: 429 },
    }))
    await expect(
      minimizeUnsubscribedResendContact(
        {
          id: 'signup-5',
          email: 'retry@example.com',
          releasesContactId: null,
          launchesContactId: null,
        },
        { contacts: { update: transient } },
      ),
    ).rejects.toThrow('Resend suppression update failed')
  })
})
