import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import type { GlossaryTerm } from '#/data/glossary/terms'

type Props = {
  term: GlossaryTerm
}

export function GlossaryTermPage({ term }: Props) {
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <Link
              to="/glossary"
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              Glossary
            </Link>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="辞" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              Glossary · 用語
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {term.title}.
            </Reveal>
            <Reveal
              as="p"
              delay={320}
              className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-sumi md:text-[1.125rem]"
            >
              {term.shortDef}
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-2 pt-8 sm:px-6 md:pt-12">
          <Reveal delay={420} className="space-y-5">
            {term.body()}
          </Reveal>
        </section>

        <section className="zen-section mx-auto max-w-3xl px-5 pt-6 sm:px-6">
          <Reveal delay={500}>
            <div className="border-l-2 border-hinomaru/30 pl-5 md:pl-6">
              <p className="display-title mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
                Related
              </p>
              <ul className="space-y-2 text-base leading-relaxed text-sumi md:text-[1.0625rem]">
                {term.related.map((link) => (
                  <li key={link.href}>
                    {isGlossarySlug(link.href) ? (
                      <Link
                        to="/glossary/$slug"
                        params={{ slug: link.href }}
                        className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru hover:decoration-hinomaru/40"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <Link
                        to={link.href}
                        className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru hover:decoration-hinomaru/40"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {term.sources && term.sources.length > 0 && (
            <Reveal delay={560} className="mt-8">
              <p className="display-title mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
                Sources
              </p>
              <ul className="space-y-2 text-[0.9375rem] leading-relaxed text-sumi-soft">
                {term.sources.map((src) => (
                  <li key={src.href}>
                    <a
                      href={src.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru hover:decoration-hinomaru/40"
                    >
                      {src.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          <Reveal delay={620} className="mt-10">
            <a
              href="/#free-download-email"
              className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Download
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              Try Battery Sensei free
            </a>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

/** Heuristic: pure slugs (no leading slash, no protocol) are glossary
 * cross-references that go to /glossary/<slug>. Anything starting with
 * "/" goes to that app path; anything with "://" is external (handled at
 * call sites that need an `<a>` rather than a router `<Link>`). */
function isGlossarySlug(href: string): boolean {
  return !href.startsWith('/') && !href.includes('://')
}
