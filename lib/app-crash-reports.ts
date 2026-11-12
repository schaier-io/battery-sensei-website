/**
 * POST /api/crash-reports: an opt-in, app-redacted macOS crash report.
 *
 * Request:
 *   {"appVersion":"1.22.0","tier":"trial","osVersion":"26.1",
 *    "note":"optional, from the user","ips":"<header JSON line>\n<body JSON>"}
 *
 * `ips` is the `.ips` file text after the app removed identifiers. It is
 * stored verbatim (see the CrashReport model) and parsed here only to check
 * it. The server re-checks redaction and REJECTS rather than strips, so an
 * app redaction bug surfaces in testing and nothing unredacted is stored.
 *
 * Responses: 201 {ok, reportId} | 400 invalid | 403 | 404 (switched off) |
 * 413 | 415 | 422 identifier_present / home_path_present / home_path_in_note /
 * duplicate_key / unsupported_report | 429 busy (with Retry-After; the app keeps the report
 * and retries later).
 *
 * The caps are spoofable: anyone can forge reports that pass these checks.
 * They bound storage and email volume; they cannot guarantee that a real
 * report gets in on a day someone floods the endpoint.
 */
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from './db.js'
import type { Prisma } from './generated/prisma/client.js'
import { generateTicketId, json } from './feature-board.js'
import {
  APP_VERSION_RE,
  AppTierSchema,
  DAY_MS,
  HOUR_MS,
  NO_STORE,
  gateAppRequest,
  isClientThrottled,
  isWellFormedText,
} from './app-ingest.js'
import { buildCrashReportEmail, topFrames } from './emails/crash-report.js'
import { fieldText, findPrivacyViolation, isObject, parseIps, type JsonObject } from './ips-report.js'

/** Real reports are 17-40 KB (measured on macOS 27); this leaves headroom. */
const CRASH_MAX_BYTES = 128 * 1024
const NOTE_MAX_CHARS = 2000
/**
 * Full reports (not repeats) accepted per rolling day, across all clients.
 * Worst case under a sustained flood: 20 x 128 KiB x 90 days retention,
 * about 230 MB.
 */
export const FULL_REPORTS_DAILY_CAP = 20
/**
 * Repeat rows per rolling day. A repeat stores no report text and no note,
 * only a row of short fields, so 500 a day stays a few MB over retention.
 * Separate from the full-report cap, so neither kind of flood blocks the
 * other.
 */
export const REPEAT_ROWS_DAILY_CAP = 500
const BUSY_RETRY_AFTER_S = 6 * 60 * 60
const PER_CLIENT_HOURLY_MAX = 3
const RESEND_TIMEOUT_MS = 10_000
/** How long a request may wait for a pooled connection, then run its transaction. */
const ADMISSION_MAX_WAIT_MS = 5000
const ADMISSION_TIMEOUT_MS = 10_000
const ADMISSION_BUSY_RETRY_AFTER_S = 60
const SIGNATURE_FRAMES = 8
const SIGNATURE_HEX_CHARS = 16
/**
 * Key for pg_advisory_xact_lock. The cap checks and the insert run under it,
 * so concurrent requests cannot all pass a count before any of them inserts.
 * Any constant works; nothing else in this database takes advisory locks.
 */
const CRASH_ADMISSION_LOCK = 1_112_748_882

/** The main app only; the Low Power Mode helper has its own bundle id. */
const APP_BUNDLE_ID = 'io.schaier.battery-sensei'
/** `.ips` bug type for an app crash report. */
const CRASH_BUG_TYPE = '309'

/** "26.1" or "26.1.2". */
const OS_VERSION_RE = /^\d{2}\.\d{1,2}(\.\d{1,2})?$/
/** Free text minus control characters (newline and tab allowed). */
const NOTE_TEXT_RE = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/

const CrashReportSchema = z.strictObject({
  appVersion: z.string().regex(APP_VERSION_RE),
  tier: AppTierSchema,
  osVersion: z.string().regex(OS_VERSION_RE),
  note: z.string().trim().max(NOTE_MAX_CHARS).regex(NOTE_TEXT_RE).refine(isWellFormedText).optional(),
  // Well-formed, so the UTF-8 text Postgres stores is the text checked here.
  ips: z.string().min(1).refine(isWellFormedText),
})

