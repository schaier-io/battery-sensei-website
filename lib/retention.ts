/**
 * First-party retention enforcement for records held in Neon.
 *
 * Provider-controlled records (Vercel analytics/logs and Polar purchases)
 * are outside this database and remain governed by those account settings.
 * The daily Vercel cron calls `runRetention` for every deadline that 41BIT
 * LLC can enforce directly in Neon and Resend.
 */

const DAY_MS = 24 * 60 * 60 * 1000

// The confirmation token lasts 48 hours. The notice then allows seven more
// days for an unconfirmed record to be removed: 2 + 7 = 9 days total.
const PENDING_NEWSLETTER_MS = 9 * DAY_MS
const LICENSE_CACHE_MS = 60 * DAY_MS
const SECURITY_RECORD_MS = 30 * DAY_MS
const PRIVATE_RECORD_MONTHS = 24

export type PendingNewsletter = {
  id: string
  email: string
  releasesContactId: string | null
  launchesContactId: string | null
}

type PublicFeature = {
  id: string
  title: string
  body: string
  publicTitle: string | null
  publicBody: string | null
}

type CountResult = { count: number }

type Delegate<TMethods extends string> = Record<
  TMethods,
  (args: Record<string, unknown>) => Promise<CountResult>
>

/** Narrow boundary used by the retention service and its database fake. */
export type RetentionDatabase = {
  newsletterSignup: {
    findMany(args: Record<string, unknown>): Promise<PendingNewsletter[]>
    deleteMany(args: Record<string, unknown>): Promise<CountResult>
    updateMany(args: Record<string, unknown>): Promise<CountResult>
  }
  supportRequest: Delegate<'deleteMany'>
  featureRequest: {
    deleteMany(args: Record<string, unknown>): Promise<CountResult>
    findMany(args: Record<string, unknown>): Promise<PublicFeature[]>
    updateMany(args: Record<string, unknown>): Promise<CountResult>
  }
  featureVote: Delegate<'updateMany'>
  licenseVoter: Delegate<'deleteMany'>
  adminLoginAttempt: Delegate<'deleteMany'>
}

export type RetentionReport = {
  pendingNewslettersDeleted: number
  unsubscribedNewslettersMinimized: number
  supportRequestsDeleted: number
  privateFeatureRequestsDeleted: number
  publicFeatureRequestsAnonymized: number
  featureVoteIpsMinimized: number
  licenseVotersDeleted: number
  adminLoginAttemptsDeleted: number
  failures: string[]
}

type RunRetentionOptions = {
  db: RetentionDatabase
  deletePendingContact: (record: PendingNewsletter) => Promise<void>
  minimizeUnsubscribedContact: (record: PendingNewsletter) => Promise<void>
  now?: Date
}

/** Calendar-month subtraction, clamped for dates such as February 29. */
function monthsBefore(now: Date, months: number): Date {
  const monthIndex = now.getUTCFullYear() * 12 + now.getUTCMonth() - months
  const year = Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(now.getUTCDate(), lastDay),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  )
}

/**
 * Apply the published retention periods. A failed Resend deletion leaves the
 * matching Neon row untouched, so the next daily invocation can retry. If
 * Resend succeeded but the Neon delete failed, a later `not_found` response
 * is treated as success by the Resend adapter and the retry can finish.
 */
