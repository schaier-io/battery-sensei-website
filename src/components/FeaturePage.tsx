import type { ReactNode } from 'react'
import { HomeLink } from '#/components/HomeLink'
import { ArrowLeft, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

type Slug =
  | 'travel-mode'
  | 'custom-thresholds'
  | 'alert-presets'
  | 'battery-journal'
  | 'meeting-battery-guard'
  | 'energy-usage'

type Props = {
  slug: Slug
  kanji: string
  /** Visual mockup rendered under the body. Live components preferred over
   * static images — they stay sharp at any DPI and weigh ~0 bytes extra. */
  mockup?: ReactNode
  /** Optional English-only long-form guide rendered below "Why it matters".
   * The above-fold content (kicker, heading, body, why) stays i18n-driven
   * across all 5 locales; the extended guide is the SEO + AI-Overviews
   * surface and stays English to keep editorial control tight. */
  extended?: ReactNode
  /** Optional FAQ list serialized to Schema.org FAQPage in the route file.
   * Rendered here as a visible Q&A block at the end of the page. English
   * only, same reasoning as `extended`. */
  faqs?: ReadonlyArray<{ q: string; a: string }>
}

export function FeaturePage({ slug, kanji, mockup, extended, faqs }: Props) {
  const { t } = useTranslation()
  const key = `featurePages.${slug}`
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <HomeLink
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('featurePages.backLink')}
            </HomeLink>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji={kanji} className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t(`${key}.kicker`)}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t(`${key}.heading`)}
              <span className="block italic text-sumi-soft font-normal">
                {t(`${key}.headingItalic`)}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={320}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t(`${key}.body`)}
            </Reveal>
          </div>
        </section>

        {mockup && (
          <section className="mx-auto max-w-3xl px-5 pb-2 pt-8 sm:px-6 md:pt-12">
            <Reveal delay={420}>
              <figure className="paper-card relative overflow-hidden p-6 md:p-8">
                {/* Ambient hinomaru wash — same trick used in the Contact card.
                    Pulls the eye toward the mockup without competing with it. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-hinomaru/[0.05] blur-3xl"
                />
                <div className="relative">{mockup}</div>
                <figcaption className="relative mt-5 text-center text-[12px] tracking-[0.06em] text-nezumi">
                  {t(`${key}.mockupCaption`)}
                </figcaption>
              </figure>
            </Reveal>
          </section>
        )}

        <section className="zen-section mx-auto max-w-3xl px-5 pt-6 sm:px-6">
          <Reveal delay={500}>
            <div className="border-l-2 border-hinomaru/30 pl-5 md:pl-6">
              <p className="display-title mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
                {t('featurePages.whyItHeading')}
              </p>
              <p className="text-base leading-[1.7] text-sumi md:text-[1.0625rem]">
                {t(`${key}.why`)}
              </p>
            </div>
          </Reveal>

          {/* Extended English-only guide. Renders directly after the
              "Why it matters" block so the page reads as: intro → mockup →
              why → deep guide → FAQ → CTA. The extra prose is the SEO +
              AI-search payload (long-tail keywords, internal links to
              glossary + journal, citable sources). */}
          {extended && (
            <Reveal delay={560} className="mt-12 space-y-5">
              {extended}
            </Reveal>
          )}

          {faqs && faqs.length > 0 && (
            <Reveal delay={580} className="mt-14">
              <h2 className="display-title mb-6 text-[1.375rem] font-semibold leading-[1.2] tracking-[-0.01em] text-sumi md:text-[1.625rem]">
                Frequently asked.
              </h2>
              <dl className="space-y-6">
                {faqs.map((entry) => (
                  <div key={entry.q} className="border-l-2 border-hinomaru/30 pl-5 md:pl-6">
                    <dt className="display-title text-[1rem] font-medium text-sumi md:text-[1.0625rem]">
                      {entry.q}
                    </dt>
                    <dd className="mt-2 text-[0.9375rem] leading-relaxed text-sumi-soft md:text-[1rem]">
                      {entry.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}

          {/* Bottom row simplified to ONE primary action — the
              back-to-home anchor lives at the top-left of the page
              (above the hanko) so the duplicate at the bottom was
              redundant. Keep the "Try free" CTA as the page's
              closing beat. */}
          <Reveal delay={600} className="mt-10">
            <a
              href="/#free-download-email"
              className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Download
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              {t('featurePages.tryFree')}
            </a>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}
