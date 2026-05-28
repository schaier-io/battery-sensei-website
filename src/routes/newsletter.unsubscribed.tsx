/**
 * Landing page shown after a one-click unsubscribe.
 *
 * Status variants:
 *   - default → "You've been removed"
 *   - invalid → token bad/expired (but we still show a soft success
 *     to avoid leaking membership)
 *
 * Layout matches /newsletter/confirmed and /thanks/* — centered hero,
 * back-to-home anchor top-left, max-w-3xl section. Offers a single
 * "Subscribe again" CTA back to the homepage signup so visitors who
 * change their mind don't have to dig for the form.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  status?: 'invalid'
}

export const Route = createFileRoute('/newsletter/unsubscribed')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: s.status === 'invalid' ? 'invalid' : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Unsubscribed — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: UnsubscribedPage,
})

function UnsubscribedPage() {
  const { t } = useTranslation()

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
            {/* 静 = "quiet / stillness" — matches the "off the list,
                quietly" tone of the copy. */}
            <Hanko kanji="静" className="mb-6" />
            <Reveal
              as="h1"
              delay={140}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('newsletter.unsubscribed.heading')}
            </Reveal>
            <Reveal
              as="p"
              delay={220}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('newsletter.unsubscribed.body')}
            </Reveal>
            {/* Subscribe-again CTA. Routes to the homepage Free
                signup section — `#free-download-email` is the same
                anchor the homepage hash-handler uses to focus the
                input on landing. Mail icon mirrors the resend/confirm
                family of buttons so the visual language is consistent
                across opt-in surfaces. */}
            <Reveal as="div" delay={300} className="mt-10">
              <Link
                to="/"
                hash="free-download-email"
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sumi px-5 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
              >
                <Mail
                  className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                  strokeWidth={1.8}
                  aria-hidden
                />
                {t('newsletter.unsubscribed.subscribeAgain')}
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
