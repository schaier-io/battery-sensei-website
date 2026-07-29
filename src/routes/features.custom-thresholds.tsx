import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
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
      mockup={
        <ScreenshotMockup
          name="custom-thresholds"
          alt='The Warnings card with custom rules expanded, each with its own threshold and style.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
