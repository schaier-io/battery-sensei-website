import { createFileRoute } from '@tanstack/react-router'
import { FeaturePage } from '#/components/FeaturePage'
import { ScreenshotMockup } from '#/components/ScreenshotMockup'
import { extended, faqs } from '#/data/features/alert-presets'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/alert-presets'
const PAGE_TITLE = 'Alert Presets — Battery Sensei'
const PAGE_DESC =
  'Zen Mode, Regular Mode, Teach Me Senpai — three escalating low-battery alert presets. Pick the mood that fits your day, or build your own.'

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/features/alert-presets')({
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
      slug="alert-presets"
      kanji="警"
      mockup={
        <ScreenshotMockup
          name="alert-presets"
          alt='The Warnings card showing the Zen, Regular, and Teach Me Senpai presets.'
        />
      }
      extended={extended}
      faqs={faqs}
    />
  ),
})
