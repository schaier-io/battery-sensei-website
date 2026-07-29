import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/low-power-mode'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/low-power-mode'
const PAGE_TITLE = 'Automatic Low Power Mode — Battery Sensei'
const PAGE_DESC =
  "Let macOS Low Power Mode switch itself on when your battery drops past your threshold, and back off when you plug in. One rule, set once, with Apple's own setting doing the work."

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/low-power-mode')({
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
      slug="low-power-mode"
      kanji="節"
      mockup={
        <ScreenshotMockup
          name="low-power-mode"
          alt="The Low Power Mode card in Battery Sensei, with the automation switch and its trigger settings."
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