/** Groups repeats of one crash: version, exception, top faulting frames. */
function crashSignature(appVersion: string, body: JsonObject): string {
  const exception = isObject(body.exception) ? body.exception : {}
  const parts = [
    appVersion,
    fieldText(exception.type),
    fieldText(exception.signal),
    ...topFrames(body, SIGNATURE_FRAMES),
  ]
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, SIGNATURE_HEX_CHARS)
}

type Verdict = 'capped' | 'repeat' | 'full'

/**
 * Which row the caps allow for this report. Runs once unlocked, as a cheap
 * early exit that keeps a flood off the lock, then again under the lock,
 * where it counts.
 */
async function admissionVerdict(
  db: Pick<Prisma.TransactionClient, 'crashReport'>,
  signature: string,
  since: Date,
  hasNote: boolean,
): Promise<Verdict> {
  // A repeat is measured against FULL reports only. Counting repeat rows too
  // would chain: a crash that recurs daily would never store a fresh report
  // or send another email after its first one. A report with a note is never
  // a repeat: a repeat row drops the note, and the user wrote it to be read.
  if (!hasNote) {
    const sameCrash = await db.crashReport.count({
      where: { signature, createdAt: { gte: since }, status: { not: 'duplicate' } },
    })
    // Repeats have their own cap, so a flood of one replayed crash cannot
    // lock out different real ones.
    if (sameCrash > 0) {
      const repeatRows = await db.crashReport.count({
        where: { createdAt: { gte: since }, status: 'duplicate' },
      })
      return repeatRows >= REPEAT_ROWS_DAILY_CAP ? 'capped' : 'repeat'
    }
  }

  const fullReports = await db.crashReport.count({
    where: { createdAt: { gte: since }, status: { not: 'duplicate' } },
  })
  return fullReports >= FULL_REPORTS_DAILY_CAP ? 'capped' : 'full'
}

type Admission = { id: string; isRepeat: boolean } | 'capped' | 'locked'

/**
 * Re-checks the caps and inserts the row under one advisory lock (see
 * CRASH_ADMISSION_LOCK), so concurrent requests cannot all pass a count
 * before any of them inserts. Operations run one at a time, as elsewhere.
 */
