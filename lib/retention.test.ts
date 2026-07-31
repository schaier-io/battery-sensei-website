import { describe, expect, it, vi } from 'vitest'
import {
  runRetention,
  type PendingNewsletter,
  type RetentionDatabase,
} from './retention'

const NOW = new Date('2026-07-31T12:00:00.000Z')

function database(overrides: {
  pending?: PendingNewsletter[]
  unsubscribed?: PendingNewsletter[]
  publicFeatures?: Array<{
    id: string
    title: string
    body: string
    publicTitle: string | null
    publicBody: string | null
  }>
} = {}): RetentionDatabase {
  return {
    newsletterSignup: {
      findMany: vi.fn(async (args: Record<string, unknown>) => {
        const where = args.where as Record<string, unknown>
        return 'confirmedAt' in where
          ? (overrides.pending ?? [])
          : (overrides.unsubscribed ?? [])
      }),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    supportRequest: {
      deleteMany: vi.fn(async () => ({ count: 3 })),
    },
    featureRequest: {
      deleteMany: vi.fn(async () => ({ count: 4 })),
      findMany: vi.fn(async () => overrides.publicFeatures ?? []),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    featureVote: {
      updateMany: vi.fn(async () => ({ count: 7 })),
    },
    licenseVoter: {
      deleteMany: vi.fn(async () => ({ count: 5 })),
    },
    adminLoginAttempt: {
      deleteMany: vi.fn(async () => ({ count: 6 })),
    },
  }
}

describe('runRetention', () => {
  it('enforces every first-party database deadline in the privacy notice', async () => {
    const db = database({
      pending: [
        {
          id: 'signup-1',
          email: 'pending@example.com',
          releasesContactId: 'contact-release',
          launchesContactId: 'contact-launch',
        },
      ],
      unsubscribed: [
        {
          id: 'signup-unsubscribed',
          email: 'unsubscribed@example.com',
          releasesContactId: 'contact-suppressed',
          launchesContactId: null,
        },
      ],
      publicFeatures: [
        {
          id: 'feature-1',
          title: 'Cleaned title',
          body: 'Cleaned body',
          publicTitle: 'Approved public title',
          publicBody: null,
        },
      ],
    })
    const deletePendingContact = vi.fn(async () => undefined)
    const minimizeUnsubscribedContact = vi.fn(async () => undefined)

    const report = await runRetention({
      db,
      deletePendingContact,
      minimizeUnsubscribedContact,
      now: NOW,
    })

    expect(report).toEqual({
      pendingNewslettersDeleted: 1,
      unsubscribedNewslettersMinimized: 1,
      supportRequestsDeleted: 3,
      privateFeatureRequestsDeleted: 4,
      publicFeatureRequestsAnonymized: 1,
      featureVoteIpsMinimized: 7,
      licenseVotersDeleted: 5,
      adminLoginAttemptsDeleted: 6,
      failures: [],
    })
    expect(deletePendingContact).toHaveBeenCalledWith({
      id: 'signup-1',
      email: 'pending@example.com',
      releasesContactId: 'contact-release',
      launchesContactId: 'contact-launch',
    })
    expect(minimizeUnsubscribedContact).toHaveBeenCalledWith({
      id: 'signup-unsubscribed',
      email: 'unsubscribed@example.com',
      releasesContactId: 'contact-suppressed',
      launchesContactId: null,
    })
    expect(db.newsletterSignup.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'signup-unsubscribed',
        unsubscribedAt: { not: null },
      },
      data: {
        locale: 'en',
        source: 'other',
        releasesContactId: null,
        launchesContactId: null,
        ipAddress: null,
        userAgent: null,
        origin: null,
      },
    })

    expect(db.newsletterSignup.findMany).toHaveBeenCalledWith({
      where: {
        confirmedAt: null,
        unsubscribedAt: null,
        createdAt: { lt: new Date('2026-07-22T12:00:00.000Z') },
      },
      select: {
        id: true,
        email: true,
        releasesContactId: true,
        launchesContactId: true,
      },
    })
    expect(db.supportRequest.deleteMany).toHaveBeenCalledWith({
      where: {
        updatedAt: { lt: new Date('2024-07-31T12:00:00.000Z') },
        OR: [
          { retentionHoldUntil: null },
          { retentionHoldUntil: { lt: NOW } },
        ],
      },
    })
    expect(db.licenseVoter.deleteMany).toHaveBeenCalledWith({
      where: {
        lastValidatedAt: { lt: new Date('2026-06-01T12:00:00.000Z') },
      },
    })
    expect(db.adminLoginAttempt.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: new Date('2026-07-01T12:00:00.000Z') },
        OR: [
          { retentionHoldUntil: null },
          { retentionHoldUntil: { lt: NOW } },
        ],
      },
    })
    expect(db.featureVote.updateMany).toHaveBeenCalledWith({
      where: {
        ipAddress: { not: null },
        createdAt: { lt: new Date('2026-07-01T12:00:00.000Z') },
      },
      data: { ipAddress: null },
    })

    expect(db.featureRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'feature-1',
        privateDataPurgedAt: null,
        OR: [
          { moderatedAt: { lt: new Date('2024-07-31T12:00:00.000Z') } },
          {
            moderatedAt: null,
            createdAt: { lt: new Date('2024-07-31T12:00:00.000Z') },
          },
        ],
        AND: [
          {
            OR: [
              { retentionHoldUntil: null },
              { retentionHoldUntil: { lt: NOW } },
            ],
          },
        ],
      },
      data: {
        rawTitle: null,
        rawBody: null,
        rawEmail: null,
        rawName: null,
        rawPayload: {},
        title: 'Approved public title',
        body: 'Cleaned body',
        email: '',
        name: '',
        locale: 'en',
        source: 'web',
        rejectionReason: null,
        adminNote: null,
        moderatedAt: null,
        ipAddress: null,
        userAgent: null,
        origin: null,
        adminNotifyEmailId: null,
        confirmationEmailId: null,
        decisionEmailId: null,
        privateDataPurgedAt: NOW,
      },
    })
  })

  it('selects a recently voted public request by its old moderation date', async () => {
    const db = database({
      publicFeatures: [
        {
          id: 'popular-old-feature',
          title: 'Original public title',
          body: 'Original public body',
          publicTitle: null,
          publicBody: null,
        },
      ],
    })

    await runRetention({
      db,
      deletePendingContact: vi.fn(async () => undefined),
      minimizeUnsubscribedContact: vi.fn(async () => undefined),
      now: NOW,
    })

    const publicQuery = vi
      .mocked(db.featureRequest.findMany)
      .mock.calls[0]![0]
    expect(publicQuery).toEqual({
      where: {
        status: { in: ['open', 'planned', 'in_progress', 'shipped'] },
        privateDataPurgedAt: null,
        OR: [
          { moderatedAt: { lt: new Date('2024-07-31T12:00:00.000Z') } },
          {
            moderatedAt: null,
            createdAt: { lt: new Date('2024-07-31T12:00:00.000Z') },
          },
        ],
        AND: [
          {
            OR: [
              { retentionHoldUntil: null },
              { retentionHoldUntil: { lt: NOW } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        body: true,
        publicTitle: true,
        publicBody: true,
      },
    })
    expect(JSON.stringify(publicQuery)).not.toContain('updatedAt')
    expect(db.featureRequest.updateMany).toHaveBeenCalled()
  })

  it('keeps a pending signup for retry when Resend deletion fails', async () => {
    const db = database({
      pending: [
        {
          id: 'signup-retry',
          email: 'retry@example.com',
          releasesContactId: 'contact-retry',
          launchesContactId: null,
        },
      ],
    })
    const deletePendingContact = vi.fn(async () => {
      throw new Error('Resend unavailable')
    })

    const report = await runRetention({
      db,
      deletePendingContact,
      minimizeUnsubscribedContact: vi.fn(async () => undefined),
      now: NOW,
    })

    expect(report.pendingNewslettersDeleted).toBe(0)
    expect(report.failures).toEqual(['pending-newsletter:signup-retry'])
    expect(db.newsletterSignup.deleteMany).not.toHaveBeenCalled()
    expect(db.supportRequest.deleteMany).toHaveBeenCalled()
    expect(db.licenseVoter.deleteMany).toHaveBeenCalled()
  })

  it('keeps unsubscribe metadata for retry when Resend suppression fails', async () => {
    const db = database({
      unsubscribed: [
        {
          id: 'signup-suppression-retry',
          email: 'suppression@example.com',
          releasesContactId: 'contact-suppression-retry',
          launchesContactId: null,
        },
      ],
    })

    const report = await runRetention({
      db,
      deletePendingContact: vi.fn(async () => undefined),
      minimizeUnsubscribedContact: vi.fn(async () => {
        throw new Error('Resend unavailable')
      }),
      now: NOW,
    })

    expect(report.unsubscribedNewslettersMinimized).toBe(0)
    expect(report.failures).toEqual([
      'unsubscribed-newsletter:signup-suppression-retry',
    ])
    expect(db.newsletterSignup.updateMany).not.toHaveBeenCalled()
  })
})
