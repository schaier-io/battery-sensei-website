import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/system-load'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/system-load'
const PAGE_TITLE = 'System load — Battery Sensei'
const PAGE_DESC =
  'CPU, GPU, disk, and memory pressure in one strip, so a sudden battery drain has a visible explanation instead of a mystery.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/system-load')({
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
      slug="system-load"
      kanji="負"
      mockup={
        <ScreenshotMockup
          name="system-load"
          alt='The System load panel showing CPU, GPU, memory, and disk I/O readings.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
