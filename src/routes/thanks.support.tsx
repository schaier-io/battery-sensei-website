import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ThanksPage } from '#/components/ThanksPage'

// Same shape as `/thanks/lifetime`: Polar drops a UUID-ish checkout id
// into the success URL. Anything weird collapses to undefined so the
// kicker line never displays an array literal or `[object Object]`.
const thanksSearchSchema = z.object({
  checkout_id: z.string().min(1).max(80).optional(),
}).catch({})

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/thanks/support'
const PAGE_TITLE = 'Thanks — Battery Sensei Ongoing Support'
const PAGE_DESC =
  'Subscription active. Your ongoing-support license is unlocked. Open Sensei to enter your key and keep new releases flowing.'

export const Route = createFileRoute('/thanks/support')({
  validateSearch: thanksSearchSchema,
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
