import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/energy-usage'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/energy-usage'
const PAGE_TITLE = 'Top power-hungry apps — Battery Sensei'
const PAGE_DESC =
  'See which apps are draining your MacBook battery on the Saga page: live Now / 3h / 5d windows, shown as percent or watts, with a search filter.'

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
      mockup={
        <ScreenshotMockup
          name="energy-usage"
          alt='The top power-hungry apps panel ranked by share of battery used.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})

