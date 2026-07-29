/**
 * Admin session for the /admin dashboard.
 *
 * Login: the operator presents ADMIN_DASHBOARD_KEY once; on success the
 * server issues a stateless HMAC-signed token (same mechanics as
 * newsletter-token.ts, separate secret) delivered as an httpOnly cookie
 * scoped to /api/admin — the browser never exposes it to page JS and
 * only ever sends it to admin endpoints.
 *
 * Token format (base64url): `${payloadB64}.${sigB64}`
 *   payload = JSON({ a: 'admin', x: expiryMs, n: nonce })
 *
 * Revocation = rotate ADMIN_SESSION_SECRET (single operator, 12h TTL).
 * Server-only — reads ADMIN_SESSION_SECRET / ADMIN_DASHBOARD_KEY from
 * process.env.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h
const COOKIE_NAME = 'bs_admin'

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be set and >= 32 chars')
  }
  return s
}

function b64urlEncode(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')
  return b
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function sign(payload: string): string {
  return b64urlEncode(createHmac('sha256', sessionSecret()).update(payload).digest())
}

export function createAdminToken(): string {
  const payload = JSON.stringify({
    a: 'admin',
    x: Date.now() + ADMIN_SESSION_TTL_MS,
    n: randomBytes(8).toString('hex'),
  })
  const payloadB64 = b64urlEncode(payload)
  return `${payloadB64}.${sign(payloadB64)}`
}

export function verifyAdminToken(token: string): boolean {
  if (!token || typeof token !== 'string' || token.length > 512) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, sigB64] = parts
  let expected: string
  try {
    expected = sign(payloadB64!)
  } catch {
    return false
  }
  const a = Buffer.from(sigB64!)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  if (!timingSafeEqual(a, b)) return false
  try {
    const parsed = JSON.parse(b64urlDecode(payloadB64!).toString('utf8')) as {
      a?: string
      x?: number
    }
    if (parsed.a !== 'admin') return false
    if (typeof parsed.x !== 'number' || Date.now() > parsed.x) return false
    return true
  } catch {
    return false
  }
}

// `Secure` cookies are accepted on http://localhost by Chrome/Firefox but
// not by every browser; drop the flag in local dev only.
function secureAttr(): string {
  return process.env.NODE_ENV === 'development' ? '' : ' Secure;'
}

/** Set-Cookie value carrying the session token. */
export function adminCookie(token: string): string {
  const maxAge = Math.floor(ADMIN_SESSION_TTL_MS / 1000)
  return `${COOKIE_NAME}=${token}; Path=/api/admin; HttpOnly;${secureAttr()} SameSite=Strict; Max-Age=${maxAge}`
}

/** Set-Cookie value that clears the session. */
export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; Path=/api/admin; HttpOnly;${secureAttr()} SameSite=Strict; Max-Age=0`
}

/**
 * True when the request carries a valid, unexpired admin session cookie.
 * Browsers may send several `bs_admin` cookies (e.g. a stale one at
 * Path=/ shadowing the real one) — any verifying instance wins.
 */
export function requireAdmin(request: Request): boolean {
  const header = request.headers.get('cookie')
  if (!header) return false
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== COOKIE_NAME) continue
    if (verifyAdminToken(part.slice(eq + 1).trim())) return true
  }
  return false
}

/**
 * Timing-safe comparison of a login attempt against ADMIN_DASHBOARD_KEY.
 * Both sides are hashed first so length differences can't short-circuit
 * `timingSafeEqual` (which requires equal-length buffers).
 */
export function checkAdminKey(candidate: string): boolean {
  const expected = process.env.ADMIN_DASHBOARD_KEY
  if (!expected || expected.length < 16) return false
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 512) return false
  const a = createHash('sha256').update(candidate).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}
