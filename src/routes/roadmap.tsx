import { createFileRoute } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { FeatureBoard } from '#/components/board/FeatureBoard'

// First board page for the server render (lib/roadmap-page.ts runs this
// per request). On client navigation it returns null and the board fetches
// /api/feature-requests itself, so the route change never waits on it.
// A slow or hung DB must not hold the page: after this, render without the
// board and let the client fetch it.
const BOARD_QUERY_TIMEOUT_MS = 3000

const loadBoardPage = createIsomorphicFn()
  .server(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const { listPublicFeatureRequests } = await import('../../lib/feature-board-list.js')
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), BOARD_QUERY_TIMEOUT_MS)
      })
      const page = await Promise.race([listPublicFeatureRequests(), timeout])
      if (page === null) console.error('roadmap loader: board query timed out')
      return page
    } catch (error) {
      // A DB outage must not fail the page: the board falls back to its
      // client fetch, which shows the retry card.
      console.error('roadmap loader: board query failed', error)
      return null
    } finally {
      clearTimeout(timer)
    }
  })
  .client(() => null)

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/roadmap'
const PAGE_TITLE = 'Roadmap & Feature Requests — Battery Sensei'
const PAGE_DESC =
  'See what Battery Sensei is building next, vote on feature requests with your license key, and suggest your own ideas. Every request is reviewed by hand.'

export const Route = createFileRoute('/roadmap')({
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
  }),
  loader: () => loadBoardPage(),
  // Drop the server snapshot once the visitor leaves: on a later client
  // visit the loader returns null and the board fetches live data, instead
  // of remounting from cached (pre-vote) SSR data.
  gcTime: 0,
  component: RoadmapPage,
})

function RoadmapPage() {
  const { t } = useTranslation()
  const initialPage = Route.useLoaderData()
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section px-5 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 flex flex-col items-center text-center">
              <Hanko kanji="道" className="mb-5" />
              <Reveal as="p" delay={120} className="kicker-row mb-4">
                {t('board.kicker')}
              </Reveal>
              <Reveal as="h1" delay={200} className="section-heading text-sumi">
                {t('board.heading')}{' '}
                <span className="italic font-normal text-sumi-soft">{t('board.headingItalic')}</span>
              </Reveal>
              <Reveal
                as="p"
                delay={280}
                className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
              >
                {t('board.intro')}
              </Reveal>
            </div>
            <FeatureBoard initialPage={initialPage} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
