/**
 * Newsletter signup endpoint (double opt-in).
 *
 *   POST /api/free-signup  { email, locale?, source? }  →  200 { ok: true }
 *
 * Always returns the same shape on valid input — never leak whether
 * the address is new, already pending, or already confirmed.
 *
 * Flow:
 *   1. CSRF check (Origin/Referer must match PUBLIC_SITE_URL).
 *   2. Validate body with strict zod (unknown keys rejected).
 *   3. Postgres-backed per-IP rate limit (count NewsletterSignup rows
 *      in window). Replaces the prior in-memory Map — that broke as
 *      soon as Fluid scaled to >1 instance.
 *   4. Upsert NewsletterSignup. On re-signup after a prior unsub we
 *      bump `tokenEpoch` so the dormant unsubscribe link from the
 *      previous subscription stops working.
 *   5. Mirror to Resend RELEASES audience as `unsubscribed: true`
 *      (pending). Resend dedupes by email so this is idempotent.
 *   6. Send the locale-matched confirmation email with an HMAC-signed
 *      link bound to the row's current tokenEpoch.
 *
 * Vercel Function note
 * --------------------
 * This file lives at root `api/` so Vercel deploys it as a Function.
 * The earlier TanStack Start file-route version (src/routes/api/*) did
 * not deploy in this stack — keep the canonical implementation here.
 * All relative imports carry `.js` because the runtime is Node ESM
 * (`"type":"module"`) and extensionless resolution 404s in /var/task.
 */
import { z } from 'zod'
import { db } from '../lib/db.js'
import { confirmEmailText } from '../lib/emails/plaintext.js'
import { confirmSubject } from '../lib/emails/subjects.js'
import { createToken } from '../lib/newsletter-token.js'
import {
  getResendClient,
  isAllowedOrigin,
  releasesAudienceId,
  resendFrom,
  resendReplyTo,
  siteUrl,
  SUPPORTED_LOCALES,
} from '../lib/resend.js'

// ────────────────────────────────────────────────────────────────────
//  Inlined confirm email — duplicated, NOT imported
// ────────────────────────────────────────────────────────────────────
//
// Vercel's serverless bundler does NOT reliably traverse imports out
// of `api/` into sibling directories (`/lib`) under this project's
// TanStack Start + Vite build. Importing the React Email `.tsx`
// templates from `lib/emails/` fails in prod with
// `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/lib/emails/ConfirmEmail.js'`
// because Vercel's nft trace doesn't compile `.tsx` files into the
// function bundle. See `api/contact.ts` / `api/checkout-session.ts`
// for the same gotcha applied to plain helpers.
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

const LAYOUT_COPY: Record<Locale, { why: string; ignore: string; tagline: string }> = {
  en: {
    why: 'A quiet note from Battery Sensei · battery-sensei.app',
    ignore:
      "Didn't sign up? You can let this drift past — nothing is saved until you confirm.",
    tagline: 'Calm energy for your Mac.',
  },
  de: {
    why: 'Eine leise Nachricht von Battery Sensei · battery-sensei.app',
    ignore:
      'Nicht angemeldet? Lass die E-Mail einfach vorbeiziehen — ohne deine Bestätigung wird nichts gespeichert.',
    tagline: 'Ruhige Energie für deinen Mac.',
  },
  es: {
    why: 'Una nota tranquila de Battery Sensei · battery-sensei.app',
    ignore:
      '¿No te registraste? Déjalo pasar — nada se guarda hasta que confirmes.',
    tagline: 'Energía serena para tu Mac.',
  },
  fr: {
    why: 'Un mot discret de Battery Sensei · battery-sensei.app',
    ignore:
      'Pas inscrit·e ? Laissez ce message passer — rien n’est enregistré tant que vous ne confirmez pas.',
    tagline: 'Une énergie sereine pour votre Mac.',
  },
  ja: {
    why: 'Battery Sensei より、静かなお知らせ · battery-sensei.app',
    ignore:
      'ご登録のお心当たりがなければ、そっと閉じてください。ご確認いただくまで、何も保存されません。',
    tagline: 'Mac に、静かなエネルギーを。',
  },
}

const CONFIRM_COPY: Record<
  Locale,
  {
    preview: string
    kicker: string
    kanji: string
    headingPre: string
    headingItalic: string
    body: string
    cta: string
    fallback: string
    expiry: string
    sign: string
    signature: string
  }
