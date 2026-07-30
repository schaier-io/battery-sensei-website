/**
 * /api/feature-requests — the public feature board.
 *
 *   GET   list of publicly visible requests (approved statuses only),
 *         sorted by votes. Cacheable; contains no submitter data.
 *   POST  submit a new request (website form, contact-form toggle, or
 *         the macOS app). Lands as `pending` behind manual moderation;
 *         dispatches an admin-notify + submitter-confirmation email
 *         pair via Resend's batch endpoint (contact.ts pattern).
 *
 * The macOS app's URLSession sends no Origin header, so a missing
 * Origin is accepted ONLY when the parsed payload claims source:"app".
 * That claim is spoofable by CLI tools — accepted risk: everything
 * still lands `pending` behind moderation, strict validation, and the
 * same durable DB-count rate limits as the contact form.
 *
 * Required env vars: DATABASE_URL, RESEND_API_KEY, CONTACT_INBOX_TO,
 * CONTACT_INBOX_FROM.
 */
import { z } from 'zod'
// Explicit `.js` extensions — Node ESM (`"type":"module"`) on Vercel
// rejects extensionless relative imports at runtime.
import { prisma } from '../../lib/db.js'
import type { Prisma } from '../../lib/generated/prisma/client.js'
import {
  BOARD_SAFE_TEXT_RE,
  BOARD_SAFE_TEXT_MESSAGE,
  HAS_TEXT_RE,
  NO_LINE_BREAK_RE,
  NO_LINE_BREAK_MESSAGE,
  PUBLIC_STATUSES,
  checkOriginAndBody,
  generateTicketId,
  getClientIp,
  isStructurallyValidEmail,
  json,
} from '../../lib/feature-board.js'
import {
  buildFeatureAdminNotifyEmail,
  buildFeatureConfirmationEmail,
} from '../../lib/emails/feature-board.js'

const LIST_PAGE_SIZE = 20
const LIST_PAGE_MAX = 50

// Same durable windows as the contact form.
const EMAIL_RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const EMAIL_RATE_MAX_HITS = 3
const IP_RATE_WINDOW_MS = 10 * 60 * 1000
const IP_RATE_MAX_HITS = 5
// Honeypot / rate-limited requests are persisted for audit, but a
// flooding IP must not be able to grow the table without bound — past
// this many rows per IP per window, quarantined attempts are dropped.
const QUARANTINE_MAX_ROWS_PER_IP = 20

const SubmitSchema = z.object({
  // Hidden honeypot field — real users never see it.
  company: z.string().max(200).optional(),
  title: z
    .string()
    .trim()
    .min(4, 'Give the idea a short title — a few words is enough.')
    .max(120)
    .regex(BOARD_SAFE_TEXT_RE, BOARD_SAFE_TEXT_MESSAGE)
    // Titles are interpolated into email Subject lines and rendered
    // single-line on the board.
    .regex(NO_LINE_BREAK_RE, NO_LINE_BREAK_MESSAGE)
    .refine((s) => HAS_TEXT_RE.test(s), 'Give the idea a short title — a few words is enough.'),
  body: z
    .string()
    .trim()
    .min(12, 'A little more detail will help. A sentence or two is plenty.')
    .max(4000)
    .regex(BOARD_SAFE_TEXT_RE, BOARD_SAFE_TEXT_MESSAGE)
    .refine((s) => HAS_TEXT_RE.test(s), 'A little more detail will help. A sentence or two is plenty.'),
  email: z
    .email('That email does not look right.')
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  name: z
    .string()
    .trim()
    .max(120)
    .refine((s) => s === '' || BOARD_SAFE_TEXT_RE.test(s), BOARD_SAFE_TEXT_MESSAGE)
    .optional()
    .default(''),
  locale: z.enum(['en', 'de', 'es', 'fr', 'ja']).catch('en'),
  source: z.enum(['web', 'app']).catch('web'),
})

type SubmitInput = z.infer<typeof SubmitSchema>

function buildRequestRecord({
  ticketId,
  rawPayload,
  cleaned,
  metadata,
  adminNote,
}: {
  ticketId: string
  rawPayload: Record<string, unknown>
  cleaned: SubmitInput
  metadata: { ipAddress: string | null; userAgent: string | null; origin: string | null }
  adminNote: string | null
}): Prisma.FeatureRequestCreateInput {
  const pick = (v: unknown): string | null => (typeof v === 'string' ? v : null)
  return {
    ticketId,
    rawTitle: pick(rawPayload.title),
    rawBody: pick(rawPayload.body),
    rawEmail: pick(rawPayload.email),
    rawName: pick(rawPayload.name),
    rawPayload: rawPayload as Prisma.InputJsonValue,
    title: cleaned.title,
    body: cleaned.body,
    email: cleaned.email,
    name: cleaned.name,
    locale: cleaned.locale,
    source: cleaned.source,
    status: 'pending',
    adminNote,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    origin: metadata.origin,
  }
}

