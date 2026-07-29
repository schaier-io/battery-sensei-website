/**
 * /api/admin/feature-requests — moderation for the feature board.
 * Every method requires the signed admin session cookie (see
 * lib/admin-session.ts); mutations additionally require an allowlisted
 * Origin as CSRF belt-and-suspenders on top of SameSite=Strict.
 *
 *   GET    ?status=pending|open|planned|in_progress|shipped|rejected|all
 *          &cursor=<id>&limit=50 — newest first, cursor pagination.
 *   PATCH  { id, action: "approve" | "reject" | "set_status" | "edit", … }
 *
 * approve/reject send the decision email to the submitter via Resend;
 * an email failure never fails the moderation itself (`emailSent`
 * reports it).
 */
import { z } from 'zod'
import { prisma } from '../../lib/db.js'
import {
  BOARD_SAFE_TEXT_RE,
  BOARD_SAFE_TEXT_MESSAGE,
  NO_LINE_BREAK_RE,
  NO_LINE_BREAK_MESSAGE,
  checkOriginAndBody,
  json,
} from '../../lib/feature-board.js'
import { requireAdmin } from '../../lib/admin-session.js'
import {
  buildFeatureApprovedEmail,
  buildFeatureRejectedEmail,
  type BuiltEmail,
} from '../../lib/emails/feature-board.js'

const NO_STORE = { 'cache-control': 'no-store' }
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

const STATUS_FILTERS = ['pending', 'open', 'planned', 'in_progress', 'shipped', 'rejected'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

// Roadmap transitions may only start from an already-approved status.
const APPROVED_STATUSES = ['open', 'planned', 'in_progress', 'shipped'] as const

const publicCopyField = z
  .string()
  .trim()
  .max(120)
  .regex(BOARD_SAFE_TEXT_RE, BOARD_SAFE_TEXT_MESSAGE)
  // Public titles land in email Subject lines — single line only.
  .regex(NO_LINE_BREAK_RE, NO_LINE_BREAK_MESSAGE)

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    id: z.string().min(1).max(64),
    publicTitle: publicCopyField.min(4).optional(),
    publicBody: z
      .string()
      .trim()
      .min(12)
      .max(4000)
      .regex(BOARD_SAFE_TEXT_RE, BOARD_SAFE_TEXT_MESSAGE)
      .optional(),
  }),
  z.object({
    action: z.literal('reject'),
    id: z.string().min(1).max(64),
    reason: z
      .string()
      .trim()
      .min(4, 'Give the submitter an honest reason.')
      .max(1000)
      .regex(BOARD_SAFE_TEXT_RE, BOARD_SAFE_TEXT_MESSAGE),
  }),
  z.object({
    action: z.literal('set_status'),
    id: z.string().min(1).max(64),
    status: z.enum(['open', 'planned', 'in_progress', 'shipped']),
  }),
  z.object({
    action: z.literal('edit'),
    id: z.string().min(1).max(64),
    publicTitle: publicCopyField.min(4).optional(),
    publicBody: z
      .string()
      .trim()
      .min(12)
      .max(4000)
      .regex(BOARD_SAFE_TEXT_RE, BOARD_SAFE_TEXT_MESSAGE)
      .optional(),
  }),
])

const ADMIN_ITEM_SELECT = {
  id: true,
  ticketId: true,
  status: true,
  source: true,
  title: true,
  body: true,
  publicTitle: true,
  publicBody: true,
  email: true,
  name: true,
  locale: true,
  votesCount: true,
  rejectionReason: true,
  adminNote: true,
  ipAddress: true,
  userAgent: true,
  origin: true,
  createdAt: true,
  moderatedAt: true,
} as const

type AdminRow = {
  id: string
  ticketId: string
  status: string
  source: string
  title: string
  body: string
  publicTitle: string | null
  publicBody: string | null
  email: string
  name: string
  locale: string
  votesCount: number
  rejectionReason: string | null
  adminNote: string | null
  ipAddress: string | null
  userAgent: string | null
  origin: string | null
  createdAt: Date
  moderatedAt: Date | null
}

function toItem(row: AdminRow) {
  return {
    ...row,
    votes: row.votesCount,
    createdAt: row.createdAt.toISOString(),
    moderatedAt: row.moderatedAt?.toISOString() ?? null,
  }
}

/** Single-send Resend dispatch. Returns the message id, or null on failure. */
async function sendDecisionEmail(to: string, email: BuiltEmail): Promise<string | null> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const PUBLIC_FROM = process.env.CONTACT_INBOX_FROM
  if (!RESEND_API_KEY || !PUBLIC_FROM) return null

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: PUBLIC_FROM,
      to: [to],
      reply_to: PUBLIC_FROM,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  }).catch(() => null)

  if (!response?.ok) return null
  const body = (await response.json().catch(() => null)) as { id?: string } | null
  return body?.id ?? null
}

