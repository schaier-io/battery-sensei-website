/**
 * Single shared Prisma client.
 *
 * Vercel Fluid Compute reuses function instances across concurrent requests,
 * so a per-request `new PrismaClient()` would leak connections fast. The
 * `globalThis` cache reuses the same client across hot invocations on the
 * same isolate; cold starts get a fresh one as expected.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
