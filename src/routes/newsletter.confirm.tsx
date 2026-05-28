/**
 * Pre-confirm click-through page.
 *
 *   /newsletter/confirm?token=...
 *
 * Reached when the user clicks the "Confirm subscription" link in the
 * confirmation email. GET /api/newsletter/confirm just redirects here
 * without doing anything — so inbox link-preview crawlers (Outlook
 * Safelinks, Gmail proxy, antivirus scanners, social unfurlers,
 * headless browser previews) can NOT silently confirm the address on
 * the visitor's behalf.
 *
 * The visitor confirms by clicking the button, which POSTs to the same
 * API endpoint. The POST returns a JSON `{ ok, redirectTo }` payload
 * that the page navigates to next.
 *
 * Layout mirrors the unsubscribe pre-click page so both opt-in/out
 * moments look like the same visual gesture.
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  token?: string
}

export const Route = createFileRoute('/newsletter/confirm')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    // Lightweight client-side validation. The server still does the
    // strict zod regex check + HMAC verify on POST — this just keeps
    // garbage out of the form state.
    token:
      typeof s.token === 'string' &&
      s.token.length >= 20 &&
      s.token.length <= 2048 &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s.token)
        ? s.token
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Confirm subscription — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ConfirmPage,
})

type FormState =
  | 'idle'
  | 'submitting'
  | 'error'
  | 'missing-token'

function ConfirmPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [state, setState] = useState<FormState>(
    typeof token === 'string' && token ? 'idle' : 'missing-token',
  )

  const hasToken = typeof token === 'string' && token.length > 0

  async function onConfirm() {
    if (!hasToken || state === 'submitting') return
    setState('submitting')
    try {
      const res = await fetch(
        `/api/newsletter/confirm?token=${encodeURIComponent(token!)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        },
      )
      if (!res.ok) {
        setState('error')
        return
      }
      // Parse the navigation target out of the response. Falling back
      // to the generic success page keeps us correct if the response
      // body is ever malformed for some upstream reason.
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean
        redirectTo?: string
      } | null
      const redirectTo =
        typeof body?.redirectTo === 'string' && body.redirectTo.startsWith('/')
          ? body.redirectTo
          : '/newsletter/confirmed'
      navigate({ to: redirectTo })
    } catch {
      setState('error')
    }
  }

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Link
            to="/"
            className="group zen-link-lift mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] text-sumi-soft hover:text-sumi"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
              strokeWidth={1.8}
              aria-hidden
            />
            {t('thanks.backToHome')}
          </Link>
          <div className="flex flex-col items-center text-center">
            {/* 印 = "seal / stamp / confirm" — quiet visual handshake
                for the moment-of-opt-in before the heavier 了 stamp on
                the post-confirm success page. */}
            <Hanko kanji="印" className="mb-6" />
            <Reveal
              as="h1"
              delay={140}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('newsletter.confirm.heading')}
            </Reveal>
            <Reveal
              as="p"
              delay={220}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('newsletter.confirm.body')}
            </Reveal>
            <Reveal as="div" delay={300} className="mt-10 w-full max-w-sm">
              {/* Status banner above the button. Fixed-height slot so
                  the layout doesn't jump when the message swaps. */}
              <div className="mb-3 min-h-[1.25rem] text-center" aria-live="polite">
                {state === 'error' && (
                  <p className="text-[0.8125rem] font-medium text-hinomaru">
                    {t('newsletter.confirm.error')}
                  </p>
                )}
                {state === 'missing-token' && (
                  <p className="text-[0.8125rem] text-sumi-soft">
                    {t('newsletter.confirm.missingToken')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!hasToken || state === 'submitting'}
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sumi px-4 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check
                  className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-110"
                  strokeWidth={2}
                  aria-hidden
                />
                {state === 'submitting'
                  ? t('newsletter.confirm.submitting')
                  : t('newsletter.confirm.cta')}
              </button>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