> = {
  en: {
    preview: 'One click to confirm your Battery Sensei signup.',
    kicker: 'A note from Battery Sensei',
    kanji: '確認',
    headingPre: 'One quiet click',
    headingItalic: 'and we begin.',
    body: "Tap below to confirm your email. We write rarely — only when something genuinely useful for your Mac's battery is ready.",
    cta: 'Confirm my email',
    fallback: 'Button not working? Paste this link:',
    expiry: 'This link rests for 48 hours.',
    sign: 'With care,',
    signature: 'The Battery Sensei team',
  },
  de: {
    preview: 'Ein Klick, um deine Anmeldung zu bestätigen.',
    kicker: 'Eine Notiz von Battery Sensei',
    kanji: '確認',
    headingPre: 'Ein leiser Klick',
    headingItalic: 'und wir beginnen.',
    body: 'Tippe unten, um deine E-Mail zu bestätigen. Wir schreiben selten — nur, wenn es wirklich nützlich für den Akku deines Macs ist.',
    cta: 'E-Mail bestätigen',
    fallback: 'Funktioniert der Button nicht? Kopiere diesen Link:',
    expiry: 'Dieser Link ruht 48 Stunden.',
    sign: 'Mit Sorgfalt,',
    signature: 'Das Battery Sensei Team',
  },
  es: {
    preview: 'Un clic para confirmar tu suscripción.',
    kicker: 'Una nota de Battery Sensei',
    kanji: '確認',
    headingPre: 'Un clic tranquilo',
    headingItalic: 'y comenzamos.',
    body: 'Pulsa abajo para confirmar tu correo. Escribimos poco — solo cuando hay algo realmente útil para la batería de tu Mac.',
    cta: 'Confirmar mi correo',
    fallback: '¿El botón no funciona? Pega este enlace:',
    expiry: 'Este enlace reposa 48 horas.',
    sign: 'Con cuidado,',
    signature: 'El equipo de Battery Sensei',
  },
  fr: {
    preview: 'Un clic pour confirmer votre inscription.',
    kicker: 'Un mot de Battery Sensei',
    kanji: '確認',
    headingPre: 'Un clic discret',
    headingItalic: 'et nous commençons.',
    body: 'Cliquez ci-dessous pour confirmer votre adresse. Nous écrivons rarement — seulement quand il y a vraiment de quoi aider la batterie de votre Mac.',
    cta: 'Confirmer mon adresse',
    fallback: 'Le bouton ne fonctionne pas ? Collez ce lien :',
    expiry: 'Ce lien repose 48 heures.',
    sign: 'Avec soin,',
    signature: 'L’équipe Battery Sensei',
  },
  ja: {
    preview: 'ワンクリックでご登録を完了してください。',
    kicker: 'Battery Sensei より',
    kanji: '確認',
    headingPre: 'ひと押しの静けさ',
    headingItalic: 'そして、はじまる。',
    body: '下のボタンを押してメールアドレスをご確認ください。配信は控えめに、Mac のバッテリーに本当に役立つことがあるときだけお送りします。',
    cta: 'メールを確認する',
    fallback: 'ボタンが動かない場合は、このリンクをご利用ください：',
    expiry: 'このリンクは 48 時間で静かに閉じます。',
    sign: '心を込めて、',
    signature: 'Battery Sensei チーム',
  },
}

/**
 * Shared washi-shell layout for the confirm mail. Mirrors
 * lib/emails/EmailLayout.tsx visually but emitted as an inline HTML
 * string so the function bundle has no React or JSX dependencies. The
 * confirm shell never carries an unsubscribe link (CAN-SPAM: nothing
 * to unsubscribe from before opt-in) — the footer shows `ignoreNote`
 * instead.
 */
