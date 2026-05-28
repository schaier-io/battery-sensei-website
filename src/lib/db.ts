/**
 * Server-only Prisma client singleton.
 *
 * Uses the @prisma/adapter-pg driver so the same instance works in both
 * Node (local dev, Vercel Functions / Fluid Compute) and any future
 * runtime that needs a `pg` connection pool.
 *
 * In dev, Vite re-evaluates this module on HMR — without the global
 * cache we'd leak a new PrismaClient + pg pool every save.
 */
import { PrismaPg } from '@prisma/adapter-pg'
// Generated client lives at <repo>/lib/generated/prisma (see schema.prisma
// `output`). It's git-ignored and produced by `prisma generate` (postinstall
// + build).
import { PrismaClient } from '../../lib/generated/prisma/client.ts'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
}

export const db: PrismaClient = globalThis.__prisma ?? create()
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db
}
