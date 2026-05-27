import { Link, useSearch } from '@tanstack/react-router'
import { track } from '@vercel/analytics'
import {
  ArrowLeft,
  Download as DownloadIcon,
  ExternalLink,
  Mail,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { LicenseRevealCard } from '#/components/LicenseRevealCard'
import { CUSTOMER_PORTAL_URL } from '#/lib/polar'

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
// Delay between the video starting its fade-out and the license card
// starting its fade-in. Half the video's fade-out duration so the two
// transitions cross-fade through the midpoint without either feeling
// abrupt — the slot is never visually empty.
const LICENSE_CROSSFADE_MS = Math.round(VIDEO_FADE_OUT_MS / 2)
// Reduced-motion shortcut: if the user has asked the browser to settle
// down, we skip the bow entirely and reveal the license card sooner.
const REDUCED_MOTION_REVEAL_MS = 800

type Tier = 'lifetime' | 'support'

/**
 * Post-purchase thank-you page shown after a successful Polar checkout
 * (or after the fake-checkout overlay in dev). Receives an optional
 * `checkout_id` query param injected by Polar's success URL template.
 *
 * Single "moment slot"
 * --------------------
 * The ninja video used to play and then leave a yawning gap of empty
 * page below the headline. We now treat the slot as a stage: the bow
 * plays once, fades out, and then the license-delivery block fades IN
 * inside the same physical space. The slot is fixed-height (aspect-
 * video on the bow side, matched min-height on the license side) so
 * the page doesn't reflow during the cross-fade.
 */
export function ThanksPage({ tier, kanji }: { tier: Tier; kanji: string }) {
  const { t } = useTranslation()
  const search = useSearch({ strict: false }) as { checkout_id?: string }
  const checkoutId = search.checkout_id
  const key = `thanks.${tier}`

  // Track the purchase exactly once per mount. This is the *reliable*
  // conversion event — visitors only land here after Polar (or the dev
  // fake-checkout) confirms a successful charge. Vercel Analytics
  // dedupes by event id, but we also gate on a session-storage flag so
  // a soft refresh or back-then-forward doesn't double-count.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = `bs_purchase_tracked:${tier}:${checkoutId ?? 'unknown'}`
    if (window.sessionStorage.getItem(flag)) return
    try {
      track('purchase_complete', {
        tier,
        ...(checkoutId ? { checkoutId } : {}),
      })
      window.sessionStorage.setItem(flag, '1')
    } catch {
      // Analytics never blocks the page.
    }
  }, [tier, checkoutId])

  // `licenseShown` flips true when the bow has finished its fade-out
  // (or sooner under reduced-motion). The cross-fade is parent-driven
  // so the two children never overlap in flow — both absolute-pos
  // inside the slot wrapper.
  const [licenseShown, setLicenseShown] = useState(false)

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

        {/* License key reveal — sits above the bow video so the buyer
            sees their key first, then the celebration. Self-contained:
            fetches /api/checkout/[id] using the same `checkout_id` query
            param Polar appends to the success URL, strips the URL on
            mount, gracefully degrades to a "find your key in the portal"
            card on 410 / failure. Renders nothing when no checkout_id is
            present (legacy / resent links). */}
        <LicenseRevealCard checkoutId={checkoutId} />

        {/* The "moment slot" — first the bow plays, then the license-
            delivery card fades in over the same space. Two absolutely-
            positioned children inside a relative wrapper with a fixed
            min-height so the page doesn't shift during the cross-fade.
            The min-height matches a 16:9 video at the max-width below
            (440 / 16 * 9 ≈ 248 px) plus generous breathing room for
            the license card on the other side. */}
        <section className="mx-auto max-w-2xl px-5 pb-2 pt-10 sm:px-6 md:pt-14">
          <div className="relative mx-auto w-full max-w-[440px] min-h-[300px] sm:min-h-[320px]">
            <DelayedBowVideo
              hidden={licenseShown}
              onComplete={() => {
                // Wait the cross-fade interval so the video has begun
                // its fade-out before we start fading the license card
                // in. The slot is never visually empty between the two.
                window.setTimeout(() => setLicenseShown(true), LICENSE_CROSSFADE_MS)
              }}
            />
            <LicenseDelivery visible={licenseShown} />
          </div>
        </section>

        <section className="zen-section mx-auto max-w-3xl px-5 pt-2 sm:px-6">
          <Reveal
            as="p"
            delay={540}
            className="mt-2 text-center text-[0.9375rem] leading-[1.65] text-sumi-soft"
          >
            {t(`${key}.next`)}
          </Reveal>

          {/* CTA row — three actions ordered by buyer intent.
                Primary  · Open Sensei      (most buyers already installed during the 5-day trial)
                Secondary · Manage purchase (Polar customer portal — receipts, invoices, license resend)
                Tertiary · Back to home     (escape hatch, plain link)

              Download moved INTO the license card above where it's the
              natural next action; keeping it here too would double the
              affordance for the same intent. */}
          <Reveal
            delay={620}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
          >
            <Link
              to="/"
              className="inline-flex h-11 items-center gap-2 px-4 text-sm text-sumi-soft transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi sm:order-first"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              {t('thanks.backToHome')}
            </Link>
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
              href={CUSTOMER_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-11 items-center gap-2.5 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-6 text-sm font-medium text-sumi transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <ExternalLink
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              {t('thanks.managePurchase')}
            </a>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

/**
 * License-delivery block. Renders inside the same "moment slot" the
 * bow video occupied — fades in after the video has finished and
 * begun its fade-out. Surfaces the email sender + spam-folder
 * reassurance so a buyer knows exactly which message to look for, and
 * pairs it with a clear download CTA (the natural next action once
 * the key arrives).
 *
 * Brand parity: 鍵 (kagi / key) kanji + tracked label + brush rule
 * mirrors the LanguageSwitcher dropdown header so the card feels
 * native to the site's ink-on-washi system.
 */
function LicenseDelivery({ visible }: { visible: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      role="note"
      aria-label={t('thanks.delivery.label')}
      // Absolute fill of the parent slot so it occupies exactly the
      // space the video vacated. `pointer-events` flips with visibility
      // so links don't get pressed while invisible behind the fading
      // video; aria-hidden mirrors the same for screen readers.
      aria-hidden={!visible}
      className="absolute inset-0 flex flex-col rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-6 py-6 sm:px-7 sm:py-7"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transitionProperty: 'opacity, transform',
        transitionDuration: '620ms',
        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
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
      <p className="mt-4 text-[0.875rem] leading-[1.6] text-sumi-soft">
        <Trans
          i18nKey="thanks.delivery.from"
          components={[<span className="font-semibold text-sumi" />]}
        />
      </p>
      <p className="mt-2 text-[0.875rem] leading-[1.6] text-sumi-soft">
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
      {/* Download CTA — the natural next action once the key arrives.
          Sized full-width inside the card so it reads as the resolution
          of the delivery story rather than a separate affordance. */}
      <div className="mt-6 flex justify-center">
        <a
          href="/download/latest"
          className="group inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-5 text-[0.875rem] font-medium text-sumi transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[color-mix(in_oklab,var(--washi)_40%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
        >
          <DownloadIcon
            className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
            strokeWidth={1.7}
          />
          {t('thanks.delivery.downloadCta')}
        </a>
      </div>
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
 * `prefers-reduced-motion` skips play() entirely — the parent gets an
 * `onComplete` fired after `REDUCED_MOTION_REVEAL_MS` so the license
 * card reveals quickly without forcing the video to animate.
 *
 * `preload="auto"` lets the browser fetch the frames during the 3 s
 * idle wait so play() doesn't have to wait on the network when it
 * eventually fires.
 *
 * `hidden` is set by the parent once the license card has taken over
 * the slot so the dissolved-out video can't trap focus or accept
 * pointer events behind the new content.
 */
function DelayedBowVideo({
  onComplete,
  hidden,
}: {
  onComplete: () => void
  hidden: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden')
  const completedRef = useRef(false)

  const fireComplete = () => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const timers: number[] = []

    if (prefersReducedMotion) {
      // Reduced-motion path: skip the bow entirely. The parent reveals
      // the license card after REDUCED_MOTION_REVEAL_MS so the page
      // still has a paced moment of arrival rather than an instant pop.
      timers.push(window.setTimeout(fireComplete, REDUCED_MOTION_REVEAL_MS))
      return () => {
        for (const id of timers) window.clearTimeout(id)
      }
    }

    const startTimer = window.setTimeout(() => {
      const el = videoRef.current
      if (!el) {
        // No element to play — let the parent reveal the card anyway
        // so the page doesn't stall on the bow slot forever.
        fireComplete()
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
      // Belt-and-braces completion: if `ended` never fires (codec
      // glitch, network stall mid-clip), surface the license card
      // after a generous fallback so the page never appears frozen.
      timers.push(window.setTimeout(fireComplete, 12_000))
    }, VIDEO_DELAY_MS)
    timers.push(startTimer)

    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      onEnded={() => {
        setPhase('out')
        fireComplete()
      }}
      // Two transition durations — slower on the way out so the bow
      // settles into the page rather than blinking off. CSS transition
      // honors whichever target opacity is set on the element.
      style={{
        transitionProperty: 'opacity',
        transitionDuration:
          phase === 'out' ? `${VIDEO_FADE_OUT_MS}ms` : `${VIDEO_FADE_IN_MS}ms`,
        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        opacity: phase === 'in' ? 1 : 0,
        // Once the license card has taken over, drop the video out of
        // hit-testing so it can't trap pointer/focus behind the new
        // content. visibility:hidden also lets the parent recover the
        // GPU layer when the video is no longer needed.
        visibility: hidden ? 'hidden' : 'visible',
      }}
      className="pointer-events-none absolute inset-0 m-auto block aspect-video w-full max-w-[440px] select-none bg-transparent [mix-blend-mode:multiply]"
    />
  )
}
