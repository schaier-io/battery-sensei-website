/**
 * Double opt-in confirmation.
 *
 *   GET  /api/newsletter/confirm?token=...   → 302 /newsletter/confirm?token=...   (NO action)
 *   POST /api/newsletter/confirm?token=...   → 200 { ok: true, redirectTo, ... }
 *
 * GET deliberately does no work. Inbox-side link-preview crawlers
 * (Outlook safelinks, Gmail proxy, antivirus scanners, Slack/Telegram
 * unfurlers, headless browser previews, prerender bots) all follow the
 * URL on receipt — auto-confirming an email just because it landed in
 * an inbox-protection sandbox would defeat the purpose of double opt-in.
 *
 * The visitor lands on /newsletter/confirm, which auto-POSTs here from a
 * real, foreground browser (JS + not-headless + visible gates), and only
 * then do we mark the row confirmed and flip the Resend contact to
 * subscribed. Prerender / preview bots and link prefetchers fetch the URL
 * but don't run that JS, so they never execute the POST. No email is sent
 * on confirm: the /newsletter/confirmed page offers the download directly.
 *
 * Idempotent: every valid click reconciles the Resend subscription first,
 * including clicks for an already-confirmed local row. A new local
 * `confirmedAt` is written only after that provider step succeeds.
 *
 * Vercel Function note
 * --------------------
 * Lives at root `api/newsletter/confirm.ts` so Vercel deploys it. All
 * relative imports carry `.js` because the runtime is Node ESM and
 * extensionless paths 404 in /var/task.
 */
import { z } from 'zod'
import { db } from '../../lib/db.js'
import {
  peekToken,
  verifyToken,
} from '../../lib/newsletter-token.js'
import {
  getResendClient,
  isAllowedOrigin,
  normalizeLocale,
  signupSegments,
  siteUrl,
} from '../../lib/resend.js'

// This endpoint sends no email. It records the confirmation in Postgres and
// flips the Resend contact to subscribed; the /newsletter/confirmed page
// offers the download directly. (The confirm email is sent from
// api/free-signup.ts; the welcome email has been removed.)


// Token shape: `<base64url>.<base64url>`. Length cap defends against
// accidental DOS / memory blow-up from a multi-megabyte query string
// being shoved into the verifier. The signature verifier still does
// the real check; this is the cheap front line.
const TokenSchema = z
  .string()
  .min(20)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'malformed-token')