function emailShell({
  preheader,
  bodyHtml,
  locale,
  siteOrigin,
  ignoreNote,
}: {
  preheader: string
  bodyHtml: string
  locale: Locale
  siteOrigin: string
  ignoreNote: string
}): string {
  const layout = LAYOUT_COPY[locale] ?? LAYOUT_COPY.en
  const safePre = escapeHtml(preheader)
  const safeWhy = escapeHtml(layout.why)
  const safeTagline = escapeHtml(layout.tagline)
  const safeIcon = `${escapeHtml(siteOrigin)}/app-icon-256.png`

  const brushSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 10" width="120" height="10">` +
    `<path d="M2 6 C 22 2, 60 8, 96 4 L 118 5" fill="none" stroke="${PALETTE.sumi}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>` +
    `<circle cx="118" cy="5" r="1.6" fill="${PALETTE.sumi}" opacity="0.85"/>` +
    `</svg>`
  const brushSrc = `data:image/svg+xml;utf8,${encodeURIComponent(brushSvg)}`

  const footerNoteHtml = `<p style="margin:8px 0 0;font-family:${FONT_STACK};font-size:11px;line-height:18px;letter-spacing:0.04em;color:${PALETTE.nezumi};font-style:italic;">${escapeHtml(ignoreNote)}</p>`

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
${footerNoteHtml}
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
 * Renders the double opt-in confirm email body — kicker, headline, CTA,
 * fallback link, signature with the hinomaru chop. Wraps it in the
 * shared washi shell with the "ignore" footer (no unsubscribe link).
 */
function confirmEmailHtml({
  confirmUrl,
  locale,
  siteOrigin,
}: {
  confirmUrl: string
  locale: Locale
  siteOrigin: string
}): string {
  const c = CONFIRM_COPY[locale] ?? CONFIRM_COPY.en
  const layout = LAYOUT_COPY[locale] ?? LAYOUT_COPY.en
  const safeUrl = escapeHtml(confirmUrl)

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
    `<p style="margin:0 0 30px;font-family:${FONT_STACK};font-size:16px;line-height:28px;color:${PALETTE.sumiSoft};max-width:460px;">${escapeHtml(c.body)}</p>` +
    `<div style="margin:0 0 26px;">` +
    `<a href="${safeUrl}" class="bs-cta" style="background-color:${PALETTE.sumi};color:${PALETTE.washi};padding:16px 30px 17px;border-radius:3px;font-family:${SERIF_STACK};font-size:17px;font-weight:500;letter-spacing:-0.005em;text-decoration:none;display:inline-block;box-shadow:0 1px 0 rgba(28,26,23,0.3), 0 8px 18px -10px rgba(28,26,23,0.5);">` +
    `<span style="display:inline-block;font-family:${FONT_STACK};font-size:14px;margin-right:10px;opacity:0.9;">✓</span>` +
    `${escapeHtml(c.cta)}` +
    `</a>` +
    `</div>` +
    `<p style="margin:0 0 6px;font-family:${FONT_STACK};font-size:12px;letter-spacing:0.04em;color:${PALETTE.nezumi};">${escapeHtml(c.fallback)}</p>` +
    `<p style="margin:0 0 30px;font-family:${FONT_STACK};font-size:12px;word-break:break-all;">` +
    `<a href="${safeUrl}" style="color:${PALETTE.sumiSoft};text-decoration:underline;text-underline-offset:2px;">${safeUrl}</a>` +
    `</p>` +
    `<p style="margin:0 0 30px;font-family:${FONT_STACK};font-style:italic;font-size:12px;color:${PALETTE.nezumi};">${escapeHtml(c.expiry)}</p>` +
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
    ignoreNote: layout.ignore,
  })
}

function json(payload: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

/**
 * Request body schema. Every field is hard-validated before it ever
 * reaches Resend or the email renderer.
 *
 *   - `email`   trimmed, lowercased, RFC-shape check, length-capped.
 *   - `locale`  must be one of the SUPPORTED_LOCALES allowlist; falls
 *               back to 'en' if missing/unknown.
 *   - `source`  short opaque tag from the form (which page it came
 *               from). Strict alphanumeric+_- only — no HTML, no
 *               whitespace, no quotes, no separators.
 *   - `website` honeypot: must be empty/absent. Filled = bot.
 *
 * Strict mode prevents unknown keys (e.g. a forged `name` field that
 * could try to seed Resend contact data).
 */
const SignupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(254)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    // Accept the displayed website language. i18next may send a region
    // subtag (e.g. "de-AT") — strip it before allowlist matching so
    // legitimate visitors don't silently fall back to English.
    locale: z
      .preprocess(
        (v) =>
          typeof v === 'string' ? v.toLowerCase().split('-')[0] : v,
        z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]]),
      )
      .default('en')
      .catch('en'),
    source: z
      .string()
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .default('unknown')
      .catch('unknown'),
    website: z.string().max(0).optional(), // honeypot
  })
  .strict()

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5
// Coarse fallback bucket when no usable IP is present. Limits the total
// throughput of "untrusted" callers per window so a header-stripping
// botnet can't quietly flood the table while every individual request
// has no IP to count against.
const FALLBACK_RATE_MAX = 25
const IP_HEADER_MAX = 64