async function admitReport(
  tx: Prisma.TransactionClient,
  input: {
    reportId: string
    appVersion: string
    tier: 'paid' | 'trial' | 'expired'
    osVersion: string
    signature: string
    ips: string
    note: string | null
    since: Date
  },
): Promise<Admission> {
  // Try, never wait: a waiter would hold a pooled connection, and a flood
  // queued on the lock would starve the board endpoints sharing the pool.
  // The xact variant releases at commit or rollback; a session lock would
  // leak on pooled connections.
  const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_xact_lock(${CRASH_ADMISSION_LOCK}::bigint) AS locked`
  if (!lock?.locked) return 'locked'

  const verdict = await admissionVerdict(tx, input.signature, input.since, input.note !== null)
  if (verdict === 'capped') return 'capped'
  const isRepeat = verdict === 'repeat'

  // Persist before emailing: a Resend failure must not lose the report. A
  // repeat keeps only the row (it counts how often a crash happens): no
  // text, and no note (a report with one is never a repeat).
  const record = await tx.crashReport.create({
    data: {
      reportId: input.reportId,
      appVersion: input.appVersion,
      tier: input.tier,
      osVersion: input.osVersion,
      signature: input.signature,
      ips: isRepeat ? '' : input.ips,
      note: isRepeat ? null : input.note,
      status: isRepeat ? 'duplicate' : 'received',
    },
  })
  return { id: record.id, isRepeat }
}

const busy = (retryAfterS: number): Response =>
  json({ error: 'busy' }, 429, { ...NO_STORE, 'retry-after': String(retryAfterS) })

export async function POST(request: Request): Promise<Response> {
  const gate = await gateAppRequest(request, CRASH_MAX_BYTES)
  if (!gate.ok) return gate.response

  const parsed = CrashReportSchema.safeParse(gate.payload)
  if (!parsed.success) return json({ error: 'invalid' }, 400, NO_STORE)
  const { appVersion, tier, osVersion, ips } = parsed.data
  const note = parsed.data.note || null

  // Brake before parsing the .ips text, so a flood of garbage is slowed too.
  if (isClientThrottled(request, 'crash', PER_CLIENT_HOURLY_MAX, HOUR_MS)) {
    return busy(HOUR_MS / 1000)
  }

  const report = parseIps(ips)
  if (!report.ok) return json({ error: report.error }, 422, NO_STORE)

  // Its own code, so the app can ask the user to edit the note instead of
  // dropping a good report.
  if (note !== null && findPrivacyViolation([note])) {
    return json({ error: 'home_path_in_note' }, 422, NO_STORE)
  }
  const violation = findPrivacyViolation([report.header, report.body])
  if (violation) return json(violation, 422, NO_STORE)

  const { header } = report
  if (
    header.bug_type !== CRASH_BUG_TYPE
    || header.bundleID !== APP_BUNDLE_ID
    || header.app_version !== appVersion
    // The header reads "macOS 26.1 (25B78)".
    || typeof header.os_version !== 'string'
    || !header.os_version.startsWith(`macOS ${osVersion} `)
  ) {
    return json({ error: 'unsupported_report' }, 422, NO_STORE)
  }

  const signature = crashSignature(appVersion, report.body)
  const since = new Date(Date.now() - DAY_MS)
  const reportId = generateTicketId()

  let admitted: Admission
  try {
    if ((await admissionVerdict(prisma, signature, since, note !== null)) === 'capped') {
      return busy(BUSY_RETRY_AFTER_S)
    }
    admitted = await prisma.$transaction(
      (tx) => admitReport(tx, { reportId, appVersion, tier, osVersion, signature, ips, note, since }),
      { maxWait: ADMISSION_MAX_WAIT_MS, timeout: ADMISSION_TIMEOUT_MS },
    )
  } catch (error) {
    // Nothing is stored unless the transaction commits, so any failure here
    // is safe to retry: a transaction that could not start in time (P2028),
    // or a pool connect timeout, which arrives as a plain Error with no code
    // (measured with Prisma 7.10 and adapter-pg). Logs the code or name only:
    // Prisma messages can echo query arguments, here the note and report.
    const { code, name } = error as { code?: unknown; name?: unknown }
    console.error('[crash-reports] admission failed', { code, name })
    return busy(ADMISSION_BUSY_RETRY_AFTER_S)
  }
  if (admitted === 'locked') return busy(ADMISSION_BUSY_RETRY_AFTER_S)
  if (admitted === 'capped') return busy(BUSY_RETRY_AFTER_S)
  const created = () => json({ ok: true, reportId }, 201, NO_STORE)
  if (admitted.isRepeat) return created()

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const INTERNAL_TO = process.env.CONTACT_INBOX_TO
  const PUBLIC_FROM = process.env.CONTACT_INBOX_FROM
  if (!RESEND_API_KEY || !INTERNAL_TO || !PUBLIC_FROM) {
    await prisma.crashReport
      .update({ where: { id: admitted.id }, data: { status: 'notify_failed' } })
      .catch(() => undefined)
    return created()
  }

  // Text only, and never the user's note or the report text: the inbox keeps
  // just the technical summary (exception and top frames), which holds no
  // personal data, outside the retention job's reach. The row is committed
  // by now, so a failure here must still end in a status update and a 201:
  // a 500 would make the app re-send a report we already have.
  let sent: { id?: string } | null = null
  try {
    const email = buildCrashReportEmail({
      reportId,
      appVersion,
      tier,
      osVersion,
      signature,
      hasNote: note !== null,
      body: report.body,
    })
    // Bounded, so a hung Resend cannot hold the request until the app gives
    // up and re-sends a second copy of the report.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: PUBLIC_FROM, to: [INTERNAL_TO], subject: email.subject, text: email.text }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    })
    sent = response.ok ? ((await response.json()) as { id?: string } | null) : null
  } catch {
    sent = null
  }

  await prisma.crashReport
    .update({
      where: { id: admitted.id },
      data: sent?.id
        ? { status: 'notified', notifyEmailId: sent.id }
        : { status: 'notify_failed' },
    })
    .catch(() => undefined)

  return created()
}
