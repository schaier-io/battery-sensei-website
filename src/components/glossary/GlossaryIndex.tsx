import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { GLOSSARY_TERMS, type GlossaryTerm } from '#/data/glossary/terms'

/** Reading order for the index: the health questions people arrive with,
 * then how charging works, then the two smaller clusters. */
const CATEGORY_ORDER = ['health', 'charging', 'thermal', 'app-feature'] as const

const CATEGORY_LABELS: Record<GlossaryTerm['category'], string> = {
  health: 'Battery health',
  charging: 'Charging',
  thermal: 'Heat and throttling',
  'app-feature': 'In the app',
}

/** Twelve entries in raw array order read as one undifferentiated wall.
 * Grouping is derived from the `category` each term already carries, so a
 * new term lands in the right place the moment it is written. Computed
 * once at module scope — the source array is static. */
const GROUPED_TERMS = CATEGORY_ORDER.map((category) => ({
  category,
  terms: GLOSSARY_TERMS.filter((term) => term.category === category),
})).filter((group) => group.terms.length > 0)

export function GlossaryIndex() {
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex flex-col items-start">
            <Hanko kanji="辞" className="mb-6" />
            <Reveal as="p" delay={120} className="kicker-row mb-4">
              Glossary · 用語
            </Reveal>
            <Reveal
              as="h1"
              delay={200}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              Battery vocabulary.
              <span className="block italic text-sumi-soft font-normal">
                In plain English, with sources.
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={300}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              Short definitions for the terms that come up when you’re trying to
              understand a MacBook battery: what they mean, what Apple actually
              says about them, and how Battery Sensei handles each one. Use the
              list as a reference, or read it end-to-end in fifteen minutes.
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-2 pt-10 sm:px-6 md:pt-14">
          <Reveal delay={380} className="space-y-9">
            {GROUPED_TERMS.map((group) => (
              <section key={group.category} aria-labelledby={`cat-${group.category}`}>
                <h2
                  id={`cat-${group.category}`}
                  className="meta-label mb-2.5 text-nezumi"
                >
                  {CATEGORY_LABELS[group.category]}
                </h2>
                <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                  {group.terms.map((term) => (
                    <li key={term.slug}>
                      <Link
                        to="/glossary/$slug"
                        params={{ slug: term.slug }}
                        className="group/term flex items-baseline gap-5 py-5 transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-washi-soft/40"
                      >
                        <BookOpen
                          className="mt-1 h-3.5 w-3.5 shrink-0 self-start text-nezumi transition-colors group-hover/term:text-hinomaru-ink"
                          strokeWidth={1.6}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="display-title text-[1.0625rem] font-medium text-sumi md:text-[1.125rem]">
                            {term.title}
                          </h3>
                          {/* Full definitions are two to three lines each;
                              twelve of them stacked is a wall on a phone.
                              Clamped until there's room to show them whole. */}
                          <p className="mt-1 line-clamp-2 text-[0.9375rem] leading-relaxed text-sumi-soft sm:line-clamp-none">
                            {term.shortDef}
                          </p>
                        </div>
                        <ArrowRight
                          className="mt-1 h-4 w-4 shrink-0 self-start text-nezumi transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/term:translate-x-0.5 group-hover/term:text-hinomaru-ink"
                          strokeWidth={1.6}
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </Reveal>

          <Reveal delay={460} className="mt-10">
            <p className="text-[0.9375rem] leading-relaxed text-sumi-soft">
              Looking for something longer?{' '}
              <Link
                to="/guides"
                className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru-ink hover:decoration-hinomaru/40"
              >
                Guides
              </Link>{' '}
              collects long-form posts that combine several of these terms. What
              a healthy cycle count looks like, whether to keep your MacBook
              plugged in, and how Apple’s Optimized Battery Charging actually
              works.
            </p>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}
