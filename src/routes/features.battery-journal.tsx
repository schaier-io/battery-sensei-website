import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { BatteryJournal } from '#/components/zen/BatteryJournal'
import { extended, faqs } from '#/data/features/battery-journal'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/battery-journal'
const PAGE_TITLE = 'Saga — Battery Sensei'
const PAGE_DESC =
  'A plain-English diary of your MacBook battery: cycles, plateaus, capacity over time, written in sentences, not jargon.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/battery-journal')({
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
      slug="battery-journal"
      kanji="史"
      mockup={<BatteryJournal className="mx-auto max-w-md" />}
      extended={extended}
      faqs={faqs}
    />
  ),
})
