import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/battery-health'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/battery-health'
const PAGE_TITLE = 'Battery health — Battery Sensei'
const PAGE_DESC =
  "Maximum capacity, cycle count, and macOS's own condition verdict for your Mac's pack — with the charging habits that shaped them."

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/battery-health')({
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
      slug="battery-health"
      kanji="健"
      mockup={
        <ScreenshotMockup
          name="battery-health"
          alt='The Battery health panel showing capacity, condition, and cycle count tiles.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
