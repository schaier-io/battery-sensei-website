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
  /** Renders a sample weekly-recap strip: the statistics section shows what
   * a recap *is* instead of yet another screenshot. */
  recap?: boolean
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
      "Most battery disasters are timing failures. The warning came too late, the meeting ran long, nobody switched Low Power Mode on. These four decide when Sensei speaks up and what it handles without asking — from a soft nudge at 15% to a forecast that knows your 3 PM call outlasts your charge.",
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
      "A fast drain always has an author. Sometimes it's a process pinning one core. Sometimes it's the charger itself, negotiating 38 W out of a 96 W brick. Sensei lays the evidence out live, and \"it died fast today\" turns into a name you can quit.",
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
      "Capacity loss is slow, boring, and mostly self-inflicted: heat, hours parked at 100%, deep discharges. The countermeasures are automatable. Cap the daily charge, lift it for travel days, and read the health numbers as a trend — with the charge history right beside them.",
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
    recap: true,
    intro:
      "Weekly and monthly recaps compress the history into twenty seconds of reading: how long you ran unplugged, how deep you discharged, which rescues landed in time. The settings stay short, because everything Sensei knows lives on your Mac and nothing needs an account.",
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
            {/* Player-styled placeholder: the settings screenshot as a dimmed
                poster frame, a real play disc, and a duration-style chip —
                reads as a video at a glance. Swap in <video poster=…> later
                without touching the layout. */}
            <figure className="group relative aspect-video w-full overflow-hidden rounded-xl bg-sumi shadow-[0_12px_40px_-12px_rgba(28,26,23,0.45)]">
              <img
                src="/screenshots/general-dark.png"
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover object-top opacity-45"
                loading="lazy"
                decoding="async"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-sumi/90 via-sumi/30 to-sumi/50"
              />

              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-washi/95 shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-transform duration-[220ms] group-hover:scale-105">
                  <Play className="ml-1 h-6 w-6 fill-sumi text-sumi" strokeWidth={0} />
                </span>
              </span>

              {/* Bottom bar: title left, coming-soon chip where the duration
                  would sit, and a hairline progress track underneath. */}
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-5 pb-4">
                <span className="min-w-0">
                  <span className="display-title block text-[1.0625rem] font-medium text-washi">
                    Every setting, one take
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-washi/70">
                    A guided pass through the whole app.
                  </span>
                </span>
                <span className="shrink-0 rounded bg-washi/15 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-washi/90 backdrop-blur-sm">
                  Coming soon
                </span>
              </span>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-washi/20">
                <span className="block h-full w-0 bg-hinomaru/80" />
              </span>

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
              {group.recap && (
                <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-sumi/10 bg-sumi/10 sm:grid-cols-3">
                  {[
                    { value: '31h 40m', label: 'on battery this week' },
                    { value: '9', label: 'charge sessions' },
                    { value: '1', label: 'rescue, with 12 min to spare' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-washi px-5 py-4">
                      <div className="display-title text-[1.5rem] font-semibold tabular-nums text-sumi">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-sumi-soft">{stat.label}</div>
                    </div>
                  ))}
                </div>
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
              Everything above runs on-device and is free to try. The fastest
              way to understand any of these pages is to watch the app react to
              your own battery.
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
