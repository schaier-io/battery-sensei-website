import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Download as DownloadIcon, Mail, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

// How long to wait after the page lands before kicking off the ninja
// animation. The longest existing Reveal delay is ~580ms (CTA bar), so
// 3000ms guarantees the text moment has fully settled — visitors read
// "Welcome to Lifetime" before the bow draws their eye away.
const VIDEO_DELAY_MS = 3000
// Fade durations on either side of the play. 520ms in feels intentional
// (slightly slower than text fades), 760ms out gives the bow a calm
// dissolve rather than a hard cut.
const VIDEO_FADE_IN_MS = 520
const VIDEO_FADE_OUT_MS = 760

type Tier = 'lifetime' | 'support'

/**
 * Post-purchase thank-you page shown after a successful Polar checkout
 * (or after the fake-checkout overlay in dev). Receives an optional
 * `checkout_id` query param injected by Polar's success URL template.
 *
 * The ninja video is a small MP4 that plays ONCE on land (no loop), no
 * controls, no border — `mix-blend-mode: multiply` against the washi
 * page background blends the video's light backdrop into the page tone
 * so the ninja looks like he's bowing on the same paper, not floating
 * on a video card. `playsInline` keeps iOS from fullscreen-popping it;
 * `prefers-reduced-motion` users see the first frame as a still poster.
 */
