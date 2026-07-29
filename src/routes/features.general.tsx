import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/general'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/general'
const PAGE_TITLE = 'General settings — Battery Sensei'
const PAGE_DESC =
  'Appearance, language, menu-bar content, and startup behaviour for Battery Sensei — with nothing that changes how your Mac charges.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/general')({
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
      slug="general"
      kanji="通"
      mockup={
        <ScreenshotMockup
          name="general"
          alt='The General settings card with appearance, language, and menu-bar options.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
