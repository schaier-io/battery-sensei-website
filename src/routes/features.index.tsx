import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { Reveal } from '#/components/zen/Reveal'
import { Hanko } from '#/components/zen/Hanko'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { BrushDivider } from '#/components/zen/BrushDivider'
import { Play } from 'lucide-react'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features'
const PAGE_TITLE = 'Features — Battery Sensei'
const PAGE_DESC =
  'Every part of Battery Sensei, explained: meeting guard, warning presets, power flow, system load, charge limit, battery health, energy usage, and more.'

/**
 * Hub page for the feature guides.
 *
 * Without it each guide was an orphan — reachable only by typing the URL,
 * which means no internal links, no crawl path, and no way for a reader on
 * one guide to find the next. The list is the crawl path and the reader's
 * table of contents at once. Kanji + one-line summary keep it scannable.
 */
type FeatureEntry = {
  slug: string
  kanji: string
  name: string
  blurb: string
}

type FeatureGroup = {
  id: string
  kicker: string
  title: string
  intro: string
  /** Optional app screenshot rendered between the intro and the cards —
   * breaks the kicker/heading/cards rhythm so four sections in a row don't
   * read as the same block repeated. */
  shot?: { name: string; alt: string; caption: string }
  /** Optional pull-quote rendered after the intro — same treatment as the
   * feature pages' "why it matters" block, so the accent stays on-system. */
  quote?: string
  features: FeatureEntry[]
}

/**
 * The hub reads as four short chapters, not a link dump: each group gets a
 * heading and a paragraph of real prose about how its features work together,
 * then the cards. English-only below the i18n'd intro, same policy as the
 * journal and glossary.
 */
const GROUPS: FeatureGroup[] = [
  {
    id: 'today',
    kicker: 'The short game',
    title: 'Keep today from going wrong',
    intro:
      "Most battery disasters are timing failures: the warning came too late, the meeting ran long, Low Power Mode never got switched on. These four decide when Battery Sensei speaks up and what it quietly does on your behalf — from a gentle nudge at 15% to a calendar-aware forecast that knows your 3 PM call will outlast your charge.",
    features: [
      { slug: 'meeting-battery-guard', kanji: '会', name: 'Meeting guard', blurb: 'Warns you when a meeting will outlast your battery.' },
      { slug: 'alert-presets', kanji: '警', name: 'Warning presets', blurb: 'Set the whole low-battery ladder in one choice.' },
      { slug: 'custom-thresholds', kanji: '閾', name: 'Custom thresholds', blurb: 'Your own percentages, styles, and sounds per rule.' },
      { slug: 'low-power-mode', kanji: '節', name: 'Low Power Mode', blurb: 'Switches itself on at your trigger, off when you charge.' },
    ],
  },
  {
    id: 'diagnose',
    kicker: 'The diagnosis',
    title: 'See where the power goes',
    intro:
      "A fast drain always has an author. Sometimes it's a process pinning one CPU core; sometimes it's the charger itself, quietly negotiating 38 W out of a 96 W brick. Battery Sensei lays the evidence out live — and \"it died fast today\" becomes a name you can point at and quit.",
    shot: {
      name: 'power-flow',
      alt: 'The Power flow panel showing adapter, battery, and system wattage live.',
      caption: 'Power flow, live: what the adapter delivers, what reaches the battery, what the system draws.',
    },
    features: [
      { slug: 'power-flow', kanji: '流', name: 'Power flow', blurb: 'Adapter in, battery flow, system draw — live.' },
      { slug: 'system-load', kanji: '負', name: 'System load', blurb: 'CPU, GPU, disk, and memory beside your battery.' },
      { slug: 'energy-usage', kanji: '喰', name: 'App energy usage', blurb: 'Which apps are draining you, ranked by share.' },
    ],
  },
  {
    id: 'longevity',
    kicker: 'The long game',
    title: 'Protect the pack for years',
    shot: {
      name: 'charge-limit',
      alt: 'The Charging card with the daily charge cap and optimized charging status.',
      caption: 'The daily cap in place — less time parked at 100%, with a weekly cycle reminder to keep estimates honest.',
    },
    intro:
      "Capacity loss is slow, boring, and mostly self-inflicted: heat, time parked at 100%, deep discharges. The habits that prevent it are automatable. Cap the daily charge, lift the cap for travel days, and watch the health numbers move as a trend instead of a daily worry — with the full charge history sitting next to them for context.",
    features: [
      { slug: 'charge-limit', kanji: '充', name: 'Charge limit', blurb: 'A daily cap, plus a weekly cycle to keep estimates honest.' },
      { slug: 'travel-mode', kanji: '旅', name: 'Travel mode', blurb: 'Full charge and quiet alerts for the day you leave.' },
      { slug: 'battery-health', kanji: '健', name: 'Battery health', blurb: 'Capacity, cycles, condition — and what moves them.' },
      { slug: 'battery-journal', kanji: '史', name: 'Charge history', blurb: 'Your charge curve over a day, three days, or a week.' },
    ],
  },
  {
    id: 'record',
    kicker: 'The record',
    title: 'Know how you actually did',
    quote:
      'A live percentage answers "what now". It never answers "is this normal for me" — that takes a record.',
    intro:
      "A live percentage answers \"what now\", never \"is this normal for me\". The recaps and honors turn months of history into something readable in twenty seconds — and the settings stay short, because everything Battery Sensei knows lives on your Mac and nothing needs an account.",
    features: [
      { slug: 'statistics', kanji: '統', name: 'Statistics', blurb: 'Weekly and monthly recaps of how the battery behaved.' },
      { slug: 'honors', kanji: '誉', name: 'Honors', blurb: 'Quiet recognition for habits worth keeping.' },
      { slug: 'general', kanji: '通', name: 'General settings', blurb: 'Appearance, language, menu bar, startup.' },
    ],
  },
]

