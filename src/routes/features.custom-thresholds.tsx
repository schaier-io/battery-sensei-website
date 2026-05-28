import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { extended, faqs } from '#/data/features/custom-thresholds'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/custom-thresholds'
const PAGE_TITLE = 'Custom Thresholds — Battery Sensei'
const PAGE_DESC =
  'Per-tier custom low-battery thresholds and auto-dismiss times. Your numbers, your timing.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/custom-thresholds')({
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
      slug="custom-thresholds"
      kanji="設"
      mockup={<ThresholdsMockup />}
      extended={extended}
      faqs={faqs}
    />
  ),
})

function ThresholdsMockup() {
  const rows: { tier: string; pct: number; dismiss: string; color: string }[] = [
    { tier: 'Info',    pct: 25, dismiss: '5 s',     color: 'rgb(33, 125, 247)' },
    { tier: 'Warning', pct: 12, dismiss: '14 s',    color: 'rgb(250, 133, 10)' },
    { tier: 'Alert',   pct: 5,  dismiss: 'until ✓', color: 'rgb(255, 56, 71)' },
  ]
  return (
    <ul className="mx-auto max-w-md space-y-2.5" aria-hidden>
      {rows.map((r) => (
        <li
          key={r.tier}
          className="flex items-center gap-4 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-4 py-3"
        >
          <span
            className="display-title w-16 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: r.color }}
          >
            {r.tier}
          </span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
          </div>
          <span className="display-title w-10 text-right text-[13px] font-medium tabular-nums text-sumi">
            {r.pct}%
          </span>
          <span className="w-16 text-right text-[11px] text-sumi-soft tabular-nums">{r.dismiss}</span>
        </li>
      ))}
    </ul>
  )
}
