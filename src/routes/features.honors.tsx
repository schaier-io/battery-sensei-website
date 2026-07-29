import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/honors'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/honors'
const PAGE_TITLE = 'Honors — Battery Sensei'
const PAGE_DESC =
  'Quiet recognition for battery habits worth keeping: steady charge ranges, rescues taken seriously, streaks that survive a busy week.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/honors')({
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
      slug="honors"
      kanji="誉"
      mockup={
        <ScreenshotMockup
          name="honors"
          alt='The Honors gallery showing earned and locked achievements.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