const FEATURES = GROUPS.flatMap((group) => group.features)

const itemListLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Battery Sensei features',
  itemListElement: FEATURES.map((feature, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: feature.name,
    url: `${SITE_URL}/features/${feature.slug}`,
  })),
}

export const Route = createFileRoute('/features/')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
    scripts: [
      { type: 'application/ld+json', children: JSON.stringify(itemListLd) },
    ],
  }),
  component: FeaturesIndex,
})

function FeaturesIndex() {
  const { t } = useTranslation()
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex flex-col items-start">
            <Hanko kanji="全" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t('featurePages.indexKicker')}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('featurePages.indexHeading')}
              <span className="block italic text-sumi-soft font-normal">
                {t('featurePages.indexHeadingItalic')}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={320}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('featurePages.indexBody')}
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-14 pt-2 sm:px-6">
          <Reveal delay={380}>
            <figure className="paper-card overflow-hidden p-2">
              <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-md border border-dashed border-sumi/20 bg-[color-mix(in_oklab,var(--washi)_82%,#fff)]">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-hinomaru/[0.05] blur-3xl"
                />
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-sumi/15 bg-washi shadow-[0_2px_12px_rgba(28,26,23,0.08)]">
                  <Play className="ml-1 h-6 w-6 text-sumi/70" strokeWidth={1.6} />
                </span>
                <div className="text-center">
                  <p className="display-title text-[1.0625rem] font-medium text-sumi">
                    The full tour, in one video
                  </p>
                  <p className="mt-1 text-[13px] text-sumi-soft">
                    A walkthrough of every setting — coming soon.
                  </p>
                </div>
              </div>
              <figcaption className="sr-only">
                Video walkthrough of Battery Sensei's settings — coming soon.
              </figcaption>
            </figure>
          </Reveal>
        </section>

        <div className="mx-auto max-w-3xl px-5 pb-4 sm:px-6">
          {GROUPS.map((group, groupIndex) => (
            <Reveal
              key={group.id}
              delay={420 + groupIndex * 60}
              className={groupIndex === 0 ? 'pb-4' : 'pb-4 pt-2'}
            >
              {groupIndex > 0 && (
                <BrushDivider className="mb-12 text-sumi/30" />
              )}
              <p className="kicker-row mb-3">{group.kicker}</p>
              <h2 className="display-title text-2xl font-semibold tracking-[-0.01em] text-sumi md:text-[1.75rem]">
                {group.title}
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-[1.7] text-sumi-soft">
                {group.intro}
              </p>
              {group.shot && (
                <figure className="paper-card mt-6 overflow-hidden p-4 md:p-5">
                  <ScreenshotMockup name={group.shot.name} alt={group.shot.alt} />
                  <figcaption className="mt-3 text-center text-[12px] tracking-[0.06em] text-nezumi">
                    {group.shot.caption}
                  </figcaption>
                </figure>
              )}
              {group.quote && (
                <blockquote className="mt-6 max-w-2xl border-l-2 border-hinomaru/30 pl-5 md:pl-6">
                  <p className="display-title text-[1.125rem] italic leading-[1.55] text-sumi">
                    {group.quote}
                  </p>
                </blockquote>
              )}
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {group.features.map((feature) => (
                  <li key={feature.slug}>
                    <Link
                      to={`/features/${feature.slug}`}
                      className="paper-card flex h-full items-start gap-4 p-5 transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5"
                    >
                      <span
                        aria-hidden
                        className="display-title mt-0.5 text-[1.35rem] leading-none text-hinomaru/70"
                      >
                        {feature.kanji}
                      </span>
                      <span className="min-w-0">
                        <span className="display-title block text-[1.0625rem] font-medium text-sumi">
                          {feature.name}
                        </span>
                        <span className="mt-1 block text-[13px] leading-[1.55] text-sumi-soft">
                          {feature.blurb}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}

          <Reveal delay={520} className="border-t border-sumi/10 pb-20 pt-10">
            <p className="max-w-2xl text-[15px] leading-[1.7] text-sumi-soft">
              All of it runs on-device, free to try, with Premium unlocking the
              automation and history depth. The fastest way to understand any
              of these is to watch them react to your own battery.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="/download/latest"
                className="inline-flex items-center gap-2 rounded-full bg-sumi px-5 py-2.5 text-sm font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
              >
                Download Battery Sensei
              </a>
              <Link
                to="/"
                hash="pricing"
                className="text-sm font-medium text-sumi underline-offset-4 hover:underline"
              >
                See pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  )
}
