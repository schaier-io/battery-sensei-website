/**
 * Public feature-board list query, shared by GET /api/feature-requests and
 * the server render of /roadmap (the route loader, run by lib/roadmap-page.ts).
 */
// Explicit `.js` extensions: Node ESM on Vercel rejects extensionless imports.
import { prisma } from './db.js'
import { PUBLIC_STATUSES, type PublicStatus } from './feature-board.js'

export const LIST_PAGE_SIZE = 20
export const LIST_PAGE_MAX = 50

export type PublicBoardItem = {
  id: string
  title: string
  body: string
  status: PublicStatus
  votes: number
  createdAt: string
}

export type PublicBoardPage = {
  items: PublicBoardItem[]
  hasMore: boolean
  nextCursor: string | null
}

export async function listPublicFeatureRequests({
  limit = LIST_PAGE_SIZE,
  cursor,
}: { limit?: number; cursor?: string } = {}): Promise<PublicBoardPage> {
  // Cursor pagination: stable order (votes desc, createdAt desc, id desc as
  // the unique tiebreaker) so pages never skip or repeat rows between calls.
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
  return {
    items: page.map((r) => ({
      id: r.id,
      title: r.publicTitle ?? r.title,
      body: r.publicBody ?? r.body,
      status: r.status as PublicStatus,
      votes: r.votesCount,
      createdAt: r.createdAt.toISOString(),
    })),
    hasMore,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  }
}
