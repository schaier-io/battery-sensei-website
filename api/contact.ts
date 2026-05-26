/**
 * POST /api/contact — receives the site contact form, persists the request,
 * and dispatches two emails via Resend's batch endpoint:
 *
 *   1. Support email   → CONTACT_INBOX_TO (the internal inbox).
 *      Carries the visitor's message and a one-click reply action. The
 *      visitor's email goes in `reply_to` so the inbox can reply directly.
 *
 *   2. Confirmation    → the visitor.
 *      Only the server-generated ticket id is interpolated. No other
 *      user input is rendered into the body.
 *
 * Persistence
 * -----------
 * Every accepted submission (incl. rate-limited and honeypot-trapped ones)
 * is written to the SupportRequest table. Both the raw payload (exactly as
 * received) and the cleaned/validated fields are stored, so we can audit
 * what the visitor sent vs. what we normalised it to.
 *
 * Rate limiting is a DB count aggregate over SupportRequest.createdAt:
 *   - per email:   max 3 requests / 24h
 *   - per IP:      max 5 requests / 10 min
 *
 * Required env vars (set in Vercel project settings):
 *   DATABASE_URL        Postgres URL used by Prisma
 *   RESEND_API_KEY      Resend API key (server-only, never exposed)
 *   CONTACT_INBOX_TO    address that receives the form (the internal one)
 *   CONTACT_INBOX_FROM  verified sender on Resend, e.g.
 *                       "Battery Sensei <contact@battery-sensei.app>"
 *
 * Vercel auto-discovers this file as a Function thanks to its `api/`
 * location; no route entry needed in vercel.json.
 */

import { z } from 'zod'
import { prisma } from '../lib/db'
import type { Prisma } from '../lib/generated/prisma/client'

const MAX_BODY_BYTES = 32 * 1024

// Rate-limit windows. Both are enforced by a DB count aggregate against
// SupportRequest.createdAt, so they survive cold starts and are shared
// across every region and isolate.
const EMAIL_RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const EMAIL_RATE_MAX_HITS = 3
const IP_RATE_WINDOW_MS = 10 * 60 * 1000
const IP_RATE_MAX_HITS = 5

// Origin allowlist. Browser fetch() always sets Origin on POSTs, so a missing
// or foreign Origin means the request is not from the contact form on this
// site — server tools (curl, Postman) and cross-origin pages both fail here.
const ALLOWED_ORIGINS = new Set([
  'https://battery-sensei.app',
  'https://www.battery-sensei.app',
])
const ALLOWED_ORIGIN_SUFFIXES = ['.vercel.app']

// Strict whitelist for all free-text fields: alphanumeric, whitespace, and
// the punctuation set the user explicitly approved. Apostrophes, quotes,
// angle brackets, slashes, parens, colons, semicolons, backticks etc. are
// all rejected — keeps payloads free of HTML, JS, header-injection, and
// URL-style noise.
const SAFE_TEXT_RE = /^[A-Za-z0-9 \t\n\r=+\-?.,]+$/
const SAFE_TEXT_MESSAGE = 'Only letters, numbers, spaces and the characters = + - ? . , are allowed.'

// Must contain at least one alphanumeric character. Blocks pure-punctuation
// or pure-whitespace messages that satisfy the whitelist but carry no signal.
const HAS_TEXT_RE = /[A-Za-z0-9]/

const ContactSchema = z.object({
  // Hidden honeypot field. Real users never see it; bots fill every input
  // they find. Allowed-but-checked separately in the handler.
  company: z.string().max(200).optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Please tell us your name.')
    .max(120)
    .regex(SAFE_TEXT_RE, SAFE_TEXT_MESSAGE),
  email: z
    .email('That email does not look right.')
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  topic: z.enum(['bug', 'feature', 'billing', 'other']).catch('other'),
  subject: z
    .string()
    .trim()
    .max(160)
    .refine((s) => s === '' || SAFE_TEXT_RE.test(s), SAFE_TEXT_MESSAGE)
    .optional()
    .default(''),
  message: z
    .string()
    .trim()
    .min(12, 'A little more detail will help. A sentence or two is plenty.')
    .max(8000)
    .regex(SAFE_TEXT_RE, SAFE_TEXT_MESSAGE)
    .refine((s) => HAS_TEXT_RE.test(s), 'A little more detail will help. A sentence or two is plenty.'),
})

