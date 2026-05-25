/**
 * POST /api/free-signup — capture an email from the homepage's Free
 * download card so we can email when a new version ships.
 *
 * Marketing-psychology framing
 * ----------------------------
 *  - The visitor opts in (skip link below the form preserves autonomy).
 *  - Single tiny ask: an email, nothing else.
 *  - Reciprocity: they hand us an address, we hand them a download +
 *    one quiet update per release.
 *
 * Storage
 * -------
 * For the first pass this endpoint just logs the email. Wire it into
 * the real list provider (Polar's audience, Buttondown, Loops, etc.)
 * by replacing `forwardToList`. The endpoint stays the same shape on
 * the client side.
 */

type SignupBody = {
  email?: string
  locale?: string
  source?: string
}

type Ok = { ok: true }
type Err = { ok: false; reason: 'invalid' | 'parse' | 'forward-failed' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function forwardToList(_email: string, _locale: string): Promise<boolean> {
  // TODO: POST to the real list provider. Returning `true` here means
  // "captured" — the client should always proceed to the download
  // regardless, so a failure here doesn't block the user.
  return true
}

function json(payload: Ok | Err, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      // Don't cache POST responses; ensure proxies treat them per-request.
      'cache-control': 'no-store',
    },
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  let body: SignupBody
  try {
    body = (await request.json()) as SignupBody
  } catch {
    return json({ ok: false, reason: 'parse' }, 400)
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return json({ ok: false, reason: 'invalid' }, 400)
  }

  const locale = (body.locale || 'en').slice(0, 8)

  // Lightweight server-side log so we can sanity-check signups before the
  // list provider is wired up. Stays out of analytics — log only the
  // hash-shaped identifier (first letter + length) to keep PII out of
  // server logs while still proving traffic.
  console.log(
    '[free-signup]',
    JSON.stringify({
      first: email.charAt(0),
      length: email.length,
      locale,
      source: (body.source || 'pricing').slice(0, 32),
      at: new Date().toISOString(),
    }),
  )

  try {
    const ok = await forwardToList(email, locale)
    if (!ok) return json({ ok: false, reason: 'forward-failed' }, 502)
    return json({ ok: true })
  } catch {
    return json({ ok: false, reason: 'forward-failed' }, 502)
  }
}