// IPs we refuse to count against — they're useless as buckets and a
// trivial spoof target. Real Vercel traffic never produces these.
const UNTRUSTED_IPS = new Set([
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '::ffff:0.0.0.0',
  '::ffff:127.0.0.1',
])

/**
 * Extract the client IP from the request. Returns null on anything we
 * can't trust as a stable per-client bucket. The caller MUST treat null
 * as "rate-limit unbucketed" rather than "skip the limit" — that's how
 * we avoid the historical fail-open where a stripped proxy let one
 * machine bypass the cap.
 */
function clientIp(request: Request): string | null {
  // x-forwarded-for can be a comma list (proxy-chain). The leftmost
  // entry is the originating client per the de-facto convention on
  // Vercel + most major reverse proxies. Cap the slice so a malformed
  // header can't blow up the cost of `LIKE` / equality lookups.
  const xff = request.headers.get('x-forwarded-for')
  const raw = (xff?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '').slice(0, IP_HEADER_MAX)
  if (!raw) return null
  if (UNTRUSTED_IPS.has(raw)) return null
  return raw
}

/**
 * Postgres-backed rate limiter. When the IP is missing or untrusted we
 * fall back to a coarser bucket: a `null`-ipAddress count across all
 * signups in the window. That keeps the worst-case throughput of all
 * header-stripped traffic to FALLBACK_RATE_MAX, instead of letting it
 * sail past the per-IP wall entirely.
 *
 * DB outages fail-OPEN (log + allow) — we don't want a transient
 * Postgres blip to kill legitimate signups, and Resend itself caps
 * outbound send volume so a flood mid-outage stays bounded.
 */
async function rateLimited(ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS)
  try {
    if (ip) {
      const count = await db.newsletterSignup.count({
        where: { ipAddress: ip, createdAt: { gt: since } },
      })
      return count >= RATE_MAX
    }
    // No usable IP. Count the global "untrusted" bucket — every signup
    // whose ipAddress is null in the window. This is intentionally
    // coarse: any single untrusted caller eats into the same budget as
    // every other untrusted caller, so a flood is throttled even if
    // every individual request hides behind a stripped header.
    const count = await db.newsletterSignup.count({
      where: { ipAddress: null, createdAt: { gt: since } },
    })
    return count >= FALLBACK_RATE_MAX
  } catch (err) {
    console.error('[newsletter] rate limit query failed', err)
    return false
  }
}

function hostname(): string {
  try {
    return new URL(siteUrl()).hostname
  } catch {
    return 'battery-sensei.app'
  }
}

