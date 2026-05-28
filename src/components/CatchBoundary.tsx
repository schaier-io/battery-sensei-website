import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

type ShellProps = {
  kanji: string
  kicker: string
  title: string
  italic: string
  body: string
  detail?: string
  primary?: { label: string; onClick?: () => void; to?: string }
  suggestions?: { label: string; hint: string; to: string; hash?: string }[]
}

function Shell({
  kanji,
  kicker,
  title,
  italic,
  body,
  detail,
  primary,
  suggestions,
}: ShellProps) {
  const { t } = useTranslation()
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('thanks.backToHome')}
            </Link>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji={kanji} className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {kicker}
            </Reveal>
            <Reveal
              as="h1"
              delay={200}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {title}
              <span className="block italic text-sumi-soft font-normal">
                {italic}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={280}
              className="mt-6 max-w-prose text-base leading-relaxed text-sumi-soft"
            >
              {body}
            </Reveal>
            {detail && (
              <Reveal
                as="pre"
                delay={340}
                className="mt-4 max-w-full overflow-x-auto rounded border border-sumi/10 bg-sumi/5 px-3 py-2 text-[12px] text-sumi-soft"
              >
                {detail}
              </Reveal>
            )}
            {primary && (
              <Reveal delay={400} className="mt-8">
                {primary.to ? (
                  <Link
                    to={primary.to}
                    className="inline-flex items-center gap-2 rounded-full bg-sumi px-5 py-2.5 text-sm font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
                  >
                    {primary.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={primary.onClick}
                    className="inline-flex items-center gap-2 rounded-full bg-sumi px-5 py-2.5 text-sm font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
                  >
                    {primary.label}
                  </button>
                )}
              </Reveal>
            )}

            {suggestions && suggestions.length > 0 && (
              <Reveal delay={460} className="mt-14 w-full">
                <p className="mb-5 text-[11px] uppercase tracking-[0.24em] text-nezumi">
                  <span className="mr-3 inline-block h-px w-6 translate-y-[-3px] bg-nezumi/50 align-middle" />
                  Try one of these
                </p>
                <ul className="grid gap-px overflow-hidden rounded-lg border border-sumi/10 bg-sumi/10 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <li key={s.to + (s.hash ?? '')} className="bg-washi">
                      <Link
                        to={s.to}
                        hash={s.hash}
                        className="flex flex-col px-5 py-4 transition-colors duration-[220ms] hover:bg-washi-soft"
                      >
                        <span className="text-base font-medium text-sumi">
                          {s.label}
                        </span>
                        <span className="mt-0.5 text-[13px] leading-snug text-sumi-soft">
                          {s.hint}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  // Surface the message in dev; in prod we still show it (small indie app,
  // visitors emailing us the text helps triage faster than a generic page).
  const detail =
    error instanceof Error && error.message ? error.message : undefined
  return (
    <Shell
      kanji="禅"
      kicker="Something broke · 失礼"
      title="The page tripped."
      italic="A breath, then try again."
      body="An unexpected error stopped this page from rendering. If it keeps happening, write to info@battery-sensei.app with what you were doing and we'll fix it fast."
      detail={detail}
      primary={{ label: 'Try again', onClick: () => reset() }}
    />
  )
}

export function RouteNotFound() {
  return (
    <Shell
      kanji="無"
      kicker="404 · 迷子"
      title="Nothing lives here."
      italic="The page you wanted is elsewhere."
      body="The link may be stale, or we moved the page. Head back to the homepage — or pick up one of the trails below."
      suggestions={[
        {
          label: 'Features',
          hint: 'Charge limit, alerts, Travel Mode',
          to: '/',
          hash: 'features',
        },
        {
          label: 'Journal',
          hint: 'Notes on MacBook batteries, longevity, macOS',
          to: '/blog',
        },
        {
          label: 'FAQ',
          hint: 'How Sensei works, in plain English',
          to: '/',
          hash: 'faq',
        },
        {
          label: 'Privacy',
          hint: 'What we collect — and what we don’t',
          to: '/privacy',
        },
      ]}
    />
  )
}
