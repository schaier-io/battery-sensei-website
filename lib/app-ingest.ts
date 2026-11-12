/**
 * Shared gate for the macOS app's opt-in ingest endpoints:
 * `/api/telemetry` (anonymous daily usage counts) and `/api/crash-reports`.
 *
 * Both are rewritten onto `api/feature-requests/index.ts` (`?ingest=...`)
 * because the Vercel Hobby plan allows 12 functions and all 12 are taken.
 *
 * Privacy invariants:
 *   - Nothing here persists an IP address, user agent, origin, or install id.
 *   - The per-client abuse brake keys on an HMAC of the IP with a random
 *     per-instance salt that never leaves memory, so the key cannot be
 *     reversed or linked across cold starts.
 */
import { createHmac, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { checkOriginAndBody, getClientIp, json, type BodyGate } from './feature-board.js'

export const DAY_MS = 24 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000

/** Plain `major.minor.patch`, no leading zeros, bounded so keys stay small. */
export const APP_VERSION_RE = /^(0|[1-9]\d?)\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/

/** Mirrors the app's LicenseEntitlement: licensed, trial, trialExpired. */
export const AppTierSchema = z.enum(['paid', 'trial', 'expired'])

export const NO_STORE = { 'cache-control': 'no-store' } as const

/** Ships dark: the endpoints answer 404 until production sets this to 1. */
export function ingestEnabled(): boolean {
  return process.env.APP_INGEST_ENABLED === '1'
}

/**
 * Kill switch, then: no Origin header (the app's URLSession sends none and
 * every browser POST does), JSON content type, byte-size cap, object body.
 */
export async function gateAppRequest(request: Request, maxBytes: number): Promise<BodyGate> {
  if (!ingestEnabled()) {
    return { ok: false, response: json({ error: 'not_found' }, 404, NO_STORE) }
  }
  if (request.headers.get('origin') !== null) {
    return { ok: false, response: json({ error: 'Forbidden' }, 403, NO_STORE) }
  }
  return checkOriginAndBody(request, { allowNoOrigin: true, maxBytes })
}

const CLIENT_KEY_SALT = randomBytes(32)
/** Hard ceiling on tracked clients per instance; oldest is evicted first. */
const MAX_TRACKED_CLIENTS = 10_000

/**
 * Per-instance soft brake, separate from the board's failure brakes in
 * lib/feature-board.ts so ingest traffic can never evict those, and one map
 * per scope so a telemetry flood cannot evict crash-report entries. Counts
 * every call it sees. Without a client IP there is nothing to key on: not
 * braked.
 */
const hitsByScope = new Map<string, Map<string, { count: number; resetAt: number }>>()

export function isClientThrottled(
  request: Request,
  scope: string,
  max: number,
  windowMs: number,
): boolean {
  const ip = getClientIp(request)
  if (!ip) return false
  const key = createHmac('sha256', CLIENT_KEY_SALT).update(clientNetwork(ip)).digest('hex')
  let clientHits = hitsByScope.get(scope)
  if (!clientHits) {
    clientHits = new Map()
    hitsByScope.set(scope, clientHits)
  }
  const now = Date.now()
  const bucket = clientHits.get(key)
  if (bucket && now <= bucket.resetAt) {
    if (bucket.count >= max) return true
    bucket.count += 1
    return false
  }
  // New or expired: re-insert at the end so Map order stays oldest-first.
  clientHits.delete(key)
  if (clientHits.size >= MAX_TRACKED_CLIENTS) {
    const oldest = clientHits.keys().next()
    if (!oldest.done) clientHits.delete(oldest.value)
  }
  clientHits.set(key, { count: 1, resetAt: now + windowMs })
  return false
}

/** Hextets in an IPv6 address, and in the /64 a single host can rotate within. */
const IPV6_HEXTETS = 8
const IPV6_HOST_PREFIX_HEXTETS = 4

/**
 * What one client controls. IPv4 (also IPv4-mapped IPv6): the address. IPv6:
 * the /64 prefix, since one host can rotate freely through its /64.
 */
export function clientNetwork(ip: string): string {
  if (!ip.includes(':')) return ip
  if (ip.includes('.')) return ip.slice(ip.lastIndexOf(':') + 1)
  const [head = '', tail = ''] = ip.toLowerCase().split('::')
  const headParts = head ? head.split(':') : []
  const tailParts = tail ? tail.split(':') : []
  const zeros = new Array(Math.max(0, IPV6_HEXTETS - headParts.length - tailParts.length)).fill('0')
  const hextets = [...headParts, ...zeros, ...tailParts]
  return `${hextets.slice(0, IPV6_HOST_PREFIX_HEXTETS).map((h) => h.replace(/^0+(?=.)/, '')).join(':')}::/64`
}

/** False for a string with a lone UTF-16 surrogate, which UTF-8 cannot hold. */
export function isWellFormedText(text: string): boolean {
  return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text)
}

/** UTC midnight of `now`, the bucket for daily counters. */
export function utcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}