export async function POST(request: Request): Promise<Response> {
  // CSRF defense. application/json POSTs aren't subject to a forged
  // form-submit per the simple-request rule, but cross-origin fetch
  // with custom headers is still possible from a misconfigured embed
  // or a malicious extension. Require same-origin.
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: 'bad-origin' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid-json' }, { status: 400 })
  }

  // Strict zod parse. Rejects unknown keys (would-be `name` injection),
  // bad email shape, non-allowlist locales, and source values that
  // contain anything but [A-Za-z0-9_-]. Honeypot must be empty.
  const parsed = SignupSchema.safeParse(raw)
  if (!parsed.success) {
    // Honeypot trip looks identical from outside — return a quiet 200
    // so bots can't tell schema failure from bad-email failure.
    const isHoneypot =
      parsed.error.issues.some((i) => i.path[0] === 'website') ||
      parsed.error.issues.some((i) => i.code === 'unrecognized_keys')
    if (isHoneypot) return json({ ok: true })
    return json({ ok: false, error: 'invalid-input' }, { status: 400 })
  }

  const { email, locale, source } = parsed.data
  const ip = clientIp(request)

  if (await rateLimited(ip)) {
    // Quiet 200 — don't confirm to attackers that they hit the wall.
    return json({ ok: true })
  }

  const releasesId = releasesAudienceId()
  if (!releasesId) {
    console.error('[newsletter] RESEND_AUDIENCE_RELEASES is not set')
    return json({ ok: false, error: 'misconfigured' }, { status: 500 })
  }

  // Map zod `source` to the Prisma enum. The form may send either
  // hyphenated (`pricing-free`, `walkthrough-notify`) or underscored
  // (`pricing_free`, `resend_confirm`) variants — we normalise the
  // hyphen→underscore first, then bucket anything outside the enum
  // allowlist as `other` so a typo on the client never rejects a
  // legitimate signup. Pricing free + thanks-page resends are the only
  // values that map 1:1; anything else (walkthrough, resend-confirm,
  // future surfaces) is recorded as `other` until the enum is widened.
  const normalisedSource = source.replace(/-/g, '_')
  const sourceEnum =
    normalisedSource === 'pricing_free' || normalisedSource === 'thanks_page'
      ? normalisedSource
      : 'other'

  // Upsert the row. On re-signup after a prior unsub, bump tokenEpoch
  // so the old unsubscribe link can't unsubscribe the freshly opted-in
  // address. confirmedAt is intentionally NOT cleared — we keep the
  // historical opt-in record but rely on tokenEpoch + Resend state.
  const row = await db.newsletterSignup.upsert({
    where: { email },
    create: {
      email,
      locale,
      source: sourceEnum,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
      origin: request.headers.get('origin') ?? null,
    },
    // A simple duplicate signup mid-flow (e.g. visitor double-clicks
    // the button) must keep the prior confirm link working so the
    // inbox-race doesn't confuse them — so we do NOT bump tokenEpoch
    // here. Resubscribe-after-unsub is handled below via a follow-up
    // update that bumps the epoch in one extra write.
    update: {
      locale,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
      origin: request.headers.get('origin') ?? null,
    },
  })

  // Compute the effective epoch for token issuance. If the address was
  // previously unsubscribed, bump now (one extra write, but rare path).
  let epoch = row.tokenEpoch
  if (row.unsubscribedAt) {
    const bumped = await db.newsletterSignup.update({
      where: { email },
      data: {
        tokenEpoch: { increment: 1 },
        unsubscribedAt: null,
      },
    })
    epoch = bumped.tokenEpoch
  }

  const resend = getResendClient()

  // Pending state lives only in the RELEASES audience. We add to
  // LAUNCHES at confirm-time so that audience never holds unverified
  // contacts.
  try {
    const created = await resend.contacts.create({
      audienceId: releasesId,
      email,
      unsubscribed: true,
      firstName: `src:${source}|lang:${locale}`,
    })
    const contactId = (created as { data?: { id?: string } } | undefined)
      ?.data?.id
    if (contactId && contactId !== row.releasesContactId) {
      await db.newsletterSignup
        .update({
          where: { email },
          data: { releasesContactId: contactId },
        })
        .catch(() => {})
    }
  } catch (err) {
    // Resend treats existing email as no-op here, so the only failures
    // worth logging are real ones (network, auth).
    console.error('[newsletter] contacts.create failed', err)
  }

  const confirmToken = createToken(email, 'confirm', locale, epoch)
  const unsubToken = createToken(email, 'unsubscribe', locale, epoch)
  const confirmUrl = `${siteUrl()}/api/newsletter/confirm?token=${confirmToken}`
  // Used for the RFC 8058 List-Unsubscribe header only — not surfaced
  // in the visible confirm email body, since the user hasn't opted in yet.
  const unsubscribeUrl = `${siteUrl()}/api/newsletter/unsubscribe?token=${unsubToken}`

  const html = confirmEmailHtml({
    confirmUrl,
    locale: locale as Locale,
    siteOrigin: siteUrl(),
  })

  try {
    await resend.emails.send({
      from: resendFrom(),
      to: email,
      replyTo: resendReplyTo(),
      subject: confirmSubject(locale),
      html,
      text: confirmEmailText(locale, confirmUrl),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe@${hostname()}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'kind', value: 'confirm' },
        { name: 'locale', value: locale },
        { name: 'source', value: source },
      ],
    })
  } catch (err) {
    console.error('[newsletter] confirm send failed', err)
    return json({ ok: false, error: 'send-failed' }, { status: 502 })
  }

  return json({ ok: true })
}
