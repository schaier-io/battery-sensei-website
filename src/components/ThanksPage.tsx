import { useSearch } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { track } from '@vercel/analytics'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { LicenseRevealCard } from '#/components/LicenseRevealCard'

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
// abrupt — the page is never visually empty.
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
  const lifetimeScope = t('licenseScope.lifetime')
  const yearlyScope = t('licenseScope.yearly')
  const lifetimeScopeShort = t('licenseScope.lifetimeShort')
  const yearlyScopeShort = t('licenseScope.yearlyShort')
  const search = useSearch({ strict: false }) as { checkout_id?: string }
  // Snapshot the id once on first render. We strip the URL via
  // history.replaceState below so a later read of useSearch would come
  // back empty — but the polling card may not mount until after the
  // bow video finishes (3–12 s), so we need a stable copy here.
  const checkoutIdRef = useRef<string | null>(null)
  const purchaseTrackedRef = useRef(false)
  if (checkoutIdRef.current === null && search.checkout_id) {
    checkoutIdRef.current = search.checkout_id
  }
  const checkoutId = checkoutIdRef.current ?? search.checkout_id
  // No id means this is a revisit, a bookmark or a redirect that ate the
  // query string — not the moment of purchase. The bow is a celebration
  // of something that already happened, so we skip it and put the
  // install card (download, key whereabouts, portal) on screen instead.
  const hasCheckoutId = Boolean(checkoutId)
  const key = `thanks.${tier}`

  // Strip ?checkout_id=… from the visible URL the moment the page
  // hydrates so a refresh / share / back-forward navigation can never
  // re-trigger a key fetch with a stale id (and so the address bar
  // doesn't expose the id while the bow video plays).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.search) return
    const { pathname } = window.location
    window.history.replaceState({}, '', pathname)
  }, [])

  // Track a confirmed checkout once per mount. Keep the checkout id out of
  // analytics and browser storage; an in-memory ref only guards React effect
  // replays. A revisit without Polar's checkout id is not counted as a sale.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!checkoutId || purchaseTrackedRef.current) return
    purchaseTrackedRef.current = true
    try {
      track('purchase_complete', {
        tier,
      })
    } catch {
      // Analytics never blocks the page.
    }
  }, [tier, checkoutId])

  // `licenseShown` flips true when the bow has finished its fade-out
  // (or sooner under reduced-motion). The cross-fade is parent-driven
  // so the two children never overlap in flow — both absolute-pos
  // inside the slot wrapper.
  const [licenseShown, setLicenseShown] = useState(false)
  // Order id resolved by the delivery card's polling. Hoisted to the
  // page so we can render it in the hero area, not just inside the
  // card header. Stays null until the API call returns the order id
  // (typically within ~1 s of the card mounting). When non-null, a
  // small chip fades in below the body copy.
  const [orderId, setOrderId] = useState<string | null>(null)

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 pb-0 sm:px-6">
          {/* Top-left back-to-home anchor — quiet escape hatch above
              the celebratory hero. Single placement per subpage
              (the bottom-of-page duplicate was removed). */}
          <HomeLink
            className="group zen-link-lift mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] text-sumi-soft hover:text-sumi"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
              strokeWidth={1.8}
              aria-hidden
            />
            {t('thanks.backToHome')}
          </HomeLink>
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
                {t(`${key}.headingItalic`, {
                  lifetimeScopeShort,
                  yearlyScopeShort,
                })}
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
              {/* Body intentionally celebratory, NOT instructional —
                  the install + key card below handles "how do I use
                  this." Duplicating instructions here pads the page
                  and dilutes the moment. <0> wraps the device-count
                  phrase so it pops in body text-color above the
                  surrounding sumi-soft. */}
              <Trans
                i18nKey={`${key}.body`}
                values={{
                  lifetimeScope,
                  yearlyScope,
                }}
                components={[
                  <span className="font-medium text-sumi" />,
                ]}
              />
            </Reveal>
            {/* Order id resolved by the polling card. Fades in once the API
                returns it (usually ~1 s after the card mounts) so the buyer
                has a reference they can quote in support without scrolling
                to the card header.

                The slot only reserves space once there is an id on the way.
                It used to render a permanent `&nbsp;` line, which on the
                no-`checkout_id` path (a bookmark or a revisit, where no id is
                ever coming) left a visible empty band under the hero that
                read as a rendering fault. */}
            {orderId && (
              <p
                className="mt-4 text-center text-[11px] uppercase tracking-[0.18em] text-nezumi motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
                aria-live="polite"
              >
                {t('thanks.orderLabel')}{' '}
                <span className="font-mono normal-case tracking-[0.04em] text-sumi-soft">
                  #{orderId}
                </span>
              </p>
            )}
          </div>
        </section>

        {/* The bow video plays first — gives Polar a free 3–12 s of
            quiet time before we start polling for the license key. By
            the time the bow finishes, the key has almost always already
            been provisioned upstream, so the LicenseRevealCard below
            usually goes straight from loading → ready without ever
            showing the "Polar is finishing the paperwork" state.

            The OUTER section has NO padding so the whole slot can
            collapse to a hairline of nothing once the video fades —
            putting padding on an outer wrapper around a collapsing
            element leaves a permanent ghost of empty space (the bug
            this section originally had). All vertical space lives on
            the inner collapsing div, including the top padding that
            spaces it from the hero copy. */}
        <section className="mx-auto max-w-2xl px-5 sm:px-6">
          <div
            className="relative mx-auto w-full max-w-[440px]"
            style={{
              maxHeight: licenseShown ? 0 : 380,
              paddingTop: licenseShown ? 0 : '2.5rem',
              overflow: 'hidden',
              transitionProperty: 'max-height, padding-top',
              transitionDuration: '620ms',
              transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            aria-hidden={licenseShown}
          >
            <div className="relative min-h-[300px] sm:min-h-[320px]">
              <DelayedBowVideo
                hidden={licenseShown}
                skip={!hasCheckoutId}
                onComplete={() => {
                  // Half the video's fade-out so the reveal slot starts
                  // expanding while the bow is still dissolving — feels
                  // like one continuous moment instead of a hard cut.
                  window.setTimeout(
                    () => setLicenseShown(true),
                    LICENSE_CROSSFADE_MS,
                  )
                }}
              />
            </div>
          </div>
        </section>

        {/* The composite delivery card. Mounts only after the bow
            video plays out so the polling fetch in LicenseRevealCard
            fires *after* the video has cleared — the upstream usually
            beats us to it during that window. The card itself owns
            both install (primary) AND key delivery (secondary strip)
            so the two never read as disconnected boxes. */}
        {licenseShown && (
          <LicenseRevealCard
            checkoutId={checkoutId}
            onOrderId={setOrderId}
          />
        )}

        <section className="zen-section mx-auto max-w-3xl px-5 pt-2 sm:px-6">
          <Reveal
            as="p"
            delay={540}
            className="mt-2 text-center text-[0.9375rem] leading-[1.65] text-sumi-soft"
          >
            {t(`${key}.next`)}
          </Reveal>

          {/* Bottom back-to-home duplicate removed — the single anchor
              at the top of the page covers the escape hatch. The
              delivery card is now the page's final beat, no more
              tertiary chrome below it. */}
        </section>
      </main>
      <Footer />
    </>
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
 * card reveals quickly without forcing the video to animate. `skip`
 * takes the same shortcut for the no-`checkout_id` visit, where there is
 * no fresh purchase to celebrate and the card is the whole point.
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
  skip,
}: {
  onComplete: () => void
  hidden: boolean
  skip: boolean
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

    if (skip || prefersReducedMotion) {
      // Reduced-motion (or no fresh checkout) path: skip the bow
      // entirely. The parent reveals the license card after
      // REDUCED_MOTION_REVEAL_MS so the page still has a paced moment
      // of arrival rather than an instant pop.
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
