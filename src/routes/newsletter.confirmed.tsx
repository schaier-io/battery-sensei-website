/**
 * Landing page shown after the user clicks the double-opt-in link.
 *
 * Status variants:
 *   - default → "You're confirmed" success, with a direct download button
 *   - invalid → token bad/expired; inline resend form (pre-filled with the
 *               email decoded from the expired token)
 *   - error   → upstream failed (offer to contact support)
 *
 * Layout follows the post-action "moment" pattern established by
 * /thanks/lifetime and /thanks/support — centered hero with hanko,
 * back-to-home anchor at top-left, max-w-3xl section.
 */
import { createFileRoute } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { ArrowLeft, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { MacOnlyConfirm } from '#/components/MacOnlyConfirm'
import { NewsletterResendForm } from '#/components/NewsletterResendForm'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  status?: 'invalid' | 'error'
  locale?: string
  email?: string
}

export const Route = createFileRoute('/newsletter/confirmed')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status:
      s.status === 'invalid' || s.status === 'error'
        ? (s.status as Search['status'])
        : undefined,
    locale: typeof s.locale === 'string' ? s.locale : undefined,
    // Pre-fill the resend form when the confirm endpoint recovers an
    // email from an expired-but-signed token. Lightly sanitize: cap
    // length and drop anything obviously non-email-ish so a malformed
    // search param can't poke at the input value.
    email:
      typeof s.email === 'string' &&
      s.email.length > 0 &&
      s.email.length <= 254 &&
      s.email.includes('@')
        ? s.email
        : undefined,
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
  const { t, i18n } = useTranslation()
  const { status, email: prefillEmail } = Route.useSearch()

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

  const kanji = isError ? '？' : '了'

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
            {status === 'invalid' && (
              <Reveal as="div" delay={300} className="mt-10 w-full max-w-sm">
                <NewsletterResendForm
                  currentLocale={i18n.language}
                  prefillEmail={prefillEmail}
                />
              </Reveal>
            )}
            {/* Direct download. The user just confirmed, so skip the email
                form and link straight to the .pkg (/download/latest → latest
                GitHub release, via vercel.json).

                Confirmation links are opened on phones as often as on the
                Mac, so the click goes through MacOnlyConfirm: a non-Mac
                visitor is told what the file is before a macOS installer
                starts downloading. The note below points them at the copy
                of the link sitting in their inbox. */}
            {!isError && (
              <Reveal
                as="div"
                delay={300}
                className="mt-8 flex flex-col items-center gap-3"
              >
                <MacOnlyConfirm
                  onConfirm={() => window.location.assign('/download/latest')}
                >
                  {({ onClick }) => (
                    <a
                      href="/download/latest"
                      onClick={onClick}
                      className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sumi px-5 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
                    >
                      <Download
                        className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                      {t('common.downloadMac')}
                    </a>
                  )}
                </MacOnlyConfirm>
                <p className="max-w-sm text-[0.8125rem] leading-relaxed text-nezumi">
                  {t('newsletter.confirmed.success.downloadNote')}
                </p>
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
