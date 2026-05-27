import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { BatteryJournal } from '#/components/zen/BatteryJournal'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/battery-journal'
const PAGE_TITLE = 'Battery Journal — Battery Sensei'
const PAGE_DESC =
  'A plain-English diary of your MacBook battery: cycles, plateaus, capacity over time — written in sentences, not jargon.'

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
  }),
  component: () => (
    <FeaturePage
      slug="battery-journal"
      kanji="史"
      mockup={<BatteryJournal className="mx-auto max-w-md" />}
    />
  ),
})