export function ThanksPage({ tier, kanji }: { tier: Tier; kanji: string }) {
  const { t } = useTranslation()
  const search = useSearch({ strict: false }) as { checkout_id?: string }
  const checkoutId = search.checkout_id
  const key = `thanks.${tier}`

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <Hanko kanji={kanji} className="mb-6" />
            <Reveal as="p" delay={120} className="kicker-row mb-4">
              {t('thanks.kicker')}
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
              {/* Trans renders rich-text accents from the locale string.
                  <0> wraps the in-app menu path so it sets in the display
                  serif italic — the way Apple writes "System Settings →
                  General" in its own marketing copy.
                  <1> wraps the device-count phrase ("three Macs", "up to
                  five Macs") in the body text-color so the headline number
                  pops above the surrounding sumi-soft body. */}
              <Trans
                i18nKey={`${key}.body`}
                components={[
                  <em className="font-display italic font-medium text-sumi" />,
                  <span className="font-medium text-sumi" />,
                ]}
              />
            </Reveal>
            {checkoutId && (
              <Reveal as="p" delay={340} className="mt-3 text-[11px] uppercase tracking-[0.18em] text-nezumi">
                {t('thanks.checkoutHint', { id: checkoutId })}
              </Reveal>
            )}
          </div>
        </section>

        {/* Ninja bow — fades in after the text moment, plays once, fades
            out at the end. `mix-blend-mode: multiply` blends the video's
            light backdrop into the page's washi tone so the ninja reads
            as a brush-ink figure painted on the same paper, not a video
            clip on a white card. `playsInline` keeps iOS from fullscreen-
            popping it; `prefers-reduced-motion` is honored by the
            DelayedBowVideo wrapper which simply doesn't autoplay. */}
        <section className="mx-auto max-w-2xl px-5 pb-2 pt-10 sm:px-6 md:pt-14">
          <DelayedBowVideo />
        </section>

        <section className="zen-section mx-auto max-w-3xl px-5 pt-2 sm:px-6">
          {/* Delivery card — explicit sender + spam guidance so visitors
              know exactly which message to look for and where to write
              if it never lands. The kanji 鍵 (kagi / key) anchors the
              card as a "key arrives here" piece of brand language; the
              ruled brush-divider mirrors the LanguageSwitcher header so
              the card feels native to the site's washi-and-ink system. */}
          <Reveal delay={480}>
            <DeliveryCard />
          </Reveal>

          <Reveal
            as="p"
            delay={540}
            className="mt-6 text-center text-[0.9375rem] leading-[1.65] text-sumi-soft"
          >
            {t(`${key}.next`)}
          </Reveal>

          {/* CTA row — three actions ordered by buyer intent.
                Primary  · Open Sensei  (most buyers already installed during the 5-day trial)
                Secondary · Download    (newcomers who paid before downloading)
                Tertiary · Back to home (escape hatch, plain link) */}
          <Reveal
            delay={620}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
          >
            <a
              href="batterysensei://open"
              className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Sparkles
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              {t('thanks.openApp')}
            </a>
            <a
              href="/download/latest"
              className="group inline-flex h-11 items-center gap-2.5 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-6 text-sm font-medium text-sumi transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <DownloadIcon
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              {t('thanks.downloadApp')}
            </a>
            <Link
              to="/"
              className="inline-flex h-11 items-center gap-2 px-4 text-sm text-sumi-soft transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              {t('thanks.backToHome')}
            </Link>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

/**
 * Delivery card — surfaces the email sender + spam-folder reassurance
 * so a buyer knows exactly which message to look for. Brand parity:
 * 鍵 (kagi / key) kanji + tracked label + brush rule mirrors the
 * LanguageSwitcher dropdown header so the card feels native to the
 * site's ink-on-washi system rather than bolted on.
 *
 * The two paragraphs use rich-text components so the locale string can
 * bold the sender ("Polar") and the support address without forcing
 * the translator to assemble HTML themselves.
 */
function DeliveryCard() {
  const { t } = useTranslation()
  return (
    <div
      role="note"
      aria-label={t('thanks.delivery.label')}
      className="mx-auto max-w-xl rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-5 py-5 sm:px-6"
    >
      <div className="flex items-center gap-3">
        {/* 鍵 = "key". Matches the kanji-seal vocabulary the rest of the
            site uses (基 features, 価 pricing, etc.). */}
        <span
          aria-hidden
          className="font-jp text-base leading-none text-hinomaru/85 w-5 text-center"
        >
          鍵
        </span>
        <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
          {t('thanks.delivery.label')}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
        />
        <Mail aria-hidden className="h-3.5 w-3.5 text-nezumi" strokeWidth={1.7} />
      </div>
      <p className="mt-3 text-[0.875rem] leading-[1.6] text-sumi-soft">
        <Trans
          i18nKey="thanks.delivery.from"
          components={[<span className="font-semibold text-sumi" />]}
        />
      </p>
      <p className="mt-1.5 text-[0.875rem] leading-[1.6] text-sumi-soft">
        <Trans
          i18nKey="thanks.delivery.spam"
          components={[
            <a
              href={`mailto:${t('thanks.delivery.supportEmail')}?subject=License%20key%20resend`}
              className="font-semibold text-sumi underline decoration-[var(--line-strong)] underline-offset-[3px] hover:decoration-sumi transition-colors"
            />,
          ]}
        />
      </p>
    </div>
  )
}

/**
 * Self-contained bow video that holds invisible for VIDEO_DELAY_MS so
 * the hero text + CTA fan out first, then fades in *as the bow actually
 * starts moving*, plays once, and dissolves as the clip ends. No
 * controls, no caption, no looping.
 *
 * Three phases tracked in `phase`:
 *   - 'hidden'  → opacity 0, video paused at frame 0 (initial)
 *   - 'in'      → opacity 1, video playing (after `playing` event fires)
 *   - 'out'     → opacity 0, video paused at last frame (after `ended`)
 *
 * Timing is two-stage:
 *   1. At VIDEO_DELAY_MS we kick off `play()`. We do NOT fade in yet.
 *   2. The browser fires `onPlaying` once a real frame has decoded; at
 *      that moment we flip phase → 'in'. This avoids the small window
 *      where a slow decode would otherwise fade in a blank/black frame.
 *      A 350 ms safety timeout falls back to fading in regardless, in
 *      case `playing` never fires (autoplay rejection, codec hiccup).
 *
 * `prefers-reduced-motion` skips play() entirely — the still first
 * frame fades in once and stays put, which is the gentler thing to
 * show someone who has asked the browser to settle down.
 *
 * `preload="auto"` lets the browser fetch the frames during the 3 s
 * idle wait so play() doesn't have to wait on the network when it
 * eventually fires.
 */
function DelayedBowVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden')

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const timers: number[] = []
    const startTimer = window.setTimeout(() => {
      const el = videoRef.current
      if (!el) return
      if (prefersReducedMotion) {
        // Reduced-motion path: skip play, just bring the poster in.
        setPhase('in')
        return
      }
      // Kick off playback. The matching onPlaying handler flips phase
      // → 'in' as soon as a real frame decodes. play() can reject on
      // backgrounded tabs or hostile autoplay policies — swallow it
      // silently and let the fallback timer reveal the still frame.
      el.play().catch(() => {})
      // Safety net: if `playing` never fires within 350 ms, fade in
      // anyway so the visitor isn't staring at empty space.
      timers.push(
        window.setTimeout(() => setPhase((p) => (p === 'hidden' ? 'in' : p)), 350),
      )
    }, VIDEO_DELAY_MS)
    timers.push(startTimer)

    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      src="/ninja-thanks.mp4"
      muted
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
      controlsList="nodownload noplaybackrate nofullscreen"
      onPlaying={() => setPhase((p) => (p === 'hidden' ? 'in' : p))}
      onEnded={() => setPhase('out')}
      // Two transition durations — slower on the way out so the bow
      // settles into the page rather than blinking off. CSS transition
      // honors whichever target opacity is set on the element.
      style={{
        transitionProperty: 'opacity',
        transitionDuration:
          phase === 'out' ? `${VIDEO_FADE_OUT_MS}ms` : `${VIDEO_FADE_IN_MS}ms`,
        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        opacity: phase === 'in' ? 1 : 0,
      }}
      className="pointer-events-none mx-auto block aspect-video w-full max-w-[440px] select-none bg-transparent [mix-blend-mode:multiply]"
    />
  )
}