export async function GET(request: Request): Promise<Response> {
  // Cursor pagination: stable order (votes desc, createdAt desc, id desc as
  // the unique tiebreaker) so pages never skip or repeat rows between calls.
  const url = new URL(request.url)
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), LIST_PAGE_MAX)
    : LIST_PAGE_SIZE
  const rawCursor = url.searchParams.get('cursor') ?? undefined
  const cursor =
    rawCursor && rawCursor.length <= 64 && /^[A-Za-z0-9_-]+$/.test(rawCursor)
      ? rawCursor
      : undefined

  const rows = await prisma.featureRequest.findMany({
    where: { status: { in: [...PUBLIC_STATUSES] } },
    orderBy: [{ votesCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    // One extra row detects overflow for the `hasMore` flag.
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      body: true,
      publicTitle: true,
      publicBody: true,
      status: true,
      votesCount: true,
      createdAt: true,
    },
  })

  const page = rows.slice(0, limit)
  const hasMore = rows.length > limit

  return json(
    {
      ok: true,
      items: page.map((r) => ({
        id: r.id,
        title: r.publicTitle ?? r.title,
        body: r.publicBody ?? r.body,
        status: r.status,
        votes: r.votesCount,
        createdAt: r.createdAt.toISOString(),
      })),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    },
    200,
    { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' },
  )
}

export async function POST(request: Request): Promise<Response> {
  const gate = await checkOriginAndBody(request, { allowNoOrigin: true })
  if (!gate.ok) return gate.response
  const { payload: rawPayload, origin } = gate

  const parsed = SubmitSchema.safeParse(rawPayload)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return json({ error: first?.message ?? 'Invalid input.' }, 400)
  }

  // A missing Origin is only legitimate for the native app.
  if (origin === null && parsed.data.source !== 'app') {
    return json({ error: 'Forbidden' }, 403)
  }

  const { company, email } = parsed.data
  if (!isStructurallyValidEmail(email)) {
    return json({ error: 'That email does not look right.' }, 400)
  }

  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  const metadata = { ipAddress, userAgent, origin }
  const ticketId = generateTicketId()

  const [emailCount, ipCount] = await Promise.all([
    prisma.featureRequest.count({
      where: { email, createdAt: { gte: new Date(Date.now() - EMAIL_RATE_WINDOW_MS) } },
    }),
    ipAddress
      ? prisma.featureRequest.count({
          where: { ipAddress, createdAt: { gte: new Date(Date.now() - IP_RATE_WINDOW_MS) } },
        })
      : Promise.resolve(0),
  ])

  // Audit rows for trapped/limited requests are themselves capped so a
  // flooding IP cannot grow the table (and the moderation queue) without
  // bound. Requests without a resolvable IP share the same restraint via
  // the email-window count.
  const quarantineBudgetLeft =
    ipCount < QUARANTINE_MAX_ROWS_PER_IP && emailCount < QUARANTINE_MAX_ROWS_PER_IP

  // Honeypot: silently 200 so bots cannot tune around the trap. The row is
  // quarantined in `pending` with an adminNote so it stays auditable but
  // never emails anyone.
  if (company && company.trim().length > 0) {
    if (quarantineBudgetLeft) {
      await prisma.featureRequest
        .create({
          data: buildRequestRecord({
            ticketId,
            rawPayload,
            cleaned: parsed.data,
            metadata,
            adminNote: 'honeypot',
          }),
        })
        .catch(() => undefined)
    }
    return json({ ok: true, ticketId })
  }

  if (ipCount >= IP_RATE_MAX_HITS) {
    if (quarantineBudgetLeft) {
      await prisma.featureRequest
        .create({
          data: buildRequestRecord({
            ticketId,
            rawPayload,
            cleaned: parsed.data,
            metadata,
            adminNote: 'rate_limited_ip',
          }),
        })
        .catch(() => undefined)
    }
    return json(
      { error: 'Too many requests from this connection. Please try again in a few minutes.' },
      429,
    )
  }

  if (emailCount >= EMAIL_RATE_MAX_HITS) {
    if (quarantineBudgetLeft) {
      await prisma.featureRequest
        .create({
          data: buildRequestRecord({
            ticketId,
            rawPayload,
            cleaned: parsed.data,
            metadata,
            adminNote: 'rate_limited_email',
          }),
        })
        .catch(() => undefined)
    }
    return json(
      { error: 'This email address has reached its daily limit of feature requests. Please try again tomorrow.' },
      429,
    )
  }

  // Persist first — a Resend failure must not lose the submission; the
  // moderation queue works entirely from the DB row.
  const record = await prisma.featureRequest.create({
    data: buildRequestRecord({
      ticketId,
      rawPayload,
      cleaned: parsed.data,
      metadata,
      adminNote: null,
    }),
  })

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const INTERNAL_TO = process.env.CONTACT_INBOX_TO
  const PUBLIC_FROM = process.env.CONTACT_INBOX_FROM
  if (!RESEND_API_KEY || !INTERNAL_TO || !PUBLIC_FROM) {
    await prisma.featureRequest
      .update({ where: { id: record.id }, data: { adminNote: 'email_failed' } })
      .catch(() => undefined)
    return json({ ok: true, ticketId })
  }

  const notify = buildFeatureAdminNotifyEmail({
    ticketId,
    title: parsed.data.title,
    body: parsed.data.body,
    email,
    name: parsed.data.name,
    source: parsed.data.source,
    locale: parsed.data.locale,
  })
  const confirmation = buildFeatureConfirmationEmail(ticketId)

  const batchResponse = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([
      {
        from: PUBLIC_FROM,
        to: [INTERNAL_TO],
        reply_to: email,
        subject: notify.subject,
        html: notify.html,
        text: notify.text,
      },
      {
        from: PUBLIC_FROM,
        to: [email],
        reply_to: PUBLIC_FROM,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
      },
    ]),
  }).catch(() => null)

  const batch = batchResponse?.ok
    ? ((await batchResponse.json().catch(() => null)) as { data?: Array<{ id?: string }> } | null)
    : null
  const adminNotifyEmailId = batch?.data?.[0]?.id ?? null
  const confirmationEmailId = batch?.data?.[1]?.id ?? null

  await prisma.featureRequest
    .update({
      where: { id: record.id },
      data: {
        adminNotifyEmailId,
        confirmationEmailId,
        // The submission itself is durable; a failed email is an
        // operational note, not a request failure.
        adminNote: adminNotifyEmailId && confirmationEmailId ? null : 'email_failed',
      },
    })
    .catch(() => undefined)

  return json({ ok: true, ticketId })
}
