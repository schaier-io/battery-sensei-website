/**
 * Double opt-in confirmation.
 *
 *   GET /api/newsletter/confirm?token=...   → 302 /newsletter/confirmed
 *
 * Idempotent: once `confirmedAt` is set on the local row we redirect
 * straight to the success page (and re-send a welcome only if the
 * caller looks like a fresh confirmation). The earlier "update then
 * recover via create" dance against Resend silently misreported
 * transient blips as errors — now Resend is treated as a side-channel
 * and the source of truth lives in Postgres.
 */
import { createFileRoute } from '@tanstack/react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { db } from '#/lib/db'
import { WelcomeEmail } from '#/lib/emails/WelcomeEmail'
import { welcomeEmailText } from '#/lib/emails/plaintext'
import { welcomeSubject } from '#/lib/emails/subjects'
import { createToken, verifyToken } from '#/lib/newsletter-token'
import {
  getResendClient,
  launchesAudienceId,
  normalizeLocale,
  releasesAudienceId,
  resendFrom,
  resendReplyTo,
  siteUrl,
} from '#/lib/resend'

const DOWNLOAD_PATH = '/#download'

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

async function handleGet(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const verified = verifyToken(token)

  if (!verified || verified.action !== 'confirm') {
    return redirect('/newsletter/confirmed?status=invalid')
  }

  const { email } = verified
  const locale = normalizeLocale(verified.locale)

  // Look up the local row first. If there's no row, the token signature
  // is valid but the address never went through /api/free-signup —
  // treat as invalid rather than leaking that detail.
  const row = await db.newsletterSignup
    .findUnique({ where: { email } })
    .catch(() => null)

  if (!row) {
    return redirect('/newsletter/confirmed?status=invalid')
  }

  // Epoch check — stale links from a prior subscription cycle.
  if (row.tokenEpoch !== verified.epoch) {
    return redirect('/newsletter/confirmed?status=invalid')
  }

  // Already confirmed → just redirect. No duplicate welcome.
  if (row.confirmedAt) {
    return redirect(`/newsletter/confirmed?locale=${locale}`)
  }

  // Mark confirmed locally BEFORE talking to Resend. If Resend is down,
  // a retry just re-tries the side effects without re-creating the
  // welcome storm.
  const confirmed = await db.newsletterSignup.update({
    where: { email },
    data: { confirmedAt: new Date(), unsubscribedAt: null, locale },
  })

  const resend = getResendClient()

  // Flip releases → subscribed.
  const releasesId = releasesAudienceId()
  if (releasesId) {
    try {
      await resend.contacts.update({
        audienceId: releasesId,
        email,
        unsubscribed: false,
      })
    } catch {
      // Contact missing — recreate already-subscribed.
      try {
        const created = await resend.contacts.create({
          audienceId: releasesId,
          email,
          unsubscribed: false,
          firstName: `src:confirm-recovery|lang:${locale}`,
        })
        const id = (created as { data?: { id?: string } } | undefined)
          ?.data?.id
        if (id && id !== confirmed.releasesContactId) {
          await db.newsletterSignup
            .update({
              where: { email },
              data: { releasesContactId: id },
            })
            .catch(() => {})
        }
      } catch (err) {
        console.error('[newsletter] releases recovery failed', err)
      }
    }
  }

  // Add to launches (cross-app announcements). Best-effort.
  const launchesId = launchesAudienceId()
  if (launchesId) {
    try {
      const created = await resend.contacts.create({
        audienceId: launchesId,
        email,
        unsubscribed: false,
        firstName: `src:confirm|lang:${locale}`,
      })
      const id = (created as { data?: { id?: string } } | undefined)
        ?.data?.id
      if (id && id !== confirmed.launchesContactId) {
        await db.newsletterSignup
          .update({
            where: { email },
            data: { launchesContactId: id },
          })
          .catch(() => {})
      }
    } catch (err) {
      console.error('[newsletter] launches add failed', err)
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

  const html = renderToStaticMarkup(
    createElement(WelcomeEmail, {
      downloadUrl,
      unsubscribeUrl,
      locale,
      siteUrl: siteUrl(),
    }),
  )

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
  return redirect(`/newsletter/confirmed?locale=${locale}${status}`)
}

export const Route = createFileRoute('/api/newsletter/confirm')({
  server: {
    handlers: {
      GET: ({ request }) => handleGet(request),
    },
  },
})
