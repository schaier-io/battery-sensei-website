/**
 * /api/admin/session — admin dashboard authentication.
 *
 *   POST    { key }  → verify against ADMIN_DASHBOARD_KEY (timing-safe)
 *                      and set the signed httpOnly session cookie.
 *   GET     session check (used by the dashboard shell on mount).
 *   DELETE  logout (clears the cookie).
 *
 * Login attempts are durably rate-limited via AdminLoginAttempt rows:
 * 5 failures / 15 min / IP. Failures also eat a short fixed delay so
 * the timing-safe compare isn't the only brake.
 */
import { z } from 'zod'
import { prisma } from '../../lib/db.js'
import {
  checkOriginAndBody,
  getClientIp,
  isAllowedOrigin,
  json,
} from '../../lib/feature-board.js'
import {
  adminCookie,
  checkAdminKey,
  clearAdminCookie,
  createAdminToken,
  requireAdmin,
} from '../../lib/admin-session.js'
import { GET as enforceRetention } from '../../lib/retention-endpoint.js'

const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000
const LOGIN_RATE_MAX_FAILURES = 5
const FAILURE_DELAY_MS = 300
// Attempts older than this are pruned after each successful login.
const ATTEMPT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

const NO_STORE = { 'cache-control': 'no-store' }

const LoginSchema = z.object({
  key: z.string().min(1).max(512),
})

export async function POST(request: Request): Promise<Response> {
  // Strict origin: the login form only ever runs on this site's /admin page.
  const gate = await checkOriginAndBody(request, { maxBytes: 8 * 1024 })
  if (!gate.ok) return gate.response

  const parsed = LoginSchema.safeParse(gate.payload)
  if (!parsed.success) {
    return json({ error: 'Invalid input.' }, 400, NO_STORE)
  }

  const ipAddress = getClientIp(request)

  // No resolvable IP must not mean no rate limit: fall back to counting
  // ALL null-IP failures with a wider budget (free-signup's untrusted-IP
  // pattern), so header-stripping doesn't disable brute-force protection.
  const failures = await prisma.adminLoginAttempt.count({
    where: {
      ipAddress: ipAddress ?? null,
      success: false,
      createdAt: { gte: new Date(Date.now() - LOGIN_RATE_WINDOW_MS) },
    },
  })
  const maxFailures = ipAddress ? LOGIN_RATE_MAX_FAILURES : LOGIN_RATE_MAX_FAILURES * 3
  if (failures >= maxFailures) {
    return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429, NO_STORE)
  }

  const success = checkAdminKey(parsed.data.key)

  await prisma.adminLoginAttempt
    .create({ data: { ipAddress, success } })
    .catch(() => undefined)

  if (!success) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS))
    return json({ error: 'Invalid key.' }, 401, NO_STORE)
  }

  // Successful login doubles as the pruning hook so the attempts table
  // never grows unboundedly; fire-and-forget.
  prisma.adminLoginAttempt
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - ATTEMPT_RETENTION_MS) } } })
    .catch(() => undefined)

  return json({ ok: true }, 200, {
    ...NO_STORE,
    'set-cookie': adminCookie(createAdminToken()),
  })
}

export async function GET(request: Request): Promise<Response> {
  // Vercel Hobby permits 12 functions per deployment. The public cron URL is
  // internally rewritten here so retention shares this existing function
  // without changing its authenticated external endpoint.
  if (new URL(request.url).searchParams.get('job') === 'retention') {
    return enforceRetention(request)
  }

  return requireAdmin(request)
    ? json({ ok: true }, 200, NO_STORE)
    : json({ ok: false }, 401, NO_STORE)
}

export async function DELETE(request: Request): Promise<Response> {
  // Origin-gated so a hostile cross-site page cannot force-log-out the
  // admin (nuisance only, but free to prevent).
  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return json({ error: 'Forbidden' }, 403, NO_STORE)
  }
  return json({ ok: true }, 200, {
    ...NO_STORE,
    'set-cookie': clearAdminCookie(),
  })
}
