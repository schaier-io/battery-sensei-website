import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/meeting-battery-guard'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/meeting-battery-guard'
const PAGE_TITLE = 'Meeting Guard — Battery Sensei'
const PAGE_DESC =
  'Calendar-aware battery warning. Sensei predicts whether your battery will survive each meeting and warns 30, 15, 5, and 1 minute before, all on-device.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/meeting-battery-guard')({
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
      slug="meeting-battery-guard"
      kanji="会"
      mockup={
        <ScreenshotMockup
          name="meeting-battery-guard"
          alt='The Meeting battery guard card with reminder checkpoints, calendar scope, and the latest forecast.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
