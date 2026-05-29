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
 * The visitor sees the click-through confirm page (/newsletter/confirm),
 * presses the button, the page POSTs here, and only then do we mark the
 * row confirmed and send the welcome mail. Prerender / preview bots
 * never execute that POST.
 *
 * Idempotent: once `confirmedAt` is set on the local row we return a
 * success payload (the page navigates to /newsletter/confirmed without
 * re-sending the welcome). The earlier "update then recover via create"
 * dance against Resend silently misreported transient blips as errors —
 * now Resend is treated as a side-channel and the source of truth lives
 * in Postgres.
 *
 * Vercel Function note
 * --------------------
 * Lives at root `api/newsletter/confirm.ts` so Vercel deploys it. All
 * relative imports carry `.js` because the runtime is Node ESM and
 * extensionless paths 404 in /var/task.
 */
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { welcomeEmailText } from '../../lib/emails/plaintext.js'
import { welcomeSubject } from '../../lib/emails/subjects.js'
import {
  createToken,
  peekToken,
  verifyToken,
} from '../../lib/newsletter-token.js'
import {
  getResendClient,
  isAllowedOrigin,
  normalizeLocale,
  resendFrom,
  resendReplyTo,
  signupSegments,
  siteUrl,
} from '../../lib/resend.js'

// ────────────────────────────────────────────────────────────────────
//  Inlined welcome email — duplicated, NOT imported
// ────────────────────────────────────────────────────────────────────
//
// Vercel's serverless bundler does NOT reliably traverse imports out
// of `api/` into sibling directories (`/lib`) under this project's
// TanStack Start + Vite build. Importing the React Email `.tsx`
// templates from `lib/emails/` fails in prod with
// `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/lib/emails/WelcomeEmail.js'`
// because Vercel's nft trace doesn't compile `.tsx` files into the
// function bundle. See `api/contact.ts` / `api/checkout-session.ts`
// for the same gotcha applied to plain helpers, and
// `api/free-signup.ts` for the parallel confirm-email inline.
//
// The `lib/emails/*.tsx` templates remain for local `pnpm email`
// previews; production renders the inline HTML below. Keep the two
// in visual lockstep — copy lives here, not imported.

const PALETTE = {
  washi: '#f4ede0',
  washiBg: '#e8dec3',
  sumi: '#1c1a17',
  sumiSoft: '#4a4540',
  nezumi: '#8a847c',
  hinomaru: '#bc002d',
  line: 'rgba(28, 26, 23, 0.14)',
} as const

const FONT_STACK =
  `"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
const SERIF_STACK = `"Spectral", Georgia, "Times New Roman", serif`
const JP_STACK = `"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif`

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  )
}

type Locale = 'en' | 'de' | 'es' | 'fr' | 'ja'

const LAYOUT_COPY: Record<
  Locale,
  { why: string; unsub: string; tagline: string }
> = {
  en: {
    why: 'A quiet note from Battery Sensei · battery-sensei.app',
    unsub: 'Unsubscribe',
    tagline: 'Calm energy for your Mac.',
  },
  de: {
    why: 'Eine leise Nachricht von Battery Sensei · battery-sensei.app',
    unsub: 'Abmelden',
    tagline: 'Ruhige Energie für deinen Mac.',
  },
  es: {
    why: 'Una nota tranquila de Battery Sensei · battery-sensei.app',
    unsub: 'Cancelar suscripción',
    tagline: 'Energía serena para tu Mac.',
  },
  fr: {
    why: 'Un mot discret de Battery Sensei · battery-sensei.app',
    unsub: 'Se désabonner',
    tagline: 'Une énergie sereine pour votre Mac.',
  },
  ja: {
    why: 'Battery Sensei より、静かなお知らせ · battery-sensei.app',
    unsub: '配信停止',
    tagline: 'Mac に、静かなエネルギーを。',
  },
}

const WELCOME_COPY: Record<
  Locale,
  {
    preview: string
    kicker: string
    kanji: string
    headingPre: string
    headingItalic: string
    body: string
    cta: string
    expectKicker: string
    expectBody: string
    sign: string
    signature: string
  }
