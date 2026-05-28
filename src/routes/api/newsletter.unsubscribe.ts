/**
 * One-click unsubscribe.
 *
 *   GET  /api/newsletter/unsubscribe?token=...   → 302 /newsletter/unsubscribe?token=...
 *   POST /api/newsletter/unsubscribe?token=...   → 200  (RFC 8058 one-click)
 *
 * GET does NOT unsubscribe by itself. Mail clients sometimes pre-fetch
 * link targets for safety scanning, which would silently opt a user
 * out just because they hovered the link. Instead GET routes to a
 * confirm page (/newsletter/unsubscribe) with a button that POSTs.
 *
 * POST remains the one-click path used by:
 *   - Gmail/Yahoo `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 *   - the confirm page's own button (fetch POST)
 *
 * Token carries the row's `tokenEpoch` at issue-time. Unsubscribe is
 * effectively one-shot per epoch: once it runs we bump the epoch, so
 * a leaked List-Unsubscribe URL can't be replayed weeks later to
 * silently disable a user who re-subscribed in between.
 *
 * We always answer 200 / a redirect on POST — never leak membership.
 */
import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/lib/db'
import { verifyToken } from '#/lib/newsletter-token'
import { audiences, getResendClient, siteUrl } from '#/lib/resend'

async function pushUnsubToResend(email: string): Promise<void> {
  const resend = getResendClient()
  for (const a of audiences()) {
    try {
      await resend.contacts.update({
        audienceId: a.id,
        email,
        unsubscribed: true,
      })
    } catch {
      // Not in this audience — ignore.
    }
  }
}

async function unsubscribe(email: string): Promise<void> {
  try {
    await db.newsletterSignup.update({
      where: { email },
      data: {
        unsubscribedAt: new Date(),
        tokenEpoch: { increment: 1 },
      },
    })
  } catch (err) {
    console.error('[newsletter] unsubscribe row update failed', err)
  }
  await pushUnsubToResend(email)
}

function redirectTo(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${siteUrl()}${path}`,
      'Cache-Control': 'no-store',
    },
  })
}

async function handleGet(request: Request): Promise<Response> {
  // Hand the token straight to the confirm page. We intentionally do
  // NOT validate here — that page (and the POST handler) will do it.
  // Doing nothing on GET means mail-client link prefetch can't trigger
  // an unsubscribe. The page renders the same "invalid link" message
  // when the token is bad, so we still leak nothing.
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const qs = token ? `?token=${encodeURIComponent(token)}` : ''
  return redirectTo(`/newsletter/unsubscribe${qs}`)
}

async function handlePost(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const verified = verifyToken(token)

  // Always return 200 on POST — never leak membership state to an
  // inbox-provider one-click probe or a scraper.
  if (!verified || verified.action !== 'unsubscribe') {
    return new Response(null, { status: 200 })
  }

  const row = await db.newsletterSignup
    .findUnique({ where: { email: verified.email } })
    .catch(() => null)

  // Epoch mismatch → token was already used (we bumped on prior unsub)
  // or the user resubscribed. Either way: 200, no action.
  if (!row || row.tokenEpoch !== verified.epoch) {
    return new Response(null, { status: 200 })
  }

  await unsubscribe(verified.email)
  return new Response(null, { status: 200 })
}

export const Route = createFileRoute('/api/newsletter/unsubscribe')({
  server: {
    handlers: {
      GET: ({ request }) => handleGet(request),
      POST: ({ request }) => handlePost(request),
    },
  },
})
