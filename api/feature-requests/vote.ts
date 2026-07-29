/**
 * POST /api/feature-requests/vote — license-bound voting.
 *
 * Single action-based endpoint; the license key travels ONLY in the
 * POST body (never a URL) and is immediately reduced to an HMAC voter
 * hash — the raw key is never stored or logged.
 *
 *   { action: "check",  licenseKey }             → which ids this key voted for
 *   { action: "vote",   licenseKey, requestId }  → cast a vote (idempotent)
 *   { action: "unvote", licenseKey, requestId }  → withdraw a vote (idempotent)
 *
 * Responses: 200 { ok, valid, votedIds?, votes? }. An invalid key is a
 * calm `{ valid: false }` 200 so the board UI can re-prompt; a Polar
 * outage is a 502 and never counts as "invalid".
 *
 * Rate limits: 30 vote-mutations / 10 min / IP (durable, FeatureVote
 * count) + a best-effort in-memory brake on invalid-key probing.
 */
import { z } from 'zod'
import { prisma } from '../../lib/db.js'
import {
  LICENSE_CACHE_MUTATION_MS,
  LICENSE_CACHE_READ_MS,
  LICENSE_KEY_RE,
  REQUEST_ID_RE,
  VOTABLE_STATUSES,
  checkOriginAndBody,
  getClientIp,
  isMemoryThrottled,
  json,
  recordMemoryThrottleHit,
  validateLicenseKey,
  voterHash,
} from '../../lib/feature-board.js'

const VOTE_RATE_WINDOW_MS = 10 * 60 * 1000
const VOTE_RATE_MAX_MUTATIONS = 30
const INVALID_KEY_MAX_ATTEMPTS = 10

const NO_STORE = { 'cache-control': 'no-store' }

const VoteSchema = z.object({
  action: z.enum(['check', 'vote', 'unvote']),
  licenseKey: z
    .string()
    .trim()
    .regex(LICENSE_KEY_RE, 'That license key does not look right.'),
  requestId: z.string().regex(REQUEST_ID_RE).optional(),
})

async function votedIdsFor(hash: string): Promise<string[]> {
  const rows = await prisma.featureVote.findMany({
    where: { voterHash: hash },
    select: { requestId: true },
  })
  return rows.map((r) => r.requestId)
}

export async function POST(request: Request): Promise<Response> {
  // Absent Origin allowed: the macOS app votes through URLSession, which
  // sends none. Browser calls still must match the allowlist.
  const gate = await checkOriginAndBody(request, { allowNoOrigin: true, maxBytes: 8 * 1024 })
  if (!gate.ok) return gate.response

  const parsed = VoteSchema.safeParse(gate.payload)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return json({ error: first?.message ?? 'Invalid input.' }, 400, NO_STORE)
  }
  const { action, licenseKey, requestId } = parsed.data

  if ((action === 'vote' || action === 'unvote') && !requestId) {
    return json({ error: 'Missing requestId.' }, 400, NO_STORE)
  }

  const ipAddress = getClientIp(request)

  // Soft brake on invalid-key probing before we spend a Polar round-trip.
  // Only FAILED validations count toward the budget (recorded below), so
  // legitimate check/vote traffic is never throttled by its own volume.
  if (ipAddress && isMemoryThrottled(`vote-key:${ipAddress}`, INVALID_KEY_MAX_ATTEMPTS)) {
    return json({ error: 'Too many attempts. Please try again in a few minutes.' }, 429, NO_STORE)
  }

  // Mutations demand a fresher Polar validation than read-only checks,
  // bounding how long a just-revoked key can keep voting.
  const validity = await validateLicenseKey(
    licenseKey,
    action === 'check' ? LICENSE_CACHE_READ_MS : LICENSE_CACHE_MUTATION_MS,
  )
  if (validity === 'error') {
    return json({ error: 'The license service is unavailable right now. Please try again shortly.' }, 502, NO_STORE)
  }
  if (validity === 'invalid') {
    if (ipAddress) recordMemoryThrottleHit(`vote-key:${ipAddress}`, VOTE_RATE_WINDOW_MS)
    return json({ ok: true, valid: false }, 200, NO_STORE)
  }

  const hash = voterHash(licenseKey)

  if (action === 'check') {
    return json({ ok: true, valid: true, votedIds: await votedIdsFor(hash) }, 200, NO_STORE)
  }

  // Durable mutation rate limit (indexed count over FeatureVote).
  if (ipAddress) {
    const recent = await prisma.featureVote.count({
      where: { ipAddress, createdAt: { gte: new Date(Date.now() - VOTE_RATE_WINDOW_MS) } },
    })
    if (recent >= VOTE_RATE_MAX_MUTATIONS) {
      return json({ error: 'Too many votes in a short time. Please try again in a few minutes.' }, 429, NO_STORE)
    }
  }

  const target = await prisma.featureRequest.findUnique({
    where: { id: requestId! },
    select: { id: true, status: true },
  })
  if (!target) {
    return json({ error: 'not_found' }, 404, NO_STORE)
  }

  if (action === 'vote') {
    if (!(VOTABLE_STATUSES as readonly string[]).includes(target.status)) {
      return json({ error: 'not_votable' }, 409, NO_STORE)
    }
    try {
      await prisma.$transaction([
        prisma.featureVote.create({
          data: { requestId: target.id, voterHash: hash, ipAddress },
        }),
        prisma.featureRequest.update({
          where: { id: target.id },
          data: { votesCount: { increment: 1 } },
        }),
      ])
    } catch (error) {
      // P2002 = unique(requestId, voterHash) hit — already voted. The
      // transaction rolled back, so the counter was not incremented.
      const code = (error as { code?: string }).code
      if (code !== 'P2002') throw error
    }
  } else {
    await prisma.$transaction(async (tx) => {
      const removed = await tx.featureVote.deleteMany({
        where: { requestId: target.id, voterHash: hash },
      })
      if (removed.count > 0) {
        await tx.featureRequest.update({
          where: { id: target.id },
          data: { votesCount: { decrement: removed.count } },
        })
      }
    })
  }

  const [fresh, votedIds] = await Promise.all([
    prisma.featureRequest.findUnique({
      where: { id: target.id },
      select: { votesCount: true },
    }),
    votedIdsFor(hash),
  ])

  return json(
    { ok: true, valid: true, votedIds, votes: fresh?.votesCount ?? 0 },
    200,
    NO_STORE,
  )
}
