import { createFileRoute } from '@tanstack/react-router'
import { Flame, Search } from 'lucide-react'
import { FeaturePage } from '#/components/FeaturePage'
import { extended, faqs } from '#/data/features/energy-usage'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/energy-usage'
const PAGE_TITLE = 'Top power-hungry apps — Battery Sensei'
const PAGE_DESC =
  'See which apps are draining your MacBook battery on the Saga page — 1h / 24h / 7d windows, Activity-Monitor-style impact score, with a search filter.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/energy-usage')({
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
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(faqLd) }],
  }),
  component: () => (
    <FeaturePage
      slug="energy-usage"
      kanji="電"
      mockup={<EnergyMockup />}
      extended={extended}
      faqs={faqs}
    />
  ),
})

type Row = {
  name: string
  /** Energy impact score, Activity-Monitor-style: blends CPU time with wakeups. */
  impact: number
  /** Real Swift impact labels (AppModel.swift). */
  level: 'Low' | 'Moderate' | 'High' | 'Very high'
}

// Static snapshot — illustrates the ranked list. Real data comes from
// AppPowerSampler every 5 min.
const APPS: Row[] = [
  { name: 'Chrome',    impact: 134, level: 'Very high' },
  { name: 'Zoom',      impact:  92, level: 'High' },
  { name: 'Slack',     impact:  44, level: 'Moderate' },
  { name: 'Xcode',     impact:  38, level: 'Moderate' },
  { name: 'Spotlight', impact:  17, level: 'Low' },
  { name: 'Finder',    impact:   3, level: 'Low' },
]

const WINDOWS = ['1 h', '24 h', '7 d'] as const

function levelTint(level: Row['level']) {
  switch (level) {
    case 'Very high': return 'var(--hinomaru)'
    case 'High':      return 'rgb(250, 133, 10)'
    case 'Moderate':  return 'rgb(33, 125, 247)'
    case 'Low':       return 'color-mix(in oklab, var(--sumi) 50%, transparent)'
  }
}

function EnergyMockup() {
  const max = Math.max(...APPS.map((a) => a.impact))
  return (
    <div className="mx-auto max-w-md" aria-hidden>
      {/* Header row — title + window tabs + JP accent */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-sumi-soft">
          Top power-hungry apps
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] p-0.5 text-[10px] uppercase tracking-[0.14em]"
          role="tablist"
          aria-label="Time window"
        >
          {WINDOWS.map((w, i) => (
            <span
              key={w}
              role="tab"
              aria-selected={i === 1}
              className={`rounded-full px-2 py-0.5 ${
                i === 1
                  ? 'bg-hinomaru/[0.12] text-hinomaru'
                  : 'text-sumi-soft'
              }`}
            >
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Filter input — mirrors AppPowerUsagePanel's "Filter apps" field */}
      <div className="mb-3 flex items-center gap-2 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-nezumi/70" strokeWidth={1.8} aria-hidden />
        <span className="text-[13px] text-sumi-soft">Filter apps</span>
        <span className="ml-auto font-jp text-[10px] tracking-[0.3em] text-hinomaru/70">
          電力
        </span>
      </div>

      <ul className="space-y-1.5">
        {APPS.map((a) => {
          const pct = (a.impact / max) * 100
          const tint = levelTint(a.level)
          return (
            <li
              key={a.name}
              className="grid grid-cols-[7.5rem_1fr_4.6rem] items-center gap-3 rounded-md px-3 py-2 hover:bg-[color-mix(in_oklab,var(--washi)_55%,#fff)]"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="display-title truncate text-[13px] font-medium text-sumi">
                  {a.name}
                </span>
                {a.level === 'Very high' && (
                  <Flame
                    aria-hidden
                    className="h-3 w-3 shrink-0 text-hinomaru"
                    strokeWidth={2}
                  />
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: tint }}
                />
              </div>
              <span
                className="text-right text-[10px] uppercase tracking-[0.1em] tabular-nums"
                style={{ color: tint }}
              >
                {a.level}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