function json(payload: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

function redirect(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${siteUrl()}${path}`,
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Whitelist of redirect targets we let the confirm POST return to. Keeps
 * the JSON `redirectTo` field from ever leaking outside the site even
 * if the helpers below regress in a future edit. The client also guards
 * with a `startsWith('/')` check — this is the matching belt.
 */
const ALLOWED_REDIRECTS = ['/newsletter/confirmed'] as const

function safeRedirectPath(path: string): string {
  // Strip query/hash before matching the path prefix; the query is
  // server-built and already safe, but the comparison should ignore it
  // so a `?status=invalid&email=foo@bar` suffix doesn't trip the gate.
  const trimmed = path.split('?')[0].split('#')[0]
  return ALLOWED_REDIRECTS.some((p) => trimmed === p)
    ? path
    : '/newsletter/confirmed?status=invalid'
}

type ProviderError = {
  name: string
  message: string
  statusCode: number | null
}

function isNotFound(error: ProviderError | null): boolean {
  return error?.name === 'not_found' || error?.statusCode === 404
}

function logProviderFailure(
  operation: 'update' | 'create',
  error?: ProviderError | null,
): void {
  // Provider code/status is enough for operations. Never put the subscriber
  // email or the provider's free-form message into Vercel logs.
  console.error('[newsletter] confirm provider failure', {
    operation,
    code: error?.name ?? 'transport_error',
    status: error?.statusCode ?? null,
  })
}

/** Ensure the account-level Resend contact is subscribed. */
async function reconcileResendSubscription(
  email: string,
  locale: string,
): Promise<{ contactId: string | null } | null> {
  const resend = getResendClient()

  try {
    const updated = await resend.contacts.update({ email, unsubscribed: false })
    if (!updated.error) {
      return { contactId: updated.data?.id ?? null }
    }
    if (!isNotFound(updated.error)) {
      logProviderFailure('update', updated.error)
      return null
    }
  } catch {
    logProviderFailure('update')
    return null
  }

  // The signup-time contact creation may have failed. Recreate only when the
  // update explicitly reports absence; transient update failures stay retryable.
  try {
    const created = await resend.contacts.create({
      email,
      unsubscribed: false,
      firstName: `src:confirm-recovery|lang:${locale}`,
      segments: signupSegments(),
    })
    if (created.error) {
      logProviderFailure('create', created.error)
      return null
    }
    return { contactId: created.data?.id ?? null }
  } catch {
    logProviderFailure('create')
    return null
  }
}

/**
 * Pre-fill helper for the "this link has expired" page. When the
 * signature still verifies but the token has expired (or the epoch has
 * rolled), pull the email out of the payload so the resend form can
 * pre-fill it. The caller already has the URL containing the same
 * payload, so we leak nothing new by decoding it here.
 */
function invalidConfirmedRedirect(token: string): string {
  const peeked = peekToken(token)
  if (!peeked) return '/newsletter/confirmed?status=invalid'
  const params = new URLSearchParams({
    status: 'invalid',
    email: peeked.email,
  })
  return `/newsletter/confirmed?${params.toString()}`
}

/**
 * GET handler: redirect to the click-through confirm page. No DB write,
 * no Resend call, no side effects. Inbox prefetchers + AV scanners can
 * hit this endlessly without effect.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const raw = url.searchParams.get('token') ?? ''
  // Validate shape only. We don't verify here because GET must be a
  // no-op even on a perfectly-good token. The confirm page (and the
  // POST that follows the user's click) does the real work.
  const parsed = TokenSchema.safeParse(raw)
  if (!parsed.success) {
    // Bad shape → straight to the invalid-status confirmed page. No
    // peek-and-prefill possible (no signature to verify against).
    return redirect('/newsletter/confirmed?status=invalid')
  }
  // Carry the signup language (encoded in the token) so the confirm page
  // renders in the right locale even on a device with no bs_locale cookie.
  // peekToken signature-verifies but ignores expiry — safe for display.
  const peeked = peekToken(parsed.data)
  const locale = peeked ? normalizeLocale(peeked.locale) : 'en'
  const localeQs = locale && locale !== 'en' ? `&locale=${locale}` : ''
  const qs = `?token=${encodeURIComponent(parsed.data)}${localeQs}`
  return redirect(`/newsletter/confirm${qs}`)
}

/**
 * POST handler: this is where the actual confirmation happens. Reached
 * from the confirm page's button. The endpoint returns JSON with the
 * URL the page should navigate to next — letting the page handle the
 * redirect via `useNavigate` keeps the POST → 200 contract clean for
 * fetch() callers without making them follow 302s with `redirect:
 * 'follow'`.
 */
export async function POST(request: Request): Promise<Response> {
  // CSRF gate. Even though the confirm token itself is secret (sent
  // only to the verified inbox), a same-origin check stops a cross-site
  // page from triggering the POST on the user's behalf if they happen
  // to have copy/pasted the URL into a chat that auto-fetches.
  //
  // `isAllowedOrigin` includes both production brand domains plus Vercel
  // preview/branch URLs (VERCEL_URL, VERCEL_BRANCH_URL) so PR previews
  // can exercise the flow without configuring PUBLIC_SITE_URL per env.
  //
  // The unsubscribe POST deliberately omits this check so Gmail/Yahoo
  // inbox-side one-click probes (RFC 8058) succeed. Confirm has no
  // such RFC contract — it always runs in-browser after the user lands
  // on /newsletter/confirm.
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: 'bad-origin' }, { status: 403 })
  }

  const url = new URL(request.url)
  const raw = url.searchParams.get('token') ?? ''
  const parsedToken = TokenSchema.safeParse(raw)
  if (!parsedToken.success) {
    return json({
      ok: false,
      redirectTo: safeRedirectPath('/newsletter/confirmed?status=invalid'),
    })
  }
  const token = parsedToken.data

  const verified = verifyToken(token)
  if (!verified || verified.action !== 'confirm') {
    return json({
      ok: false,
      redirectTo: safeRedirectPath(invalidConfirmedRedirect(token)),
    })
  }

  const { email } = verified
  const locale = normalizeLocale(verified.locale)

  // Look up the local row first. If there's no row, the token signature
  // is valid but the address never went through /api/free-signup — treat
  // as invalid rather than leak that detail.
  const row = await db.newsletterSignup
    .findUnique({ where: { email } })
    .catch(() => null)

  if (!row) {
    return json({
      ok: false,
      redirectTo: safeRedirectPath(invalidConfirmedRedirect(token)),
    })
  }

  // Epoch check — stale link from a prior subscription cycle.
  if (row.tokenEpoch !== verified.epoch) {
    return json({
      ok: false,
      redirectTo: safeRedirectPath(invalidConfirmedRedirect(token)),
    })
  }

  const provider = await reconcileResendSubscription(email, locale)
  if (!provider) {
    // The confirm page keeps the token and shows its retry button. No local
    // confirmation is written, and already-confirmed rows still retry repair.
    return json(
      { ok: false, error: 'temporarily-unavailable' },
      { status: 503 },
    )
  }

  if (!row.confirmedAt) {
    try {
      await db.newsletterSignup.update({
        where: { email },
        data: {
          confirmedAt: new Date(),
          unsubscribedAt: null,
          locale,
          ...(provider.contactId
            ? { releasesContactId: provider.contactId }
            : {}),
        },
      })
    } catch {
      console.error('[newsletter] local confirmation write failed', {
        code: 'database_error',
      })
      return json(
        { ok: false, error: 'temporarily-unavailable' },
        { status: 503 },
      )
    }
  } else if (
    provider.contactId &&
    provider.contactId !== row.releasesContactId
  ) {
    // Already confirmed clicks are repair attempts too. Keep the current
    // provider id for future suppression/deletion, but do not block success if
    // this bookkeeping-only update fails after Resend is already subscribed.
    await db.newsletterSignup
      .update({
        where: { email },
        data: { releasesContactId: provider.contactId },
      })
      .catch(() => undefined)
  }

  // Subscription confirmed. No welcome email is sent: the
  // /newsletter/confirmed page offers the download directly, so a second
  // mail would just be inbox noise.
  return json({
    ok: true,
    redirectTo: safeRedirectPath(`/newsletter/confirmed?locale=${locale}`),
  })
}
