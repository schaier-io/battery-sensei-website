/**
 * Pre-unsubscribe confirm page.
 *
 *   /newsletter/unsubscribe?token=...
 *
 * Reached when the user clicks the unsubscribe link in any newsletter
 * email. GET /api/newsletter/unsubscribe redirects here without doing
 * anything — so mail-client link prefetching can't silently opt
 * someone out. The user has to click the "Unsubscribe" button, which
 * POSTs to the API and then navigates to /newsletter/unsubscribed.
 *
 * RFC 8058 one-click (POST from Gmail/Yahoo inbox UI) hits the API
 * directly and never lands here.
 *
 * Status banner above the button sits in a fixed-height slot so the
 * layout doesn't jump between idle / submitting / error states.
 *
 * When the link carries nothing usable there is no one-click opt-out to
 * offer, so the page hands over the one the privacy notice already
 * promises: write to us and we take you off by hand. A working control,
 * not a greyed-out one — its sibling /newsletter/confirm resolves the
 * same broken-link case the same way.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { AlertCircle, ArrowLeft, Mail, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  token?: string
}

export const Route = createFileRoute('/newsletter/unsubscribe')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    // Client-side shape sniff only — the API still does the strict zod
    // regex + HMAC verify on POST. Keeps obviously-malformed tokens out
    // of the form state without forking validation logic.
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
      { title: 'Unsubscribe — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: UnsubscribePage,
})

type State = 'idle' | 'submitting' | 'error' | 'missing-token'

/** Opt-out address the privacy notice advertises. Same inbox the rest
 *  of the site writes to; kept here as a constant so the mailto and the
 *  visible address in the body copy can never drift apart. */
const SUPPORT_EMAIL = 'info@battery-sensei.app'

function UnsubscribePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const hasToken = typeof token === 'string' && token.length > 0
  const [state, setState] = useState<State>(hasToken ? 'idle' : 'missing-token')
  const linkBroken = state === 'missing-token'

  async function onConfirm() {
    if (!hasToken || state === 'submitting') return
    setState('submitting')
    try {
      const res = await fetch(
        `/api/newsletter/unsubscribe?token=${encodeURIComponent(token!)}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        setState('error')
        return
      }
      navigate({ to: '/newsletter/unsubscribed' })
    } catch {
      setState('error')
    }
  }

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <HomeLink
            className="group zen-link-lift mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] text-sumi-soft hover:text-sumi"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
              strokeWidth={1.8}
              aria-hidden
            />
            {t('thanks.backToHome')}
          </HomeLink>
          <div className="flex flex-col items-center text-center">
            {/* 別 = "parting / farewell" for the pre-click confirm. ？
                takes over for the broken link, matching the same seal on
                /newsletter/confirm and /newsletter/confirmed. */}
            <Hanko kanji={linkBroken ? '？' : '別'} className="mb-6" />
            <Reveal
              as="h1"
              delay={140}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {linkBroken
                ? t('newsletter.unsubscribe.missing.heading')
                : t('newsletter.unsubscribe.heading')}
            </Reveal>
            <Reveal
              as="p"
              delay={220}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {linkBroken
                ? t('newsletter.unsubscribe.missing.body', {
                    email: SUPPORT_EMAIL,
                  })
                : t('newsletter.unsubscribe.body')}
            </Reveal>
            <Reveal as="div" delay={300} className="mt-10 w-full max-w-sm">
              {linkBroken ? (
                // Same geometry as the Unsubscribe button it replaces, so
                // the opt-out still looks like the page's main act.
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Unsubscribe`}
                  className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sumi px-4 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
                >
                  <Mail
                    className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {t('newsletter.unsubscribe.missing.cta')}
                </a>
              ) : (
                <>
                  {/* Fixed-height status slot above the button. Reserved
                      even when empty so the layout never jumps when the
                      error banner appears. */}
                  <div
                    className="mb-3 min-h-[1.5rem] text-center text-[0.8125rem] leading-snug"
                    aria-live="polite"
                    role={state === 'error' ? 'alert' : undefined}
                  >
                    {state === 'error' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-hinomaru-ink">
                        <AlertCircle
                          className="h-4 w-4 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                        />
                        {t('newsletter.unsubscribe.error')}{' '}
                        <span className="font-normal text-hinomaru-ink/85">
                          {t('newsletter.unsubscribe.tryAgain')}
                        </span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={!hasToken || state === 'submitting'}
                    className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sumi px-4 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserMinus
                      className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-x-0.5"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    {state === 'submitting'
                      ? t('newsletter.unsubscribe.submitting')
                      : t('newsletter.unsubscribe.cta')}
                  </button>
                </>
              )}
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
