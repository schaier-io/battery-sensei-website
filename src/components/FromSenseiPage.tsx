import { track } from '@vercel/analytics'
import { ArrowRight, Download as DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HomeLink } from '#/components/HomeLink'
import { MacOnlyConfirm } from '#/components/MacOnlyConfirm'
import { NotOnMacBanner } from '#/components/NotOnMacBanner'
import { Footer } from '#/components/sections/Footer'
import { Nav } from '#/components/sections/Nav'
import { Hanko } from '#/components/zen/Hanko'
import { RescueReceipt } from '#/components/zen/RescueReceipt'
import { Reveal } from '#/components/zen/Reveal'
import { SharedCardMock } from '#/components/zen/SharedCardMock'
import { TRIAL_DAYS } from '#/lib/polar'
import type { CardType } from '#/lib/referral'

type CardVariant = CardType | 'default'

/** One hanko per card mood: 救 rescue, 暦 recap/almanac, 健 health,
 * 誉 honor, 縁 the bond that brought the viewer here (generic). */
const CARD_KANJI: Record<CardVariant, string> = {
  rescue: '救',
  wrapped: '暦',
  health: '健',
  honors: '誉',
  default: '縁',
}

/**
 * Viewer-side referral landing page for shared battery cards (`/from/$id`).
 * Someone scanned the QR on a friend's 900×900 share card; this page credits
 * the sharer (Sensei ID greeting), mirrors the card's mood (copy variant per
 * `card` type), and lands the one CTA that matters: download, with the
 * incoming attribution params still attached.
 */
export function FromSenseiPage({
  senseiId,
  card,
  downloadUrl,
}: {
  /** Sanitized sharer id from the path, or null → generic greeting. */
  senseiId: string | null
  /** Validated card type from `?card=`, or null → default copy. */
  card: CardType | null
  /** `/download/latest` with the incoming `ref` + `utm_*` carried through. */
  downloadUrl: string
}) {
  const { t } = useTranslation()
  const variant: CardVariant = card ?? 'default'
  const key = `from.cards.${variant}`

  // Fires on every CTA click (both the direct Mac path and before the
  // non-Mac confirm dialog opens — the anchor's onClick runs first either
  // way, so this never double-counts). Analytics must never block the
  // navigation, hence the swallow.
  const trackDownloadIntent = () => {
    try {
      track('referral_download_click', {
        card: variant,
        ...(senseiId ? { ref: senseiId } : {}),
      })
    } catch {
      // Analytics never blocks the download.
    }
  }

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <Hanko kanji={CARD_KANJI[variant]} className="mb-6" />
            <Reveal as="p" delay={120} className="kicker-row mb-4">
              {senseiId
                ? t('from.kicker', { id: senseiId })
                : t('from.kickerGeneric')}
            </Reveal>
            <Reveal
              as="h1"
              delay={200}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t(`${key}.heading`)}
              <span className="block italic text-sumi-soft font-normal">
                {t(`${key}.headingItalic`)}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={300}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t(`${key}.body`)}
            </Reveal>
            {/* The card they just scanned. The whole page is written as
                "about that card", so showing its shape is what makes the
                claim legible — a wall of prose about an artwork the visitor
                can no longer see is not an argument. Illustrative only; the
                caption says so, and no figure here is a reading off the
                sharer's Mac. */}
            <Reveal delay={360} className="mt-10 w-full max-w-[20rem]">
              {/* text-left: the mocks are laid out like the real cards, so
                  they must not inherit the hero's centering. */}
              <figure className="m-0 text-left">
                {variant === 'rescue' ? (
                  <RescueReceipt />
                ) : (
                  <SharedCardMock variant={variant} />
                )}
                <figcaption className="mt-4 text-[12px] leading-relaxed text-nezumi">
                  {t('from.cardMock.caption')}
                </figcaption>
              </figure>
            </Reveal>
            {/* QR codes get scanned by phones, so most of this page's
                traffic cannot run the app at all. The banner renders
                nothing on a Mac (and during SSR), so the wrapper collapses
                to zero height for everyone else. */}
            <div className="mt-10 w-full max-w-md text-left">
              <NotOnMacBanner variant="download" />
            </div>
            <Reveal
              delay={440}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <MacOnlyConfirm
                onConfirm={() => window.location.assign(downloadUrl)}
              >
                {({ onClick }) => (
                  <a
                    href={downloadUrl}
                    onClick={(event) => {
                      trackDownloadIntent()
                      onClick(event)
                    }}
                    className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
                  >
                    <DownloadIcon
                      className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    {t('common.downloadMac')}
                  </a>
                )}
              </MacOnlyConfirm>
              <HomeLink className="group zen-link-lift inline-flex h-11 items-center gap-1.5 px-3 text-[0.875rem] font-medium text-sumi-soft hover:text-sumi">
                {t('from.exploreCta')}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-0.5"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </HomeLink>
            </Reveal>
            <Reveal as="p" delay={520} className="spec-strip mt-8">
              {t('from.specStrip', { trial: TRIAL_DAYS })}
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
