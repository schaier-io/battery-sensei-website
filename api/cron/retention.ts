/** Daily, authenticated retention enforcement invoked by Vercel Cron. */
import { db } from '../../lib/db.js'
import { getResendClient } from '../../lib/resend.js'
import {
  runRetention,
  type PendingNewsletter,
  type RetentionDatabase,
} from '../../lib/retention.js'

type ResendDeleteResult = {
  data: unknown | null
  error: null | { name: string; message: string; statusCode: number | null }
}

type ResendContactClient = {
  contacts: {
    remove(selector: string | { email: string }): Promise<ResendDeleteResult>
  }
}

type ResendContactUpdateClient = {
  contacts: {
    update(options: {
      email: string
      unsubscribed: boolean
      firstName: null
      lastName: null
    }): Promise<ResendDeleteResult>
  }
}

export function isCronAuthorized(
  request: Request,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!secret || secret.length < 16) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * Remove every known representation of an expired pending contact. Stored ids
 * cover legacy/two-contact rows; the email selector covers the current
 * account-level Resend contact. `not_found` is success, making retries safe.
 */
export async function deletePendingResendContact(
  record: PendingNewsletter,
  client: ResendContactClient = getResendClient(),
): Promise<void> {
  const selectors: Array<string | { email: string }> = []
  const ids = new Set(
    [record.releasesContactId, record.launchesContactId].filter(
      (id): id is string => Boolean(id),
    ),
  )
  selectors.push(...ids, { email: record.email })

  for (const selector of selectors) {
    const result = await client.contacts.remove(selector)
    if (
      result.error &&
      result.error.name !== 'not_found' &&
      result.error.statusCode !== 404
    ) {
      throw new Error('Resend contact deletion failed')
    }
  }
}

/**
 * Make Resend's record a minimal account-level suppression entry before local
 * request metadata/contact ids are erased. Absence is already compliant.
 */
export async function minimizeUnsubscribedResendContact(
  record: PendingNewsletter,
  client: ResendContactUpdateClient = getResendClient(),
): Promise<void> {
  const result = await client.contacts.update({
    email: record.email,
    unsubscribed: true,
    firstName: null,
    lastName: null,
  })
  if (
    result.error &&
    result.error.name !== 'not_found' &&
    result.error.statusCode !== 404
  ) {
    throw new Error('Resend suppression update failed')
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

type RetentionHandlerOptions = {
  db: RetentionDatabase
  deletePendingContact: (record: PendingNewsletter) => Promise<void>
  minimizeUnsubscribedContact: (record: PendingNewsletter) => Promise<void>
  getSecret: () => string | undefined
  now?: () => Date
}

/** HTTP seam with injected system boundaries for deterministic tests. */
export function createRetentionHandler(options: RetentionHandlerOptions) {
  return async function retentionHandler(request: Request): Promise<Response> {
    if (!isCronAuthorized(request, options.getSecret())) {
      return json({ error: 'Unauthorized' }, 401)
    }

    try {
      const report = await runRetention({
        db: options.db,
        deletePendingContact: options.deletePendingContact,
        minimizeUnsubscribedContact: options.minimizeUnsubscribedContact,
        now: options.now?.(),
      })
      const status = report.failures.length === 0 ? 200 : 503
      return json({ ok: status === 200, ...report }, status)
    } catch (error) {
      console.error('[retention] enforcement failed', {
        type: error instanceof Error ? error.name : 'UnknownError',
      })
      return json({ ok: false, error: 'retention-failed' }, 500)
    }
  }
}

const productionHandler = createRetentionHandler({
  // Prisma's generated generic delegates are wider than the deliberately
  // small structural boundary consumed by the retention service.
  db: db as unknown as RetentionDatabase,
  deletePendingContact: deletePendingResendContact,
  minimizeUnsubscribedContact: minimizeUnsubscribedResendContact,
  getSecret: () => process.env.CRON_SECRET,
})

export async function GET(request: Request): Promise<Response> {
  return productionHandler(request)
}