> = {
  en: {
    preview: "Welcome. Here's your download.",
    kicker: 'Welcome',
    kanji: '歓迎',
    headingPre: "You're in.",
    headingItalic: "Here's the download.",
    body: "Battery Sensei is a small, quiet Mac app. It watches your battery so you don't have to, and speaks up only when it actually matters.",
    cta: 'Download Battery Sensei',
    expectKicker: 'What to expect',
    expectBody:
      "Roughly one email per release — never more than once a month. Tips, changelogs, and the occasional behind-the-scenes note. No tracking pixels. No promotions for other people's products.",
    sign: 'With care,',
    signature: 'The Battery Sensei team',
  },
  de: {
    preview: 'Willkommen. Hier ist dein Download.',
    kicker: 'Willkommen',
    kanji: '歓迎',
    headingPre: 'Du bist dabei.',
    headingItalic: 'Hier ist der Download.',
    body: 'Battery Sensei ist eine kleine, leise Mac-App. Sie achtet auf deinen Akku, damit du es nicht tun musst — und meldet sich nur, wenn es wirklich zählt.',
    cta: 'Battery Sensei herunterladen',
    expectKicker: 'Was dich erwartet',
    expectBody:
      'Etwa eine E-Mail pro Release — höchstens einmal im Monat. Tipps, Changelogs und gelegentlich ein Blick hinter die Kulissen. Keine Tracking-Pixel. Keine Werbung für andere Produkte.',
    sign: 'Mit Sorgfalt,',
    signature: 'Das Battery Sensei Team',
  },
  es: {
    preview: 'Bienvenido. Aquí está tu descarga.',
    kicker: 'Bienvenido',
    kanji: '歓迎',
    headingPre: 'Estás dentro.',
    headingItalic: 'Aquí está la descarga.',
    body: 'Battery Sensei es una app pequeña y silenciosa para Mac. Cuida tu batería para que tú no tengas que hacerlo, y solo habla cuando importa de verdad.',
    cta: 'Descargar Battery Sensei',
    expectKicker: 'Qué esperar',
    expectBody:
      'Aproximadamente un correo por lanzamiento — nunca más de una vez al mes. Consejos, changelogs y alguna nota entre bambalinas. Sin píxeles de seguimiento. Sin promociones de otros productos.',
    sign: 'Con cuidado,',
    signature: 'El equipo de Battery Sensei',
  },
  fr: {
    preview: 'Bienvenue. Voici votre téléchargement.',
    kicker: 'Bienvenue',
    kanji: '歓迎',
    headingPre: 'Vous y êtes.',
    headingItalic: 'Voici le téléchargement.',
    body: 'Battery Sensei est une petite app Mac, discrète. Elle veille sur votre batterie à votre place, et ne se manifeste que lorsque c’est vraiment utile.',
    cta: 'Télécharger Battery Sensei',
    expectKicker: 'À quoi vous attendre',
    expectBody:
      'Environ un email par release — jamais plus d’une fois par mois. Astuces, changelogs et parfois une note en coulisses. Pas de pixel de suivi. Pas de promo pour des produits tiers.',
    sign: 'Avec soin,',
    signature: 'L’équipe Battery Sensei',
  },
  ja: {
    preview: 'ようこそ。ダウンロードはこちらです。',
    kicker: 'ようこそ',
    kanji: '歓迎',
    headingPre: 'ご登録ありがとうございます。',
    headingItalic: 'ダウンロードはこちらから。',
    body: 'Battery Sensei は、小さく静かな Mac アプリです。あなたに代わってバッテリーを見守り、本当に必要なときだけそっとお知らせします。',
    cta: 'Battery Sensei をダウンロード',
    expectKicker: '今後の配信について',
    expectBody:
      '配信はリリースごとに約 1 通、多くとも月 1 通です。ヒント、変更履歴、ときどき舞台裏の話。トラッキングピクセルや他社製品のプロモーションは行いません。',
    sign: '心を込めて、',
    signature: 'Battery Sensei チーム',
  },
}

