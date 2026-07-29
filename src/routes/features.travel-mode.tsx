import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/travel-mode'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/travel-mode'
const PAGE_TITLE = 'Travel prep mode — Battery Sensei'
const PAGE_DESC =
  'One click before a trip: full charge, stricter low-battery warnings, and an automatic reset the next morning at 9 AM.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/travel-mode')({
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
      slug="travel-mode"
      kanji="旅"
      mockup={
        <ScreenshotMockup
          name="travel-mode"
          alt='The Today surface with the Travel Mode quick action in the hero card.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})

/**
 * Three-stage timeline mirroring the real app behavior:
 *   Today → Travel (lifts to 100%) → Tomorrow 9 AM (auto-reset to cap).
 * Source of truth: AppModel.swift nextTravelResetDate — resets at 9 AM
 * local, not on home-power detection.
 */
