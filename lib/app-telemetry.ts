/**
 * POST /api/telemetry: the macOS app's opt-in anonymous daily usage count.
 *
 * Request: `{"appVersion":"1.22.0","tier":"paid","osMajor":26}`, nothing
 * else (unknown keys are rejected). The server adds one to the counter for
 * (UTC day, appVersion, tier, osMajor) and stores nothing about the sender.
 * Releases older than the newest 30 are counted as appVersion "older".
 *
 * Rows per day are bounded by construction, not by a cap: every key field
 * comes from a closed set (31 version buckets x 3 tiers x 8 macOS majors =
 * 744), so a flood can only add to counts, never create rows past that.
 *
 * Every well-formed request gets 204, whether it was counted or dropped (by
 * the per-client brake, a database failure, or because the version was never
 * released), so the app has no
 * signal to retry on.
 */
import { z } from 'zod'
import { prisma } from './db.js'
import { json } from './feature-board.js'
import {
  APP_VERSION_RE,
  AppTierSchema,
  HOUR_MS,
  NO_STORE,
  gateAppRequest,
  isClientThrottled,
  utcDay,
} from './app-ingest.js'
import { releaseBucket } from './released-versions.js'

const TELEMETRY_MAX_BYTES = 1024
/**
 * macOS majors that exist: 13 (the oldest the app ever supported) to 15,
 * then 26 onward (Apple skipped 16-25). Raise OS_MAJOR_MAX before a macOS
 * past it ships, or pings from it are rejected.
 */
const OS_MAJORS_BEFORE_SKIP = [13, 14, 15]
const OS_MAJOR_AFTER_SKIP_MIN = 26
const OS_MAJOR_MAX = 30
const isRealOsMajor = (major: number): boolean =>
  OS_MAJORS_BEFORE_SKIP.includes(major) || (major >= OS_MAJOR_AFTER_SKIP_MIN && major <= OS_MAJOR_MAX)
/**
 * One app sends one ping a day; this only brakes a scripted flood. Hourly
 * and generous, because many Macs can share one IP (office NAT, carrier
 * NAT), and an hourly window lets idle entries expire from memory.
 */
const PER_CLIENT_HOURLY_MAX = 30
/** Prisma's unique-constraint violation. */
const UNIQUE_VIOLATION = 'P2002'

const HeartbeatSchema = z.strictObject({
  appVersion: z.string().regex(APP_VERSION_RE),
  tier: AppTierSchema,
  osMajor: z.number().int().refine(isRealOsMajor),
})

const accepted = (): Response => new Response(null, { status: 204, headers: NO_STORE })

export async function POST(request: Request): Promise<Response> {
  const gate = await gateAppRequest(request, TELEMETRY_MAX_BYTES)
  if (!gate.ok) return gate.response

  const parsed = HeartbeatSchema.safeParse(gate.payload)
  if (!parsed.success) return json({ error: 'invalid' }, 400, NO_STORE)

  if (isClientThrottled(request, 'telemetry', PER_CLIENT_HOURLY_MAX, HOUR_MS)) return accepted()
  const appVersion = await releaseBucket(parsed.data.appVersion)
  if (appVersion === null) return accepted()

  const key = { day: utcDay(new Date()), ...parsed.data, appVersion }
  try {
    await count(key)
  } catch (error) {
    // A lost ping costs one count; a 500 would invite the app to retry.
    const { code, name } = error as { code?: unknown; name?: unknown }
    console.error('[telemetry] count failed', { code, name })
  }
  return accepted()
}

async function count(key: { day: Date; appVersion: string; tier: 'paid' | 'trial' | 'expired'; osMajor: number }) {
  const increment = () =>
    prisma.telemetryDailyCount.updateMany({ where: key, data: { count: { increment: 1 } } })
  if ((await increment()).count > 0) return

  // A concurrent first ping for the same key may insert the row between the
  // increment above and this create. Then the row exists: increment it.
  try {
    await prisma.telemetryDailyCount.create({ data: { ...key, count: 1 } })
  } catch (error) {
    if ((error as { code?: unknown }).code !== UNIQUE_VIOLATION) throw error
    await increment()
  }
}
