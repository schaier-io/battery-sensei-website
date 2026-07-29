/**
 * Email builders for the feature-request board, in the same inline-HTML
 * washi style as api/contact.ts (own private shell — most clients strip
 * <style>, so everything is inline).
 *
 * Escaping contract: EVERY submitter-derived value (title, body, name,
 * email, rejection reason) passes through escapeHtml before it touches
 * markup, and is rendered as inert quoted content — never as
 * instructions. The confirmation email interpolates only the
 * server-generated ticket id.
 */
import { siteUrl } from '../resend.js'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/[\r\n]/g, ' ')
}

function multiline(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br />')
}

export type BuiltEmail = { subject: string; html: string; text: string }

function emailShell({ preheader, bodyHtml }: { preheader: string; bodyHtml: string }): string {
  const SITE = siteUrl()
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
                Sent by the feature board on <a href="${SITE}" style="color:#8a847c;text-decoration:underline;">battery-sensei.app</a>. Quiet power for your MacBook.
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

function badgeRow(kanji: string, label: string, ticketId: string): string {
  return `
          <tr>
            <td style="padding:24px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(188,0,45,0.08);color:#bc002d;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;padding:5px 9px;border-radius:3px;">
                      <span style="font-size:13px;font-weight:700;margin-right:6px;vertical-align:-1px;">${kanji}</span>${escapeHtml(label)}
                    </span>
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12px;color:#8a847c;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
                    ${escapeHtml(ticketId)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}

/**
 * Internal notification for a new submission. All submitter content is
 * escaped and framed as a quoted record; the only actionable elements
 * are server-generated (the dashboard link and the reply mailto).
 */
export function buildFeatureAdminNotifyEmail({
  ticketId,
  title,
  body,
  email,
  name,
  source,
  locale,
}: {
  ticketId: string
  title: string
  body: string
  email: string
  name: string
  source: string
  locale: string
}): BuiltEmail {
  const SITE = siteUrl()
  const safeTitle = escapeHtml(title)
  const safeBody = multiline(body)
  const safeEmail = escapeHtml(email)
  const safeEmailAttr = escapeAttr(email)
  const safeName = escapeHtml(name || email)
  const meta = escapeHtml(`${source} · ${locale}`)

  const bodyHtml = `${badgeRow('芽', 'Feature request', ticketId)}
          <tr>
            <td style="padding:14px 32px 4px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;font-weight:500;color:#1c1a17;letter-spacing:-0.012em;">
                ${safeTitle}
              </h1>
              <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8a847c;">${meta}</p>
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
                ${safeBody}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#1c1a17" style="border-radius:6px;">
                    <a href="${SITE}/admin" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#f4ede0;text-decoration:none;letter-spacing:0.01em;">
                      Review in dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:12px;color:#8a847c;">Approve or reject it from the board dashboard. Replying emails ${safeEmail}.</p>
            </td>
          </tr>`

  return {
    // Belt on top of the schema's single-line rule: a Subject header
    // must never carry line breaks, whatever the caller passed.
    subject: `[Feature board] ${ticketId} ${title.replace(/[\r\n\t]+/g, ' ')}`,
    html: emailShell({ preheader: `New feature request from ${email}`, bodyHtml }),
    text: [
      'Battery Sensei · feature board',
      `Ticket:  ${ticketId}`,
      '---------------------------------------------',
      `Title:   ${title}`,
      `From:    ${name || email} <${email}>`,
      `Source:  ${source} · ${locale}`,
      '',
      body,
      '',
      '---------------------------------------------',
      `Review: ${SITE}/admin`,
    ].join('\n'),
  }
}

/**
 * Submitter confirmation. Interpolates ONLY the server-generated ticket
 * id — no submitter input is rendered; their address is used solely as
 * the envelope recipient by the caller.
 */
export function buildFeatureConfirmationEmail(ticketId: string): BuiltEmail {
  const SITE = siteUrl()
  const safeTicket = escapeHtml(ticketId)
  const bodyHtml = `${badgeRow('承', 'Received', ticketId)}
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:500;color:#1c1a17;letter-spacing:-0.012em;">
                Your idea landed.
              </h1>
              <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#bc002d;letter-spacing:0.08em;">承りました。</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1c1a17;">
                Every request is read and reviewed by hand before it appears on the public board. If it's approved, you'll get a note — and it becomes votable at <a href="${SITE}/roadmap" style="color:#1c1a17;text-decoration:underline;">battery-sensei.app/roadmap</a>.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#4a4540;">
                Reference: <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#1c1a17;">${safeTicket}</span>
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

  return {
    subject: `Your feature request landed · ${ticketId} · Battery Sensei`,
    html: emailShell({ preheader: `Your idea landed. Reference ${ticketId}.`, bodyHtml }),
    text: [
      'Your idea landed.',
      '承りました。',
      '',
      `Reference: ${ticketId}`,
      '',
      'Every request is read and reviewed by hand before it appears on the',
      'public board. If it is approved, you will get a note — and it becomes',
      `votable at ${SITE}/roadmap.`,
      '',
      '— Battery Sensei',
    ].join('\n'),
  }
}

/** Decision email: approved. Interpolates the (escaped) public title. */
export function buildFeatureApprovedEmail({
  ticketId,
  publicTitle,
}: {
  ticketId: string
  publicTitle: string
}): BuiltEmail {
  const SITE = siteUrl()
  const safeTitle = escapeHtml(publicTitle)
  const bodyHtml = `${badgeRow('開', 'Approved', ticketId)}
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:500;color:#1c1a17;letter-spacing:-0.012em;">
                It's on the board.
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1c1a17;">
                Your request <strong>&ldquo;${safeTitle}&rdquo;</strong> was approved and is now public. Other Battery Sensei users can vote on it — the most-wanted ideas guide what gets built next.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#1c1a17" style="border-radius:6px;">
                    <a href="${SITE}/roadmap" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#f4ede0;text-decoration:none;letter-spacing:0.01em;">
                      See it on the roadmap →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 4px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#4a4540;">
                — Battery Sensei
              </p>
            </td>
          </tr>`

  return {
    subject: `Your feature request is live · ${ticketId} · Battery Sensei`,
    html: emailShell({ preheader: 'Your request was approved and is now on the board.', bodyHtml }),
    text: [
      "It's on the board.",
      '',
      `Your request "${publicTitle}" was approved and is now public.`,
      'Other Battery Sensei users can vote on it — the most-wanted ideas',
      'guide what gets built next.',
      '',
      `Roadmap: ${SITE}/roadmap`,
      `Reference: ${ticketId}`,
      '',
      '— Battery Sensei',
    ].join('\n'),
  }
}

/** Decision email: rejected. Interpolates the (escaped) reason. */
export function buildFeatureRejectedEmail({
  ticketId,
  reason,
}: {
  ticketId: string
  reason: string
}): BuiltEmail {
  const SITE = siteUrl()
  const safeReason = multiline(reason)
  const bodyHtml = `${badgeRow('結', 'Decision', ticketId)}
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:500;color:#1c1a17;letter-spacing:-0.012em;">
                About your feature request
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1c1a17;">
                Thank you for taking the time to write in — every request is read carefully. This one won't go on the public board, and here's the honest why:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.5);border:1px solid rgba(28,26,23,0.10);border-radius:5px;">
                <tr>
                  <td style="padding:12px 14px;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:#1c1a17;">
                      ${safeReason}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#4a4540;">
                Disagree, or want to talk it through? Reply via <a href="${SITE}/#contact" style="color:#1c1a17;text-decoration:underline;">the contact form</a> — a real person answers.
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

  return {
    subject: `About your feature request · ${ticketId} · Battery Sensei`,
    html: emailShell({ preheader: 'A decision on your feature request.', bodyHtml }),
    text: [
      'About your feature request',
      '',
      'Thank you for taking the time to write in — every request is read',
      "carefully. This one won't go on the public board, and here's the",
      'honest why:',
      '',
      reason,
      '',
      `Reference: ${ticketId}`,
      `Contact: ${SITE}/#contact`,
      '',
      '— Battery Sensei',
    ].join('\n'),
  }
}
