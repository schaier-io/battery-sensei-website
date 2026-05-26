import { createFileRoute } from '@tanstack/react-router'
import { ThanksPage } from '#/components/ThanksPage'

const SITE_URL = 'https://battery-sensei.app'
const PATH = '/thanks/support'
const PAGE_TITLE = 'Thanks — Battery Sensei Ongoing Support'
const PAGE_DESC =
  'Subscription active. Your ongoing-support license is unlocked — open Sensei to enter your key and keep new releases flowing.'

export const Route = createFileRoute('/thanks/support')({
  // Same shape as /thanks/lifetime — noindex (per-checkout query param,
  // no organic value), follow (so footer/nav still pass equity).
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
  // 謝 = "thanks / gratitude". Matches /thanks/lifetime; the divergence
  // happens in body copy + the "next" line (renewal vs lifetime install).
  component: () => <ThanksPage tier="support" kanji="謝" />,
})
