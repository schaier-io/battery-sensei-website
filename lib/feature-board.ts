/**
 * Shared server-only helpers for the feature-request board endpoints
 * (`api/feature-requests/*`). Mirrors the gate/validation toolkit that
 * `api/contact.ts` keeps inline, plus the board-specific pieces: the
 * license-key → voter-hash scheme and the Polar validation cache.
 *
 * Security invariants enforced here:
 *   - The raw license key is never stored, logged, or placed in a URL.
 *     Only HMAC-SHA256(key, FEATURE_VOTE_HASH_SECRET) is persisted.
 *   - Board free-text accepts any script (the site ships 5 locales) but
 *     stays free of HTML/JS/header-injection characters; rendering
 *     escapes everything again regardless.
 */
import { createHmac } from 'node:crypto'
import { prisma } from './db.js'

// ---------------------------------------------------------------------------
// Text validation

/**
 * Unicode-extended whitelist for board free-text. Unlike contact.ts's
 * ASCII `SAFE_TEXT_RE`, this admits letters/marks/digits in any script
 * plus curated punctuation — the board is localized into de/es/fr/ja
 * and must accept those languages, and everyday English needs the
 * apostrophe ("don't"), `%` ("battery %"), `&` and `°` ("80°C").
 * ASCII angle brackets, double quotes, slashes, colons, semicolons and
 * backticks remain excluded, so payloads still cannot carry HTML tags,
 * JS, or URLs; `& ' %` are escaped again at every render site.
 */
export const BOARD_SAFE_TEXT_RE =
  /^[\p{L}\p{M}\p{N} \t\n\r　=+\-?.,!()'%&°。、・「」『』！？（）～…–—¿¡«»‘’“”„]+$/u
export const BOARD_SAFE_TEXT_MESSAGE =
  "Only letters, numbers, spaces and the characters = + - ? . , ! ( ) ' % & ° are allowed."

/**
 * Title-position fields additionally reject line breaks and tabs — they
 * are interpolated into email Subject lines and rendered single-line.
 */
export const NO_LINE_BREAK_RE = /^[^\n\r\t]*$/
export const NO_LINE_BREAK_MESSAGE = 'The title must be a single line.'

/** At least one letter or digit (any script) — blocks pure punctuation. */
export const HAS_TEXT_RE = /[\p{L}\p{N}]/u

// Polar license keys are uuid-with-dashes style; allow a padded charset.
export const LICENSE_KEY_RE = /^[A-Za-z0-9\-_]{8,256}$/

export const REQUEST_ID_RE = /^[a-z0-9]{20,32}$/

// ---------------------------------------------------------------------------
// Status groups

export const PUBLIC_STATUSES = ['open', 'planned', 'in_progress', 'shipped'] as const
export const VOTABLE_STATUSES = ['open', 'planned', 'in_progress'] as const
export type PublicStatus = (typeof PUBLIC_STATUSES)[number]

// ---------------------------------------------------------------------------
// Request plumbing (same shapes as contact.ts)

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

const ALLOWED_ORIGINS = new Set([
  'https://battery-sensei.app',
  'https://www.battery-sensei.app',
])
const ALLOWED_ORIGIN_SUFFIXES = ['.vercel.app']

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
  if (ALLOWED_ORIGINS.has(`${url.protocol}//${url.host}`)) return true
  // Preview deployments only — and only over https.
  if (url.protocol !== 'https:') return false
  return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
}

export function getClientIp(request: Request): string | null {
  // Prefer x-real-ip: Vercel overwrites it at the edge, so it cannot be
  // spoofed by the client. The leftmost x-forwarded-for entry is
  // client-controlled behind other proxies — fallback only.
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return null
}

/** Same Crockford-style short id scheme as contact.ts. */
export function generateTicketId(): string {
  const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no 0,o,1,i,l
  const bytes = new Uint8Array(7)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return `#${out}`
}

