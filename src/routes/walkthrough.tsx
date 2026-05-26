import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, PlayCircle, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

const SITE_URL = 'https://battery-sensei.app'
const PATH = '/walkthrough'
const PAGE_TITLE = 'Walkthrough — Battery Sensei'
const PAGE_DESC =
  '60-second walkthrough of Battery Sensei in motion, side by side with AlDente, BatFi, coconutBattery, iStat Menus, and the built-in macOS Charge Limit. Video coming soon.'
const EMAIL = 'info@battery-sensei.app'

export const Route = createFileRoute('/walkthrough')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      // No video yet — keep this page out of search until the embed is live so
      // we don't burn a "Watch the walkthrough" SERP slot on a placeholder.
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: WalkthroughPage,
})

function WalkthroughPage() {
  const { t } = useTranslation()
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('walkthrough.backToCompare')}
            </Link>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="動" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t('walkthrough.kicker')}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('walkthrough.heading')}
              <span className="block italic text-sumi-soft font-normal">
                {t('walkthrough.headingItalic')}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={320}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('walkthrough.body')}
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-2 pt-10 sm:px-6 md:pt-14">
          <Reveal delay={420}>
            <VideoPlaceholder
              badge={t('walkthrough.videoBadge')}
              caption={t('walkthrough.videoCaption')}
            />
          </Reveal>
        </section>

        <section className="zen-section mx-auto max-w-3xl px-5 pt-6 sm:px-6">
          <Reveal delay={520}>
            <div className="paper-card relative overflow-hidden p-6 md:p-7">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-12 -bottom-16 h-40 w-40 rounded-full bg-kin/[0.06] blur-3xl"
              />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-md">
                  <p className="display-title mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
                    {t('walkthrough.notifyHeading')}
                  </p>
                  <p className="text-[14px] leading-[1.55] text-sumi-soft">
                    {t('walkthrough.notifyBody')}
                  </p>
                </div>
                <a
                  href={`mailto:${EMAIL}?subject=Walkthrough%20notify%20me`}
                  className="btn-sumi group inline-flex h-11 items-center gap-2 self-start rounded-md px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
                >
                  <Mail
                    className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                    strokeWidth={1.8}
                  />
                  {t('walkthrough.notifyCta')}
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

/**
 * 16:9 placeholder for the future walkthrough video. Soft hinomaru wash +
 * centered play icon, "Video coming soon" badge. Drop the <video> in once
 * the cut is ready; the surrounding chrome (border, shadow, padding) stays.
 */
function VideoPlaceholder({ badge, caption }: { badge: string; caption: string }) {
  return (
    <figure className="paper-card relative overflow-hidden p-3 md:p-4">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_75%,#fff)]"
        aria-label={badge}
      >
        {/* Ambient washes — diagonal hinomaru + kin so the empty plate has
            depth without competing with the future video frame. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-hinomaru/[0.07] blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-kin/[0.05] blur-3xl"
        />
        {/* Faint washi grain via repeating linear gradient — matches body. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0 23px, rgba(28,26,23,0.04) 23px 24px)',
          }}
        />
        {/* Center play affordance — a glass disc with a brushed play glyph. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border border-hinomaru/25 bg-[color-mix(in_oklab,var(--washi)_55%,#fff)] shadow-[0_18px_40px_-22px_rgba(28,26,23,0.35)] backdrop-blur-sm">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-hinomaru/[0.06] animate-gentle-bob"
            />
            <PlayCircle
              className="relative h-9 w-9 text-hinomaru"
              strokeWidth={1.4}
              aria-hidden
            />
          </span>
          <span className="font-jp text-[10px] uppercase tracking-[0.32em] text-hinomaru/80">
            動 画
          </span>
          <span className="inline-block rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)] px-3 py-1 text-[11px] font-medium text-sumi">
            {badge}
          </span>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[12px] tracking-[0.06em] text-nezumi">
        {caption}
      </figcaption>
    </figure>
  )
}
