/**
 * Landing page shown after the user clicks the double-opt-in link.
 *
 * Status variants:
 *   - default        → "You're confirmed" success
 *   - welcome-failed → same success copy; only the welcome mail failed
 *   - invalid        → token bad/expired (offer to re-subscribe)
 *   - error          → upstream failed (offer to contact support)
 *
 * Layout follows the post-action "moment" pattern established by
 * /thanks/lifetime and /thanks/support — centered hero with hanko,
 * back-to-home anchor at top-left, max-w-3xl section. Stays visually
 * coherent with the rest of the site's confirmation pages.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  status?: 'invalid' | 'error' | 'welcome-failed'
  locale?: string
}

export const Route = createFileRoute('/newsletter/confirmed')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status:
      s.status === 'invalid' ||
      s.status === 'error' ||
      s.status === 'welcome-failed'
        ? (s.status as Search['status'])
        : undefined,
    locale: typeof s.locale === 'string' ? s.locale : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Confirmed — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ConfirmedPage,
})

function ConfirmedPage() {
  const { t } = useTranslation()
  const { status } = Route.useSearch()

  // welcome-failed renders as success — the confirmation itself worked;
  // only the welcome email didn't send. Standard success copy already
  // points to the download, so no extra i18n key is needed.
  const isError = status === 'invalid' || status === 'error'

  const heading =
    status === 'invalid'
      ? t('newsletter.confirmed.invalid.heading')
      : status === 'error'
        ? t('newsletter.confirmed.error.heading')
        : t('newsletter.confirmed.success.heading')

  const body =
    status === 'invalid'
      ? t('newsletter.confirmed.invalid.body')
      : status === 'error'
        ? t('newsletter.confirmed.error.body')
        : t('newsletter.confirmed.success.body')

  // 了 = "completed / done" for the success moment.
  // ？ for the error variants — a quiet question mark, not an alarm.
  const kanji = isError ? '？' : '了'

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          {/* Top-left back-to-home anchor — same quiet escape hatch
              used on /thanks/* pages. Reuses `thanks.backToHome` so
              we don't fork the same string across two key trees. */}
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
            <Hanko kanji={kanji} className="mb-6" />
            <Reveal
              as="h1"
              delay={140}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {heading}
            </Reveal>
            <Reveal
              as="p"
              delay={220}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {body}
            </Reveal>
            {/* No bottom CTA — the top-left back-to-home anchor already
                covers the escape. A duplicated button below would just
                add noise. */}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