export function isStructurallyValidEmail(s: string): boolean {
  if (s.includes('..')) return false
  const at = s.indexOf('@')
  const local = s.slice(0, at)
  const domain = s.slice(at + 1)
  if (local.length === 0 || local.length > 64) return false
  if (local.startsWith('.') || local.endsWith('.')) return false
  if (domain.startsWith('.') || domain.endsWith('.')) return false
  if (domain.startsWith('-') || domain.endsWith('-')) return false
  if (!domain.includes('.')) return false
  return true
}

export type BodyGate =
  | { ok: true; payload: Record<string, unknown>; origin: string | null }
  | { ok: false; response: Response }

/**
 * Combined request gate for state-changing endpoints: origin allowlist,
 * JSON content type (forces a CORS preflight cross-origin), size cap,
 * and JSON-object parse.
 *
 * `allowNoOrigin` admits requests without an Origin header — the macOS
 * app's URLSession never sends one. Callers that pass `true` must treat
 * such requests with extra suspicion (everything still lands behind
 * moderation + rate limits).
 */
export async function checkOriginAndBody(
  request: Request,
  { allowNoOrigin = false, maxBytes = 32 * 1024 }: { allowNoOrigin?: boolean; maxBytes?: number } = {},
): Promise<BodyGate> {
  const origin = request.headers.get('origin')
  if (origin !== null || !allowNoOrigin) {
    if (!isAllowedOrigin(origin)) {
      return { ok: false, response: json({ error: 'Forbidden' }, 403) }
    }
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return { ok: false, response: json({ error: 'Unsupported content type' }, 415) }
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > maxBytes) {
    return { ok: false, response: json({ error: 'Payload too large' }, 413) }
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return { ok: false, response: json({ error: 'Invalid request body' }, 400) }
  }
  if (raw.length > maxBytes) {
    return { ok: false, response: json({ error: 'Payload too large' }, 413) }
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return { ok: false, response: json({ error: 'Invalid JSON' }, 400) }
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, response: json({ error: 'Invalid payload' }, 400) }
  }

  return { ok: true, payload: payload as Record<string, unknown>, origin }
}

// ---------------------------------------------------------------------------
// Voter identity

function voteHashSecret(): string {
  const s = process.env.FEATURE_VOTE_HASH_SECRET
  if (!s || s.length < 32) {
    throw new Error('FEATURE_VOTE_HASH_SECRET must be set and >= 32 chars')
  }
  return s
}

/**
 * Anonymous, stable voter identity for a license key. Keyed HMAC (not a
 * bare hash) so voter identities cannot be recomputed from leaked keys
 * without the server secret. Rotating the secret orphans all existing
 * vote identities — votes stay counted, "voted" state is lost.
 */
export function voterHash(licenseKey: string): string {
  return createHmac('sha256', voteHashSecret()).update(licenseKey.trim()).digest('hex')
}

// ---------------------------------------------------------------------------
// Polar license validation (+ 24h cache)

const POLAR_VALIDATE_TIMEOUT_MS = 15_000
/** Read-only checks tolerate a day-old validation. */
export const LICENSE_CACHE_READ_MS = 24 * 60 * 60 * 1000
/**
 * Vote/unvote mutations demand a fresher one, bounding how long a
 * revoked or refunded key can keep casting votes.
 */
export const LICENSE_CACHE_MUTATION_MS = 60 * 60 * 1000
/** Cache entries idle this long are pruned opportunistically. */
const LICENSE_VOTER_STALE_MS = 60 * 24 * 60 * 60 * 1000

export type LicenseValidity = 'valid' | 'invalid' | 'error'

/**
 * Validate a license key against Polar's customer-portal endpoint — the
 * same one the macOS app uses (no access token required; scoped by
 * organization id). Semantics mirrored from the app's LicenseGateway:
 * 2xx with status not disabled/revoked → valid; 429/408 and network/5xx
 * → 'error' (callers return 502, never "invalid"); other 4xx → invalid.
 *
 * Successful validations are cached in LicenseVoter (keyed by the voter
 * hash, never the key) so repeat calls skip the Polar round-trip;
 * `maxCacheAgeMs` sets how stale a cached "valid" the caller accepts.
 */