/**
 * Shared washi-shell layout for the welcome mail. Mirrors
 * lib/emails/EmailLayout.tsx visually but emitted as an inline HTML
 * string so the function bundle has no React or JSX dependencies. The
 * welcome shell always carries the localised unsubscribe link in the
 * footer (post-opt-in / CAN-SPAM requirement).
 */
function emailShell({
  preheader,
  bodyHtml,
  locale,
  siteOrigin,
  unsubscribeUrl,
}: {
  preheader: string
  bodyHtml: string
  locale: Locale
  siteOrigin: string
  unsubscribeUrl: string
}): string {
  const layout = LAYOUT_COPY[locale] ?? LAYOUT_COPY.en
  const safePre = escapeHtml(preheader)
  const safeWhy = escapeHtml(layout.why)
  const safeTagline = escapeHtml(layout.tagline)
  const safeIcon = `${escapeHtml(siteOrigin)}/app-icon-256.png`
  const safeUnsub = escapeHtml(unsubscribeUrl)
  const safeUnsubLabel = escapeHtml(layout.unsub)

  const brushSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 10" width="120" height="10">` +
    `<path d="M2 6 C 22 2, 60 8, 96 4 L 118 5" fill="none" stroke="${PALETTE.sumi}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>` +
    `<circle cx="118" cy="5" r="1.6" fill="${PALETTE.sumi}" opacity="0.85"/>` +
    `</svg>`
  const brushSrc = `data:image/svg+xml;utf8,${encodeURIComponent(brushSvg)}`

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Battery Sensei</title>
<style>
@media only screen and (max-width: 480px) {
  .bs-pad { padding-left: 22px !important; padding-right: 22px !important; }
  .bs-pad-top { padding-top: 26px !important; }
  .bs-display { font-size: 30px !important; line-height: 36px !important; }
  .bs-brush { width: 100% !important; max-width: 260px !important; }
  .bs-cta { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
}
</style>
</head>
<body style="margin:0;padding:40px 12px;background-color:${PALETTE.washiBg};background-image:radial-gradient(at 20% 0%, rgba(255,255,255,0.55), transparent 55%),radial-gradient(at 80% 100%, rgba(200,155,60,0.10), transparent 60%);font-family:${FONT_STACK};color:${PALETTE.sumi};-webkit-font-smoothing:antialiased;">
<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${safePre}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:transparent;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${PALETTE.washi};border-radius:2px;box-shadow:inset 0 0 0 1px ${PALETTE.line},inset 0 0 0 8px ${PALETTE.washi},inset 0 0 0 9px rgba(28,26,23,0.06),0 1px 0 rgba(28,26,23,0.05),0 24px 48px -20px rgba(28,26,23,0.18);overflow:hidden;">
<tr><td class="bs-pad bs-pad-top" style="padding:36px 44px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="vertical-align:middle;width:52px;"><img src="${safeIcon}" alt="" width="44" height="44" style="display:block;" /></td>
<td style="vertical-align:middle;padding-left:14px;">
<p style="margin:0;font-family:${SERIF_STACK};font-size:20px;font-weight:500;letter-spacing:-0.012em;color:${PALETTE.sumi};line-height:1.1;">Battery Sensei</p>
<p style="margin:3px 0 0;font-family:${FONT_STACK};font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:${PALETTE.nezumi};">${safeTagline}</p>
</td>
</tr>
</table>
<div style="padding:28px 0 0;">
<img src="${brushSrc}" alt="" class="bs-brush" width="380" height="12" style="display:block;width:100%;max-width:380px;" />
</div>
</td></tr>
<tr><td class="bs-pad" style="padding:24px 44px 36px;">${bodyHtml}</td></tr>
<tr><td class="bs-pad" style="padding:24px 44px 36px;border-top:1px solid ${PALETTE.line};background-color:rgba(226, 214, 189, 0.35);">
<p style="margin:0;font-family:${FONT_STACK};font-size:11px;line-height:18px;letter-spacing:0.04em;color:${PALETTE.sumiSoft};">${safeWhy}</p>
<p style="margin:8px 0 0;font-family:${FONT_STACK};font-size:11px;line-height:18px;letter-spacing:0.04em;color:${PALETTE.sumiSoft};"><a href="${safeUnsub}" style="color:${PALETTE.sumi};text-decoration:underline;text-underline-offset:3px;">${safeUnsubLabel}</a></p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0;width:600px;max-width:100%;">
<tr><td style="text-align:center;">
<p style="margin:0;font-family:${JP_STACK};font-size:11px;letter-spacing:0.3em;color:rgba(28,26,23,0.35);">電 池 仙 人</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/**
 * Renders the welcome email body — kicker, headline, CTA, what-to-expect
 * call-out, signature with the hinomaru chop. Wraps it in the shared
 * washi shell with the localised unsubscribe footer.
 */
function welcomeEmailHtml({
  downloadUrl,
  unsubscribeUrl,
  locale,
  siteOrigin,
}: {
  downloadUrl: string
  unsubscribeUrl: string
  locale: Locale
  siteOrigin: string
}): string {
  const c = WELCOME_COPY[locale] ?? WELCOME_COPY.en
  const safeDl = escapeHtml(downloadUrl)

  const body =
    `<p style="margin:0 0 18px;font-family:${FONT_STACK};font-size:11px;text-transform:uppercase;letter-spacing:0.26em;color:${PALETTE.hinomaru};">` +
    `${escapeHtml(c.kicker)}` +
    `<span style="color:${PALETTE.nezumi};margin:0 8px;">·</span>` +
    `<span style="font-family:${JP_STACK};letter-spacing:0.18em;">${escapeHtml(c.kanji)}</span>` +
    `</p>` +
    `<p class="bs-display" style="margin:0 0 20px;font-family:${SERIF_STACK};font-size:36px;line-height:42px;font-weight:500;letter-spacing:-0.022em;color:${PALETTE.sumi};">` +
    `${escapeHtml(c.headingPre)}` +
    `<span style="display:block;font-style:italic;font-weight:500;color:${PALETTE.sumiSoft};">${escapeHtml(c.headingItalic)}</span>` +
    `</p>` +
    `<p style="margin:0 0 28px;font-family:${FONT_STACK};font-size:16px;line-height:28px;color:${PALETTE.sumiSoft};max-width:460px;">${escapeHtml(c.body)}</p>` +
    `<div style="margin:0 0 32px;">` +
    `<a href="${safeDl}" class="bs-cta" style="background-color:${PALETTE.sumi};color:${PALETTE.washi};padding:16px 30px 17px;border-radius:3px;font-family:${SERIF_STACK};font-size:17px;font-weight:500;letter-spacing:-0.005em;text-decoration:none;display:inline-block;box-shadow:0 1px 0 rgba(28,26,23,0.3), 0 8px 18px -10px rgba(28,26,23,0.5);">` +
    `<span style="display:inline-block;font-family:${FONT_STACK};font-size:15px;margin-right:10px;opacity:0.92;">↓</span>` +
    `${escapeHtml(c.cta)}` +
    `</a>` +
    `</div>` +
    `<div style="margin:0 0 28px;padding:4px 0 4px 18px;border-left:1px solid ${PALETTE.line};">` +
    `<p style="margin:0 0 6px;font-family:${SERIF_STACK};font-style:italic;font-size:14px;letter-spacing:-0.005em;color:${PALETTE.sumi};">${escapeHtml(c.expectKicker)}</p>` +
    `<p style="margin:0;font-family:${FONT_STACK};font-size:14px;line-height:23px;color:${PALETTE.sumiSoft};">${escapeHtml(c.expectBody)}</p>` +
    `</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">` +
    `<tr>` +
    `<td style="vertical-align:middle;">` +
    `<p style="margin:0;font-family:${SERIF_STACK};font-style:italic;font-size:14px;color:${PALETTE.sumiSoft};line-height:1.4;">` +
    `${escapeHtml(c.sign)}<br/>` +
    `<span style="color:${PALETTE.sumi};font-style:normal;">${escapeHtml(c.signature)}</span>` +
    `</p>` +
    `</td>` +
    `<td style="vertical-align:middle;text-align:right;width:64px;">` +
    `<span style="display:inline-block;font-family:${JP_STACK};font-size:24px;font-weight:700;color:${PALETTE.washi};background-color:${PALETTE.hinomaru};width:46px;height:46px;line-height:46px;text-align:center;border-radius:2px;box-shadow:0 1px 0 rgba(28,26,23,0.2), 0 4px 10px -4px rgba(188,0,45,0.5);">電</span>` +
    `</td>` +
    `</tr>` +
    `</table>`

  return emailShell({
    preheader: c.preview,
    bodyHtml: body,
    locale,
    siteOrigin,
    unsubscribeUrl,
  })
}

const DOWNLOAD_PATH = '/#download'

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

function hostname(): string {
  try {
    return new URL(siteUrl()).hostname
  } catch {
    return 'battery-sensei.app'
  }
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
 * no Resend call, no welcome mail. Inbox prefetchers + AV scanners can
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
  const qs = `?token=${encodeURIComponent(parsed.data)}`
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
  // `isAllowedOrigin` includes Vercel preview/branch URLs (VERCEL_URL,
  // VERCEL_BRANCH_URL) so PR previews can exercise the flow without
  // configuring PUBLIC_SITE_URL per env.
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

  // Already confirmed → skip the welcome resend, return success so the
  // page still navigates to /newsletter/confirmed (the user expects a
  // success moment even on a second click).
  if (row.confirmedAt) {
    return json({
      ok: true,
      redirectTo: safeRedirectPath(`/newsletter/confirmed?locale=${locale}`),
    })
  }

  // Mark confirmed locally BEFORE talking to Resend. If Resend is down,
  // a retry just re-tries the side effects without re-creating the
  // welcome storm.
  const confirmed = await db.newsletterSignup.update({
    where: { email },
    data: { confirmedAt: new Date(), unsubscribedAt: null, locale },
  })

  const resend = getResendClient()

  // Flip the contact to subscribed. `unsubscribed` is an account-level
  // property, so this single update opts them in across every segment
  // they were attached to at signup — no per-audience walk needed.
  try {
    await resend.contacts.update({ email, unsubscribed: false })
  } catch {
    // Contact missing (e.g. the signup-time create failed). Recreate it
    // already-subscribed, attached to both signup segments.
    try {
      const created = await resend.contacts.create({
        email,
        unsubscribed: false,
        firstName: `src:confirm-recovery|lang:${locale}`,
        segments: signupSegments(),
      })
      const id = (created as { data?: { id?: string } } | undefined)?.data?.id
      if (id && id !== confirmed.releasesContactId) {
        await db.newsletterSignup
          .update({
            where: { email },
            data: { releasesContactId: id },
          })
          .catch(() => {})
      }
    } catch (err) {
      console.error('[newsletter] confirm subscribe recovery failed', err)
    }
  }

  const unsubToken = createToken(
    email,
    'unsubscribe',
    locale,
    confirmed.tokenEpoch,
  )
  const unsubscribeUrl = `${siteUrl()}/api/newsletter/unsubscribe?token=${unsubToken}`
  const downloadUrl = `${siteUrl()}${DOWNLOAD_PATH}`

  const html = welcomeEmailHtml({
    downloadUrl,
    unsubscribeUrl,
    locale: locale as Locale,
    siteOrigin: siteUrl(),
  })

  let welcomeFailed = false
  try {
    await resend.emails.send({
      from: resendFrom(),
      to: email,
      replyTo: resendReplyTo(),
      subject: welcomeSubject(locale),
      html,
      text: welcomeEmailText(locale, downloadUrl, unsubscribeUrl),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe@${hostname()}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'kind', value: 'welcome' },
        { name: 'locale', value: locale },
      ],
    })
  } catch (err) {
    welcomeFailed = true
    console.error('[newsletter] welcome send failed', err)
  }

  // Surface welcome failure to the confirmed page so the UI can show
  // a "download here, email didn't arrive" fallback. Confirm itself
  // already succeeded — never block the redirect on send failure.
  const status = welcomeFailed ? '&status=welcome-failed' : ''
  return json({
    ok: true,
    redirectTo: safeRedirectPath(`/newsletter/confirmed?locale=${locale}${status}`),
  })
}