export async function GET(request: Request): Promise<Response> {
  if (!requireAdmin(request)) return json({ error: 'Unauthorized' }, 401, NO_STORE)

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status') ?? 'pending'
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(
    Math.max(Math.trunc(Number(url.searchParams.get('limit')) || DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE,
  )

  const where =
    statusParam === 'all'
      ? {}
      : (STATUS_FILTERS as readonly string[]).includes(statusParam)
        ? { status: statusParam as StatusFilter }
        : null
  if (where === null) return json({ error: 'Invalid status filter.' }, 400, NO_STORE)

  const rows = await prisma.featureRequest.findMany({
    where,
    // `id` tiebreaker keeps cursor pagination stable when rows share a
    // createdAt millisecond (bulk inserts).
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: ADMIN_ITEM_SELECT,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return json(
    {
      ok: true,
      items: page.map(toItem),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    },
    200,
    NO_STORE,
  )
}

export async function PATCH(request: Request): Promise<Response> {
  if (!requireAdmin(request)) return json({ error: 'Unauthorized' }, 401, NO_STORE)

  const gate = await checkOriginAndBody(request)
  if (!gate.ok) return gate.response

  const parsed = PatchSchema.safeParse(gate.payload)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return json({ error: first?.message ?? 'Invalid input.' }, 400, NO_STORE)
  }
  const input = parsed.data

  const existing = await prisma.featureRequest.findUnique({
    where: { id: input.id },
    select: ADMIN_ITEM_SELECT,
  })
  if (!existing) return json({ error: 'Request not found.' }, 404, NO_STORE)

  switch (input.action) {
    case 'approve': {
      if (existing.status !== 'pending') {
        return json({ error: 'Only pending requests can be approved.' }, 409, NO_STORE)
      }
      const publicTitle = input.publicTitle ?? existing.title
      const publicBody = input.publicBody ?? existing.body
      const updated = await prisma.featureRequest.update({
        where: { id: existing.id },
        data: { status: 'open', publicTitle, publicBody, moderatedAt: new Date() },
        select: ADMIN_ITEM_SELECT,
      })
      const emailId = await sendDecisionEmail(
        existing.email,
        buildFeatureApprovedEmail({ ticketId: existing.ticketId, publicTitle }),
      )
      if (emailId) {
        await prisma.featureRequest
          .update({ where: { id: existing.id }, data: { decisionEmailId: emailId } })
          .catch(() => undefined)
      }
      return json({ ok: true, item: toItem(updated), emailSent: emailId !== null }, 200, NO_STORE)
    }

    case 'reject': {
      // Allowed from `pending` (normal moderation) AND from any approved
      // status — that second path is the takedown lever for content that
      // must leave the public board. Only the fresh-moderation case
      // emails the submitter; a takedown is an internal act.
      if (existing.status === 'rejected') {
        return json({ error: 'Already rejected.' }, 409, NO_STORE)
      }
      const wasPending = existing.status === 'pending'
      const updated = await prisma.featureRequest.update({
        where: { id: existing.id },
        data: { status: 'rejected', rejectionReason: input.reason, moderatedAt: new Date() },
        select: ADMIN_ITEM_SELECT,
      })
      const emailId = wasPending
        ? await sendDecisionEmail(
            existing.email,
            buildFeatureRejectedEmail({ ticketId: existing.ticketId, reason: input.reason }),
          )
        : null
      if (emailId) {
        await prisma.featureRequest
          .update({ where: { id: existing.id }, data: { decisionEmailId: emailId } })
          .catch(() => undefined)
      }
      return json(
        { ok: true, item: toItem(updated), emailSent: wasPending ? emailId !== null : undefined },
        200,
        NO_STORE,
      )
    }

    case 'set_status': {
      if (!(APPROVED_STATUSES as readonly string[]).includes(existing.status)) {
        return json({ error: 'Only approved requests can change roadmap status.' }, 409, NO_STORE)
      }
      const updated = await prisma.featureRequest.update({
        where: { id: existing.id },
        data: { status: input.status },
        select: ADMIN_ITEM_SELECT,
      })
      return json({ ok: true, item: toItem(updated) }, 200, NO_STORE)
    }

    case 'edit': {
      if (input.publicTitle === undefined && input.publicBody === undefined) {
        return json({ error: 'Nothing to change.' }, 400, NO_STORE)
      }
      const updated = await prisma.featureRequest.update({
        where: { id: existing.id },
        data: {
          ...(input.publicTitle !== undefined ? { publicTitle: input.publicTitle } : {}),
          ...(input.publicBody !== undefined ? { publicBody: input.publicBody } : {}),
        },
        select: ADMIN_ITEM_SELECT,
      })
      return json({ ok: true, item: toItem(updated) }, 200, NO_STORE)
    }
  }
}