export async function runRetention({
  db,
  deletePendingContact,
  minimizeUnsubscribedContact,
  now = new Date(),
}: RunRetentionOptions): Promise<RetentionReport> {
  const pendingCutoff = new Date(now.getTime() - PENDING_NEWSLETTER_MS)
  const privateCutoff = monthsBefore(now, PRIVATE_RECORD_MONTHS)
  const licenseCutoff = new Date(now.getTime() - LICENSE_CACHE_MS)
  const securityCutoff = new Date(now.getTime() - SECURITY_RECORD_MS)
  const failures: string[] = []

  const pending = await db.newsletterSignup.findMany({
    where: {
      confirmedAt: null,
      unsubscribedAt: null,
      // This deadline is anchored to original collection/link issuance. Later
      // delivery retries must not extend the published deletion window.
      createdAt: { lt: pendingCutoff },
    },
    select: {
      id: true,
      email: true,
      releasesContactId: true,
      launchesContactId: true,
    },
  })

  let pendingNewslettersDeleted = 0
  for (const record of pending) {
    try {
      await deletePendingContact(record)
    } catch {
      // No email or provider error is logged: the opaque row id is enough to
      // correlate a failed run without adding personal data to server logs.
      failures.push(`pending-newsletter:${record.id}`)
      continue
    }

    const deleted = await db.newsletterSignup.deleteMany({
      where: {
        id: record.id,
        confirmedAt: null,
        unsubscribedAt: null,
        createdAt: { lt: pendingCutoff },
      },
    })
    pendingNewslettersDeleted += deleted.count
  }

  const unsubscribed = await db.newsletterSignup.findMany({
    where: {
      unsubscribedAt: { not: null },
      OR: [
        { locale: { not: 'en' } },
        { source: { not: 'other' } },
        { releasesContactId: { not: null } },
        { launchesContactId: { not: null } },
        { ipAddress: { not: null } },
        { userAgent: { not: null } },
        { origin: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      releasesContactId: true,
      launchesContactId: true,
    },
  })

  let unsubscribedNewslettersMinimized = 0
  for (const record of unsubscribed) {
    try {
      // Resend must first hold the same suppression state. If this fails,
      // retain the local ids/metadata so the next daily run can retry.
      await minimizeUnsubscribedContact(record)
    } catch {
      failures.push(`unsubscribed-newsletter:${record.id}`)
      continue
    }

    // Keep only the email, opt-out/consent timestamps, token epoch and row
    // timestamps required for the suppression record. The email remains
    // unique, preventing accidental re-enrolment without a fresh opt-in flow.
    const minimized = await db.newsletterSignup.updateMany({
      where: {
        id: record.id,
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
    unsubscribedNewslettersMinimized += minimized.count
  }

  const holdExpiredOrAbsent = [
    { retentionHoldUntil: null },
    { retentionHoldUntil: { lt: now } },
  ]
  const publicPrivateDataExpired = [
    { moderatedAt: { lt: privateCutoff } },
    { moderatedAt: null, createdAt: { lt: privateCutoff } },
  ]

  const [
    support,
    privateFeatures,
    publicFeatures,
    voteIps,
    licenses,
    loginAttempts,
  ] = await Promise.all([
      db.supportRequest.deleteMany({
        where: {
          updatedAt: { lt: privateCutoff },
          OR: holdExpiredOrAbsent,
        },
      }),
      db.featureRequest.deleteMany({
        where: {
          status: { in: ['pending', 'rejected'] },
          updatedAt: { lt: privateCutoff },
          OR: holdExpiredOrAbsent,
        },
      }),
      db.featureRequest.findMany({
        where: {
          status: { in: ['open', 'planned', 'in_progress', 'shipped'] },
          privateDataPurgedAt: null,
          // Approval starts the private-data clock. Votes and public roadmap
          // edits update `updatedAt` but must never extend this deadline.
          OR: publicPrivateDataExpired,
          AND: [{ OR: holdExpiredOrAbsent }],
        },
        select: {
          id: true,
          title: true,
          body: true,
          publicTitle: true,
          publicBody: true,
        },
      }),
      db.featureVote.updateMany({
        where: {
          ipAddress: { not: null },
          createdAt: { lt: securityCutoff },
        },
        // Keep the keyed voter relation needed for public counts and
        // duplicate-vote prevention; erase only the short-lived abuse IP.
        data: { ipAddress: null },
      }),
      db.licenseVoter.deleteMany({
        where: { lastValidatedAt: { lt: licenseCutoff } },
      }),
      db.adminLoginAttempt.deleteMany({
        where: {
          createdAt: { lt: securityCutoff },
          OR: holdExpiredOrAbsent,
        },
      }),
    ])

  let publicFeatureRequestsAnonymized = 0
  for (const feature of publicFeatures) {
    const anonymized = await db.featureRequest.updateMany({
      where: {
        id: feature.id,
        privateDataPurgedAt: null,
        OR: publicPrivateDataExpired,
        AND: [{ OR: holdExpiredOrAbsent }],
      },
      data: {
        rawTitle: null,
        rawBody: null,
        rawEmail: null,
        rawName: null,
        rawPayload: {},
        // Preserve only the approved public representation and aggregate
        // fields. The public API already falls back to cleaned copy when an
        // explicit public edit is absent.
        title: feature.publicTitle ?? feature.title,
        body: feature.publicBody ?? feature.body,
        email: '',
        name: '',
        locale: 'en',
        // `source` is required by the schema, so reset it to a generic enum
        // value rather than retaining the submitter's real source.
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
        privateDataPurgedAt: now,
      },
    })
    publicFeatureRequestsAnonymized += anonymized.count
  }

  return {
    pendingNewslettersDeleted,
    unsubscribedNewslettersMinimized,
    supportRequestsDeleted: support.count,
    privateFeatureRequestsDeleted: privateFeatures.count,
    publicFeatureRequestsAnonymized,
    featureVoteIpsMinimized: voteIps.count,
    licenseVotersDeleted: licenses.count,
    adminLoginAttemptsDeleted: loginAttempts.count,
    failures,
  }
}
