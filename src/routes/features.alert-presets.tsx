import { createFileRoute } from '@tanstack/react-router'
import { Leaf, Bell, AlertOctagon } from 'lucide-react'
import { FeaturePage } from '#/components/FeaturePage'
import { extended, faqs } from '#/data/features/alert-presets'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/alert-presets'
const PAGE_TITLE = 'Alert Presets — Battery Sensei'
const PAGE_DESC =
  'Zen Mode, Regular Mode, Teach Me Senpai — three escalating low-battery alert presets. Pick the mood that fits your day, or build your own.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/alert-presets')({
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
      slug="alert-presets"
      kanji="警"
      mockup={<PresetsMockup />}
      extended={extended}
      faqs={faqs}
    />
  ),
})

type Preset = {
  name: string
  kanji: string
  icon: typeof Leaf
  tint: string
  /** Real values pulled from AppModel.swift — keep in sync with the app. */
  steps: string[]
  blurb: string
}

const PRESETS: Preset[] = [
  {
    name: 'Zen Mode',
    kanji: '禅',
    icon: Leaf,
    tint: 'rgb(33, 125, 247)',
    steps: ['Info 15% · 5 s', 'Info 5% · 10 s'],
    blurb: 'Quiet. Lets you finish.',
  },
  {
    name: 'Regular Mode',
    kanji: '常',
    icon: Bell,
    tint: 'rgb(250, 133, 10)',
    steps: ['Info 15% · 5 s', 'Red overlay 5% · 10 s', 'Flashing 2% · manual'],
    blurb: 'Default, well-mannered.',
  },
  {
    name: 'Teach Me Senpai',
    kanji: '先',
    icon: AlertOctagon,
    tint: 'rgb(255, 56, 71)',
    steps: ['Red overlay 15% · manual', 'Flashing 5% · manual'],
    blurb: 'Will not let you forget.',
  },
]

function PresetsMockup() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
      {PRESETS.map((p) => {
        const Icon = p.icon
        return (
          <div
            key={p.name}
            className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] p-4"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4" strokeWidth={1.7} style={{ color: p.tint }} />
              <span className="font-jp text-lg leading-none text-hinomaru/80">{p.kanji}</span>
            </div>
            <div className="display-title text-[1rem] font-semibold text-sumi">{p.name}</div>
            <ul className="flex flex-col gap-1.5">
              {p.steps.map((s) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]"
                  style={{
                    color: p.tint,
                    backgroundColor: `color-mix(in oklab, ${p.tint} 10%, transparent)`,
                  }}
                >
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-auto text-[12px] leading-[1.5] text-sumi-soft">{p.blurb}</p>
          </div>
        )
      })}
    </div>
  )
}
