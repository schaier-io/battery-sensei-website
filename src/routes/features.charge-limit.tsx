import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/charge-limit'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/charge-limit'
const PAGE_TITLE = 'Charge limit — Battery Sensei'
const PAGE_DESC =
  'Cap your daily charge so the pack spends less time at 100%, with a weekly full-cycle reminder that keeps runtime estimates honest.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/charge-limit')({
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
      slug="charge-limit"
      kanji="充"
      mockup={
        <ScreenshotMockup
          name="charge-limit"
          alt='The Charging card with the daily charge cap and optimized charging status.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
