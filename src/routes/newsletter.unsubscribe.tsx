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
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
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
    token: typeof s.token === 'string' ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Unsubscribe — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)

  const hasToken = typeof token === 'string' && token.length > 0

  async function onConfirm() {
    if (!hasToken || submitting) return
    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch(
        `/api/newsletter/unsubscribe?token=${encodeURIComponent(token!)}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        setError(true)
        setSubmitting(false)
        return
      }
      navigate({ to: '/newsletter/unsubscribed' })
    } catch {
      setError(true)
      setSubmitting(false)
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
            {/* 別 = "parting / farewell" for the pre-click confirm. */}
            <Hanko kanji="別" className="mb-6" />
            <Reveal
              as="h1"
              delay={140}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('newsletter.unsubscribe.heading')}
            </Reveal>
            <Reveal
              as="p"
              delay={220}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('newsletter.unsubscribe.body')}
            </Reveal>
            <Reveal as="div" delay={300} className="mt-10">
              <button
                type="button"
                onClick={onConfirm}
                disabled={!hasToken || submitting}
                className="inline-flex items-center gap-2 rounded-full bg-sumi px-5 py-2.5 text-sm font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? t('newsletter.unsubscribe.submitting')
                  : t('newsletter.unsubscribe.cta')}
              </button>
            </Reveal>
            {error && (
              <p
                className="mt-4 text-sm text-hinomaru"
                role="alert"
                aria-live="polite"
              >
                {t('newsletter.unsubscribe.error')}
              </p>
            )}
            {!hasToken && (
              <Reveal
                as="p"
                delay={360}
                className="mt-4 text-sm text-sumi-soft"
              >
                {t('newsletter.unsubscribe.missingToken')}
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
