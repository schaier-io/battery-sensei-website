import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ThanksPage } from '#/components/ThanksPage'

// Polar substitutes `{CHECKOUT_ID}` into the success URL — a UUID-ish
// string ≤80 chars. Anything else (array, missing, oversized) collapses
// to undefined so the component never renders garbage like
// `[object Object]` inside the kicker line.
const thanksSearchSchema = z.object({
  checkout_id: z.string().min(1).max(80).optional(),
}).catch({})

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/thanks/lifetime'
const PAGE_TITLE = 'Thanks — Battery Sensei Lifetime'
const PAGE_DESC =
  'Payment confirmed. Your Battery Sensei lifetime license is on its way. Open Sensei to enter your key and pick up where you left off.'

export const Route = createFileRoute('/thanks/lifetime')({
  validateSearch: thanksSearchSchema,
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
