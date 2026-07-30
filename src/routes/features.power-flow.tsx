import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/power-flow'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/power-flow'
const PAGE_TITLE = 'Power flow — Battery Sensei'
const PAGE_DESC =
  "See exactly where your MacBook's watts go: what the adapter delivers, what the system itself draws, and how much reaches the battery. Live, in one panel."

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/power-flow')({
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
      slug="power-flow"
      kanji="流"
      mockup={
        <ScreenshotMockup
          name="power-flow"
          alt='The Power flow panel showing adapter, battery, and system wattage live.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
