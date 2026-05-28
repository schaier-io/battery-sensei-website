/**
 * HMAC-signed tokens for double opt-in confirm + one-click unsubscribe.
 *
 * Format (base64url): `${payloadB64}.${sigB64}`
 *   payload = JSON({ e: email, a: action, l: locale, s: epoch,
 *                    x: expiryMsOrNull, n: nonce })
 *
 * `l` carries the displayed website language at signup (template lookup).
 * `s` carries the row's `tokenEpoch` at issue-time. Verifying code must
 *   reject the token if the row's current epoch no longer matches —
 *   that's how unsubscribe links get one-shot semantics and how
 *   confirm-after-resubscribe invalidates the prior pending link.
 *
 * Server-only — reads NEWSLETTER_TOKEN_SECRET from process.env.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type TokenAction = 'confirm' | 'unsubscribe'

const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000 // 48h
// Unsubscribe links don't strictly need to expire (RFC 8058 expects
// them to keep working), but a hard ceiling caps the blast radius of an
// inbox leak when paired with the per-row tokenEpoch check.
const UNSUBSCRIBE_TTL_MS = 365 * 24 * 60 * 60 * 1000 // 1y

function secret(): string {
  const s = process.env.NEWSLETTER_TOKEN_SECRET
  if (!s || s.length < 32) {
    throw new Error(
      'NEWSLETTER_TOKEN_SECRET must be set and >= 32 chars',
    )
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
  return Buffer.from(
    s.replace(/-/g, '+').replace(/_/g, '/') + pad,
    'base64',
  )
}

function sign(payload: string): string {
  return b64urlEncode(
    createHmac('sha256', secret()).update(payload).digest(),
  )
}

export function createToken(
  email: string,
  action: TokenAction,
  locale: string = 'en',
  epoch: number = 0,
): string {
  const ttl = action === 'confirm' ? CONFIRM_TTL_MS : UNSUBSCRIBE_TTL_MS
  const payload = JSON.stringify({
    e: email.toLowerCase().trim(),
    a: action,
    l: locale,
    s: epoch | 0,
    x: Date.now() + ttl,
    n: randomBytes(8).toString('hex'),
  })
  const payloadB64 = b64urlEncode(payload)
  return `${payloadB64}.${sign(payloadB64)}`
}

export type VerifiedToken = {
  email: string
  action: TokenAction
  locale: string
  epoch: number
}

/**
 * Recover the email + locale from a signed-but-expired token without
 * accepting it for any action. Returns null on bad signature; otherwise
 * the payload fields. Use only to pre-fill UI (e.g. the resend form on
 * the "this link expired" page) — it intentionally ignores the `x`
 * expiry so we can still hint at the right address after 48h.
 *
 * Safety: the caller already had the URL containing the same payload
 * as raw bytes, so we leak nothing new by decoding it server-side. The
 * signature gate is timing-safe and protects against a forged-token
 * decode oracle — without the HMAC secret an attacker can't peek at
 * arbitrary emails. The TokenSchema regex in the API routes adds a
 * cheap front-line shape filter so we never burn HMAC work on garbage.
 */
export function peekToken(
  token: string,
): { email: string; locale: string } | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts
  const expected = sign(payloadB64)
  const a = Buffer.from(sigB64)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as {
      e?: string
      l?: string
    }
    if (!parsed.e || typeof parsed.e !== 'string') return null
    return {
      email: parsed.e,
      locale: typeof parsed.l === 'string' && parsed.l ? parsed.l : 'en',
    }
  } catch {
    return null
  }
}

export function verifyToken(token: string): VerifiedToken | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts
  const expected = sign(payloadB64)
  const a = Buffer.from(sigB64)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null
  let parsed: {
    e: string
    a: TokenAction
    l?: string
    s?: number
    x: number | null
  }
  try {
    parsed = JSON.parse(b64urlDecode(payloadB64).toString('utf8'))
  } catch {
    return null
  }
  if (parsed.x !== null && Date.now() > parsed.x) return null
  if (parsed.a !== 'confirm' && parsed.a !== 'unsubscribe') return null
  if (!parsed.e || typeof parsed.e !== 'string') return null
  return {
    email: parsed.e,
    action: parsed.a,
    locale: typeof parsed.l === 'string' && parsed.l ? parsed.l : 'en',
    epoch: typeof parsed.s === 'number' ? parsed.s | 0 : 0,
  }
}
