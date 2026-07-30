import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { ArrowLeft, ArrowRight } from 'lucide-react'
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
  suggestionsLabel?: string
  suggestions?: { label: string; hint: string; to: string; hash?: string }[]
}

/**
 * `t` with an English fallback baked in.
 *
 * RouteNotFound is not only the router's notFoundComponent — it is also
 * the component behind the prerendered /404 shell copied to
 * `dist/client/404.html`, which Vercel serves for URLs the router never
 * sees. If that shell is ever rendered without the i18n instance the app
 * normally initializes, react-i18next hands back a `t` that echoes the
 * key it was given. Falling back keeps the page in readable English
 * instead of printing "errors.notFound.heading" at a lost visitor.
 */
function useCopy() {
  const { t } = useTranslation()
  return (key: string, fallback: string): string => {
    const value = t(key, fallback)
    return typeof value === 'string' && value !== key ? value : fallback
  }
}

function Shell({
  kanji,
  kicker,
  title,
  italic,
  body,
  detail,
  primary,
  suggestionsLabel,
  suggestions,
}: ShellProps) {
  const copy = useCopy()
  return (
    <>
      <Nav />
      <main>
        <Reveal as="div" delay={80} className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          <HomeLink
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
            {copy('thanks.backToHome', 'Back to homepage')}
          </HomeLink>
        </Reveal>
        <section className="zen-section mx-auto max-w-3xl px-5 pt-8 sm:px-6 md:pt-10">

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
                  {suggestionsLabel}
                </p>
                <ul className="grid gap-px overflow-hidden rounded-lg border border-sumi/10 bg-sumi/10 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <li key={s.to + (s.hash ?? '')} className="bg-washi">
                      {/* Trailing arrow, same idiom as the glossary and
                          journal indexes. Without it the grid reads as a
                          spec table: bold term, grey definition, no hint
                          that a cell goes anywhere. */}
                      <Link
                        to={s.to}
                        hash={s.hash}
                        className="group/trail flex items-start gap-4 px-5 py-4 transition-colors duration-[220ms] hover:bg-washi-soft"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-medium text-sumi transition-colors group-hover/trail:text-hinomaru-ink">
                            {s.label}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-sumi-soft">
                            {s.hint}
                          </span>
                        </span>
                        <ArrowRight
                          className="mt-1 h-4 w-4 shrink-0 text-nezumi transition-[transform,color] duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/trail:translate-x-0.5 group-hover/trail:text-hinomaru-ink"
                          strokeWidth={1.6}
                          aria-hidden
                        />
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
  const copy = useCopy()
  // Surface the message in dev; in prod we still show it (small indie app,
  // visitors emailing us the text helps triage faster than a generic page).
  const detail =
    error instanceof Error && error.message ? error.message : undefined
  return (
    <Shell
      kanji="禅"
      kicker={copy('errors.boundary.kicker', 'Something broke · 失礼')}
      title={copy('errors.boundary.heading', 'The page tripped.')}
      italic={copy('errors.boundary.headingItalic', 'A breath, then try again.')}
      body={copy(
        'errors.boundary.body',
        "An unexpected error stopped this page from rendering. If it keeps happening, write to info@battery-sensei.app with what you were doing and we'll fix it fast.",
      )}
      detail={detail}
      primary={{
        label: copy('errors.boundary.retry', 'Try again'),
        onClick: () => reset(),
      }}
    />
  )
}

export function RouteNotFound() {
  const copy = useCopy()
  return (
    <Shell
      kanji="無"
      kicker={copy('errors.notFound.kicker', '404 · 迷子')}
      title={copy('errors.notFound.heading', 'Nothing lives here.')}
      italic={copy(
        'errors.notFound.headingItalic',
        'The page you wanted is elsewhere.',
      )}
      body={copy(
        'errors.notFound.body',
        'The link may be stale, or we moved the page. Head back to the homepage. Or pick up one of the trails below.',
      )}
      suggestionsLabel={copy(
        'errors.notFound.suggestionsLabel',
        'Try one of these',
      )}
      suggestions={[
        {
          label: copy('errors.notFound.trails.features.label', 'Features'),
          hint: copy(
            'errors.notFound.trails.features.hint',
            'Every panel and automation, one page each',
          ),
          to: '/features',
        },
        {
          label: copy('errors.notFound.trails.guides.label', 'Guides'),
          hint: copy(
            'errors.notFound.trails.guides.hint',
            'Notes on MacBook batteries, longevity, macOS',
          ),
          to: '/guides',
        },
        {
          label: copy('errors.notFound.trails.faq.label', 'FAQ'),
          hint: copy(
            'errors.notFound.trails.faq.hint',
            'How Sensei works, in plain English',
          ),
          to: '/',
          hash: 'faq',
        },
        {
          label: copy('errors.notFound.trails.glossary.label', 'Glossary'),
          hint: copy(
            'errors.notFound.trails.glossary.hint',
            'Battery terms, minus the jargon',
          ),
          to: '/glossary',
        },
      ]}
    />
  )
}
