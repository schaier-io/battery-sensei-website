import { createFileRoute } from '@tanstack/react-router'
import { FromSenseiPage } from '#/components/FromSenseiPage'
import {
  downloadHref,
  referralSearchSchema,
  sanitizeSenseiId,
} from '#/lib/referral'

/**
 * Viewer-side referral landing page: /from/$id
 *
 * The macOS app stamps every shared battery card with a QR code pointing at
 *
 *   /from/<senseiID>?card=<rescue|wrapped|health|honors>&ref=<id>
 *     &utm_source=card&utm_medium=share&utm_campaign=<card>
 *
 * (see `SenseiIdentity.shareURL` in the app repo). This page greets the
 * viewer on the sharer's behalf, mirrors the card they just scanned, and
 * funnels one tap into the download — with the attribution params intact so
 * share→install conversion is measurable.
 */

const PAGE_TITLE = 'A Sensei sent you — Battery Sensei'
const PAGE_DESC =
  "A friend's Battery Sensei card led you here. Quiet battery care for your MacBook: smart alerts, a healthier charge limit, a plain-English battery diary. Free 5-day trial, no card."

export const Route = createFileRoute('/from/$id')({
  validateSearch: referralSearchSchema,
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      // Per-user referral URLs (one per Sensei ID × card type): noindex so
      // the QR namespace never floods search with near-duplicates, follow so
      // the nav/footer links still pass equity — same stance as /thanks/*.
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    // No canonical on purpose: there is no indexable canonical variant of a
    // per-user referral URL, and rel=canonical alongside noindex would send
    // crawlers conflicting signals.
  }),
  component: FromRoute,
})

function FromRoute() {
  const { id } = Route.useParams()
  const search = Route.useSearch()
  return (
    <FromSenseiPage
      senseiId={sanitizeSenseiId(id)}
      card={search.card ?? null}
      downloadUrl={downloadHref(search)}
    />
  )
}
