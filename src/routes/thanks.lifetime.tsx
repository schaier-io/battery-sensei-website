import { createFileRoute } from '@tanstack/react-router'
import { ThanksPage } from '#/components/ThanksPage'

const SITE_URL = 'https://battery-sensei.app'
const PATH = '/thanks/lifetime'
const PAGE_TITLE = 'Thanks — Battery Sensei Lifetime'
const PAGE_DESC =
  'Payment confirmed. Your Battery Sensei lifetime license is on its way — open Sensei to enter your key and pick up where you left off.'

export const Route = createFileRoute('/thanks/lifetime')({
  // Post-purchase landing page reached via Polar's success URL. Keep it out
  // of search (no organic value, query param is per-checkout) but follow
  // links so the footer + nav still pass link equity.
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  // 謝 = "thanks / gratitude". Same kanji on both tiers so the visual
  // moment of arrival is consistent — only the copy underneath varies.
  component: () => <ThanksPage tier="lifetime" kanji="謝" />,
})