type ContactInput = z.infer<typeof ContactSchema>
type Topic = ContactInput['topic']

const TOPIC_LABELS: Record<Topic, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  billing: 'Billing / license / refund',
  other: 'General question',
}

const TOPIC_KANJI: Record<Topic, string> = {
  bug: '虫',
  feature: '芽',
  billing: '札',
  other: '文',
}

const SITE_URL = 'https://battery-sensei.app'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
  if (ALLOWED_ORIGINS.has(`${url.protocol}//${url.host}`)) return true
  return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
}

function getClientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')
}

/**
 * Short shared ticket identifier displayed in both emails. Uses a 32-char
 * Crockford-style alphabet (no 0/O/1/I/L to avoid confusion when read aloud).
 * 7 chars over 32 = 35 bits of entropy — plenty for a non-secret label whose
 * only job is to make support+confirmation easy to match by eye.
 */
function generateTicketId(): string {
  const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no 0,o,1,i,l
  const bytes = new Uint8Array(7)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return `#${out}`
}

// Structural sanity on the email beyond zod's regex check.
function isStructurallyValidEmail(s: string): boolean {
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\n/g, ' ')
}

/**
 * Wrap inner HTML in an email-safe shell. Inline styles only — most clients
 * strip <style>. Serif column for the message body, sans for chrome.
 * Avoids web fonts (Gmail/Outlook drop them) and `mix-blend-mode` (broken
 * in most renderers). The washi tone is faked with a plain warm background.
 */
