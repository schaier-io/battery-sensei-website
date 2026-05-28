import { createFileRoute } from '@tanstack/react-router'
import { Plane, Home, Sunrise } from 'lucide-react'
import { FeaturePage } from '#/components/FeaturePage'
import { extended, faqs } from '#/data/features/travel-mode'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/travel-mode'
const PAGE_TITLE = 'Travel prep mode — Battery Sensei'
const PAGE_DESC =
  'One click before a trip: full charge, stricter low-battery warnings, and an automatic reset the next morning at 9 AM.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/travel-mode')({
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
      slug="travel-mode"
      kanji="旅"
      mockup={<TravelMockup />}
      extended={extended}
      faqs={faqs}
    />
  ),
})

/**
 * Three-stage timeline mirroring the real app behavior:
 *   Today → Travel (lifts to 100%) → Tomorrow 9 AM (auto-reset to cap).
 * Source of truth: AppModel.swift nextTravelResetDate — resets at 9 AM
 * local, not on home-power detection.
 */
function TravelMockup() {
  return (
    <div className="mx-auto grid max-w-md grid-cols-3 gap-3" aria-hidden>
      <ChargeChip
        pct={80}
        state="Today"
        icon={<Home className="h-3.5 w-3.5" strokeWidth={1.7} />}
      />
      <ChargeChip
        pct={100}
        state="Travel"
        icon={<Plane className="h-3.5 w-3.5" strokeWidth={1.7} />}
        accent
      />
      <ChargeChip
        pct={80}
        state="Tmrw · 9 AM"
        icon={<Sunrise className="h-3.5 w-3.5" strokeWidth={1.7} />}
      />
    </div>
  )
}

function ChargeChip({
  pct,
  state,
  icon,
  accent = false,
}: {
  pct: number
  state: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center ${
        accent
          ? 'border-hinomaru/30 bg-hinomaru/[0.04]'
          : 'border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)]'
      }`}
    >
      <div
        className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] ${
          accent ? 'text-hinomaru' : 'text-sumi-soft'
        }`}
      >
        {icon}
        {state}
      </div>
      <div
        className={`display-title text-2xl font-semibold tabular-nums ${
          accent ? 'text-hinomaru' : 'text-sumi'
        }`}
      >
        {pct}%
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className={`h-full ${accent ? 'bg-hinomaru' : 'bg-sumi/55'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
