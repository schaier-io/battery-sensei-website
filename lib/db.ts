/**
 * Single shared Prisma client.
 *
 * Vercel Fluid Compute reuses function instances across concurrent requests,
 * so a per-request `new PrismaClient()` would leak connections fast. The
 * `globalThis` cache reuses the same client across hot invocations on the
 * same isolate; cold starts get a fresh one as expected.
 */

import { PrismaPg } from '@prisma/adapter-pg'
// Explicit `.js` — Vercel ESM runtime (`"type":"module"`) resolves
// relative imports strictly without extension probing.
import { PrismaClient } from './generated/prisma/client.js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/**
 * How long a query may wait for a pooled connection, or for a new one to
 * open, before it fails. pg-pool's default is to wait forever, so a full
 * pool (a flood, a slow database) would hang every endpoint until the
 * function times out. Long enough for a Neon compute to wake from suspend.
 */
const DB_CONNECT_TIMEOUT_MS = 10_000

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Alias — newsletter modules + the new double-opt-in free-signup
// import `db`; the older `api/contact.ts` keeps using the `prisma`
// name. Same underlying singleton either way; both exports share the
// connection pool so we never create a second client by mistake.
export const db = prisma