function emailShell({
  preheader,
  bodyHtml,
}: {
  preheader: string
  bodyHtml: string
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Battery Sensei</title>
</head>
<body style="margin:0;padding:0;background:#ece3d1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1a17;-webkit-font-smoothing:antialiased;">
  <!-- preheader: shown in the inbox preview pane, hidden in the body -->
  <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ece3d1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#f4ede0;border:1px solid rgba(28,26,23,0.14);border-radius:6px;box-shadow:0 1px 0 rgba(255,255,255,0.5) inset,0 1px 2px rgba(28,26,23,0.06),0 8px 24px rgba(28,26,23,0.05);">
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#1c1a17;">Battery Sensei</span>
                    <span style="display:inline-block;margin-left:8px;color:#bc002d;font-size:12px;letter-spacing:0.36em;">電池先生</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:#bc002d;color:#fff8eb;font-size:14px;font-weight:700;line-height:1;padding:8px 9px;border-radius:3px;transform:rotate(-3deg);">禅</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:0;border-top:1px solid rgba(28,26,23,0.14);margin:16px 0 0;" />
            </td>
          </tr>
          ${bodyHtml}
          <tr>
            <td style="padding:8px 32px 28px 32px;">
              <hr style="border:0;border-top:1px solid rgba(28,26,23,0.14);margin:0 0 14px;" />
              <p style="margin:0;font-size:12px;line-height:1.55;color:#8a847c;">
                Sent from the contact form on <a href="${SITE_URL}" style="color:#8a847c;text-decoration:underline;">battery-sensei.app</a>. Quiet power for your MacBook.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildSupportEmail({
  ticketId,
  name,
  email,
  topic,
  subject,
  message,
}: {
  ticketId: string
  name: string
  email: string
  topic: Topic
  subject: string
  message: string
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeEmailAttr = escapeAttr(email)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')
  const safeSubject = escapeHtml(subject)
  const safeTicket = escapeHtml(ticketId)
  const topicLabel = TOPIC_LABELS[topic]
  const topicKanji = TOPIC_KANJI[topic]

  const replySubject = subject
    ? `Re: [${ticketId}] ${subject}`
    : `Re: [${ticketId}] your message to Battery Sensei`
  const replyMailto = `mailto:${safeEmailAttr}?subject=${encodeURIComponent(replySubject)}`

  const inboxSubject = subject
    ? `[${topicLabel}] ${ticketId} ${subject}`
    : `[${topicLabel}] ${ticketId} Message from ${name}`

  const bodyHtml = `
          <tr>
            <td style="padding:24px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(188,0,45,0.08);color:#bc002d;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;padding:5px 9px;border-radius:3px;">
                      <span style="font-size:13px;font-weight:700;margin-right:6px;vertical-align:-1px;">${topicKanji}</span>${escapeHtml(topicLabel)}
                    </span>
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12px;color:#8a847c;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
                    ${safeTicket}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 4px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;font-weight:500;color:#1c1a17;letter-spacing:-0.012em;">
                ${safeSubject || `${safeName} got in touch`}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.5);border:1px solid rgba(28,26,23,0.10);border-radius:5px;">
                <tr>
                  <td style="padding:12px 14px;">
                    <p style="margin:0 0 2px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a847c;">From</p>
                    <p style="margin:0;font-size:15px;line-height:1.4;color:#1c1a17;">
                      <strong>${safeName}</strong>
                      <span style="color:#4a4540;"> &lt;<a href="mailto:${safeEmailAttr}" style="color:#4a4540;text-decoration:none;">${safeEmail}</a>&gt;</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px 32px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1c1a17;">
                ${safeMessage}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#1c1a17" style="border-radius:6px;">
                    <a href="${replyMailto}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#f4ede0;text-decoration:none;letter-spacing:0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                      Reply to ${safeName} →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:12px;color:#8a847c;">Replying drops you straight into a draft to ${safeEmail}.</p>
            </td>
          </tr>`

  const html = emailShell({
    preheader: `${topicLabel} from ${name} <${email}>`,
    bodyHtml,
  })

  const text = [
    `Battery Sensei · contact form`,
    `Ticket:  ${ticketId}`,
    `---------------------------------------------`,
    `Topic:   ${topicLabel}`,
    `From:    ${name} <${email}>`,
    subject ? `Subject: ${subject}` : null,
    ``,
    message,
    ``,
    `---------------------------------------------`,
    `Reply: ${email}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject: inboxSubject, html, text }
}

/**
 * Visitor confirmation. The only value interpolated into the body is the
 * server-generated `ticketId` — every other byte is static. No user-provided
 * input (name, message, subject, topic, email) is ever rendered into the
 * confirmation; the visitor's email address is used only as the envelope
 * `to:` recipient by the caller.
 */
function buildConfirmationEmail(ticketId: string): { subject: string; html: string; text: string } {
  const safeTicket = escapeHtml(ticketId)
  const subject = `We got your message · ${ticketId} · Battery Sensei`

  const bodyHtml = `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(28,26,23,0.06);color:#4a4540;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;padding:5px 9px;border-radius:3px;">
                      <span style="font-size:13px;font-weight:700;margin-right:6px;vertical-align:-1px;color:#bc002d;">承</span>Received
                    </span>
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12px;color:#8a847c;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
                    ${safeTicket}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:500;color:#1c1a17;letter-spacing:-0.012em;">
                Your message landed.
              </h1>
              <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#bc002d;letter-spacing:0.08em;">承りました。</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1c1a17;">
                A real person reads every note that comes through the site, and we aim to reply within <strong>48 hours on weekdays</strong>, often sooner. This note is just the receipt that your message reached us.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#4a4540;">
                Reference: <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#1c1a17;">${safeTicket}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 4px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#4a4540;">
                Many common questions are already answered in the <a href="${SITE_URL}/#faq" style="color:#1c1a17;text-decoration:underline;">FAQ</a>. If something changes in the meantime, please send a fresh message from <a href="${SITE_URL}/#contact" style="color:#1c1a17;text-decoration:underline;">the contact form</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 4px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#4a4540;">
                — Battery Sensei
              </p>
            </td>
          </tr>`

  const html = emailShell({
    preheader: `Your message landed. Reference ${ticketId}.`,
    bodyHtml,
  })

  const text = [
    'Your message landed.',
    '承りました。',
    '',
    `Reference: ${ticketId}`,
    '',
    'A real person reads every note that comes through the site, and we aim',
    'to reply within 48 hours on weekdays, often sooner. This note is just',
    'the receipt that your message reached us.',
    '',
    `FAQ: ${SITE_URL}/#faq`,
    `Contact form: ${SITE_URL}/#contact`,
    '',
    '— Battery Sensei',
  ].join('\n')

  return { subject, html, text }
}

function pickString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

/**
 * Build the persisted snapshot of an incoming request. Includes the raw
 * fields exactly as received plus the cleaned/validated values. Rate-limit
 * and honeypot writes reuse this with `cleaned: null` so we still record
 * what was sent even when the request was not delivered.
 */
function buildRequestRecord({
  ticketId,
  rawPayload,
  cleaned,
  metadata,
  status,
}: {
  ticketId: string
  rawPayload: Record<string, unknown>
  cleaned: ContactInput | null
  metadata: { ipAddress: string | null; userAgent: string | null; origin: string | null }
  status: 'pending' | 'rate_limited_email' | 'rate_limited_ip' | 'honeypot'
}): Prisma.SupportRequestCreateInput {
  return {
    ticketId,
    rawName: pickString(rawPayload.name),
    rawEmail: pickString(rawPayload.email),
    rawTopic: pickString(rawPayload.topic),
    rawSubject: pickString(rawPayload.subject),
    rawMessage: pickString(rawPayload.message),
    rawPayload: rawPayload as Prisma.InputJsonValue,
    name: cleaned?.name ?? '',
    email: cleaned?.email ?? '',
    topic: cleaned?.topic ?? 'other',
    subject: cleaned?.subject ?? '',
    message: cleaned?.message ?? '',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    origin: metadata.origin,
    status,
  }
}

async function countRecentByEmail(email: string): Promise<number> {
  const since = new Date(Date.now() - EMAIL_RATE_WINDOW_MS)
  return prisma.supportRequest.count({
    where: { email: email.toLowerCase(), createdAt: { gte: since } },
  })
}

async function countRecentByIp(ip: string): Promise<number> {
  const since = new Date(Date.now() - IP_RATE_WINDOW_MS)
  return prisma.supportRequest.count({
    where: { ipAddress: ip, createdAt: { gte: since } },
  })
}

/**
 * Vercel routes Web Request/Response (`request: Request`) to handlers
 * exported as named HTTP methods (POST/GET/...). A `export default
 * function handler` gets a Node IncomingMessage instead, which crashes
 * on `request.headers.get`. Keep this as `export async function POST`.
 *
 * Reference: https://vercel.com/docs/functions/runtimes/node-js#web-standard-api
 */
export async function POST(request: Request): Promise<Response> {
  // Reject anything that is not a same-site browser POST. Curl, Postman, and
  // cross-origin pages all fail here; the contact form on this site sends an
  // Origin matching the allowlist below. CSRF-style cross-origin POSTs from
  // foreign pages also fail (their Origin will not match).
  const originHeader = request.headers.get('origin')
  if (!isAllowedOrigin(originHeader)) {
    return json({ error: 'Forbidden' }, 403)
  }

  // Require an explicit JSON content type so the request triggers a CORS
  // preflight when issued from any other origin (preflight has no allow
  // header set on this endpoint, so the browser blocks the actual POST).
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Unsupported content type' }, 415)
  }

  // Reject obviously oversized bodies before buffering them. This is best
  // effort — clients may omit Content-Length on chunked transfers, in which
  // case we rely on the post-parse length checks to cap individual fields.
  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large' }, 413)
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large' }, 413)
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ error: 'Invalid payload' }, 400)
  }

  const rawPayload = payload as Record<string, unknown>

  const parsed = ContactSchema.safeParse(payload)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return json({ error: first?.message ?? 'Invalid input.' }, 400)
  }

  const { company, name, email, topic, subject, message } = parsed.data

  if (!isStructurallyValidEmail(email)) {
    return json({ error: 'That email does not look right.' }, 400)
  }

  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  const metadata = { ipAddress, userAgent, origin: originHeader }

  // Honeypot: silently 200 so bots cannot tune around the trap. Still record
  // it for audit so we can see how often the trap fires.
  if (company && company.trim().length > 0) {
    await prisma.supportRequest.create({
      data: buildRequestRecord({
        ticketId: generateTicketId(),
        rawPayload,
        cleaned: parsed.data,
        metadata,
        status: 'honeypot',
      }),
    }).catch(() => undefined)
    return json({ ok: true })
  }

  // Rate-limit checks via count aggregate. Both queries are cheap with the
  // composite indexes on (email, createdAt) and (ipAddress, createdAt).
  const [emailCount, ipCount] = await Promise.all([
    countRecentByEmail(email),
    ipAddress ? countRecentByIp(ipAddress) : Promise.resolve(0),
  ])

  if (ipCount >= IP_RATE_MAX_HITS) {
    await prisma.supportRequest.create({
      data: buildRequestRecord({
        ticketId: generateTicketId(),
        rawPayload,
        cleaned: parsed.data,
        metadata,
        status: 'rate_limited_ip',
      }),
    }).catch(() => undefined)
    return json(
      { error: 'Too many messages from this connection. Please try again in a few minutes, or email us directly.' },
      429,
    )
  }

  if (emailCount >= EMAIL_RATE_MAX_HITS) {
    await prisma.supportRequest.create({
      data: buildRequestRecord({
        ticketId: generateTicketId(),
        rawPayload,
        cleaned: parsed.data,
        metadata,
        status: 'rate_limited_email',
      }),
    }).catch(() => undefined)
    return json(
      { error: 'This email address has reached its daily limit of support requests. Please try again tomorrow, or email us directly.' },
      429,
    )
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const INTERNAL_TO = process.env.CONTACT_INBOX_TO
  const PUBLIC_FROM = process.env.CONTACT_INBOX_FROM

  if (!RESEND_API_KEY || !INTERNAL_TO || !PUBLIC_FROM) {
    return json({ error: 'Contact endpoint is not configured. Please email us directly.' }, 503)
  }

  const ticketId = generateTicketId()

  // Persist the pending request first so a Resend failure does not lose the
  // submission — we can replay from the DB row.
  const record = await prisma.supportRequest.create({
    data: buildRequestRecord({
      ticketId,
      rawPayload,
      cleaned: parsed.data,
      metadata,
      status: 'pending',
    }),
  })

  const support = buildSupportEmail({ ticketId, name, email, topic, subject, message })
  const confirmation = buildConfirmationEmail(ticketId)

  // Resend batch endpoint sends both emails in one round trip. Each email's
  // recipient list is independent — the visitor never appears on the support
  // email and the internal address never appears on the confirmation. The
  // confirmation body interpolates only the server-generated ticket id; the
  // only visitor-derived value on the confirmation side is the `to:` envelope.
  const batchResponse = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([
      {
        from: PUBLIC_FROM,
        to: [INTERNAL_TO],
        reply_to: email,
        subject: support.subject,
        html: support.html,
        text: support.text,
      },
      {
        from: PUBLIC_FROM,
        to: [email],
        reply_to: PUBLIC_FROM,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
      },
    ]),
  })

  if (!batchResponse.ok) {
    await prisma.supportRequest
      .update({ where: { id: record.id }, data: { status: 'failed' } })
      .catch(() => undefined)
    return json(
      { error: 'We could not send your message right now. Please try again, or email us directly.' },
      502,
    )
  }

  // Resend returns 200 with `{ data: [{ id }, { id }] }` on success. A missing
  // entry means one half of the batch silently failed.
  const batch = (await batchResponse.json().catch(() => null)) as
    | { data?: Array<{ id?: string }> }
    | null
  const supportEmailId = batch?.data?.[0]?.id
  const confirmationEmailId = batch?.data?.[1]?.id
  if (!supportEmailId || !confirmationEmailId) {
    await prisma.supportRequest
      .update({
        where: { id: record.id },
        data: {
          status: 'failed',
          supportEmailId: supportEmailId ?? null,
          confirmationEmailId: confirmationEmailId ?? null,
        },
      })
      .catch(() => undefined)
    return json(
      { error: 'We could not send your message right now. Please try again, or email us directly.' },
      502,
    )
  }

  await prisma.supportRequest
    .update({
      where: { id: record.id },
      data: {
        status: 'sent',
        supportEmailId,
        confirmationEmailId,
      },
    })
    .catch(() => undefined)

  return json({ ok: true })
}
