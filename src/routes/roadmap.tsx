import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { FeatureBoard } from '#/components/board/FeatureBoard'

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
  component: RoadmapPage,
})

function RoadmapPage() {
  const { t } = useTranslation()
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
            <FeatureBoard />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