export async function validateLicenseKey(
  licenseKey: string,
  maxCacheAgeMs: number = LICENSE_CACHE_READ_MS,
): Promise<LicenseValidity> {
  const hash = voterHash(licenseKey)
  const cacheCutoff = new Date(Date.now() - maxCacheAgeMs)
  const cached = await prisma.licenseVoter
    .findUnique({ where: { voterHash: hash } })
    .catch(() => null)
  if (cached && cached.lastValidatedAt > cacheCutoff) {
    return 'valid'
  }

  const organizationIds = [
    process.env.POLAR_ORGANIZATION_ID_NEW,
    process.env.POLAR_ORGANIZATION_ID,
  ].filter((id, index, all): id is string =>
    Boolean(id) && all.indexOf(id) === index,
  )
  if (organizationIds.length === 0) {
    return 'error'
  }
  const base = process.env.POLAR_API_BASE || 'https://api.polar.sh'

  let valid = false
  for (let index = 0; index < organizationIds.length; index += 1) {
    let response: Response
    try {
      response = await fetch(`${base}/v1/customer-portal/license-keys/validate`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          key: licenseKey.trim(),
          organization_id: organizationIds[index],
        }),
        signal: AbortSignal.timeout(POLAR_VALIDATE_TIMEOUT_MS),
      })
    } catch {
      return 'error'
    }

    if (response.status >= 500) return 'error'
    // Polar-side throttling/timeouts are transient — never fall back or mark
    // the key invalid, because the primary organization was not authoritative.
    if (response.status === 429 || response.status === 408) return 'error'
    if (!response.ok) {
      const canTryLegacy =
        index < organizationIds.length - 1
        && (response.status === 403 || response.status === 404)
      if (canTryLegacy) continue
      return 'invalid'
    }

    const body = (await response.json().catch(() => null)) as { status?: unknown } | null
    const status = typeof body?.status === 'string' ? body.status.toLowerCase() : null
    if (status === 'disabled' || status === 'revoked') return 'invalid'
    valid = true
    break
  }

  if (!valid) return 'invalid'

  await prisma.licenseVoter
    .upsert({
      where: { voterHash: hash },
      create: { voterHash: hash, lastValidatedAt: new Date() },
      update: { lastValidatedAt: new Date() },
    })
    .catch(() => undefined)

  // Opportunistic pruning keeps the cache table from growing forever;
  // fire-and-forget so it never delays the caller's response.
  prisma.licenseVoter
    .deleteMany({ where: { lastValidatedAt: { lt: new Date(Date.now() - LICENSE_VOTER_STALE_MS) } } })
    .catch(() => undefined)

  return 'valid'
}

// ---------------------------------------------------------------------------
// Best-effort in-memory throttle
//
// Per-isolate only (resets on cold start, not shared across regions) —
// documented as a soft brake for cheap-to-spam failure paths like
// invalid-key probing. The durable limits are the DB count aggregates.

const memoryBuckets = new Map<string, { count: number; resetAt: number }>()
const MEMORY_BUCKET_PRUNE_THRESHOLD = 1000

function pruneExpiredBuckets(now: number): void {
  if (memoryBuckets.size < MEMORY_BUCKET_PRUNE_THRESHOLD) return
  for (const [key, bucket] of memoryBuckets) {
    if (now > bucket.resetAt) memoryBuckets.delete(key)
  }
}

/**
 * Peek: is this key currently over its failure budget? Does NOT count
 * the call — pair with `recordMemoryThrottleHit` on the failure path
 * only, so legitimate traffic is never throttled by its own volume.
 */
export function isMemoryThrottled(key: string, max: number): boolean {
  const bucket = memoryBuckets.get(key)
  if (!bucket || Date.now() > bucket.resetAt) return false
  return bucket.count >= max
}

export function recordMemoryThrottleHit(key: string, windowMs: number): void {
  const now = Date.now()
  pruneExpiredBuckets(now)
  const bucket = memoryBuckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  bucket.count += 1
}
