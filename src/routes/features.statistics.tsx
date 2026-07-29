import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/statistics'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/statistics'
const PAGE_TITLE = 'Battery statistics — Battery Sensei'
const PAGE_DESC =
  "Weekly and monthly recaps of how your Mac's battery actually behaved: time unplugged, charge sessions, depth of discharge, and the rescues you made in time."

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/statistics')({
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
      slug="statistics"
      kanji="統"
      mockup={
        <ScreenshotMockup
          name="statistics"
          alt='The Statistics panel with weekly and monthly battery recaps.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
