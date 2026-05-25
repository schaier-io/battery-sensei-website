import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { BrushTick } from '#/components/zen/BrushTick'
import { BatteryJournal } from '#/components/zen/BatteryJournal'

// FrameBorder pulls in three.js + R3F (~235 KB gz). We only mount it when
// (a) the Saga section is approaching the viewport and (b) the device can
// reasonably afford a WebGL canvas — small screens, reduced-motion users,
// and Save-Data sessions get the static BatteryJournal instead, which is
// visually complete on its own.
const FrameBorder = lazy(() => import('#/components/reactbits/FrameBorder'))

function useAffordsWebgl(): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tooSmall = window.matchMedia('(max-width: 767px)').matches
    type NetworkInformation = { saveData?: boolean }
    type ConnNav = Navigator & { connection?: NetworkInformation }
    const saveData = !!(navigator as ConnNav).connection?.saveData
    setOk(!reduced && !tooSmall && !saveData)
  }, [])
  return ok
}

function useNearViewport(ref: React.RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          io.disconnect()
        }
      },
      // Start the chunk fetch before the section enters view so the WebGL
      // canvas is ready when the user actually arrives.
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, near])
  return near
}

export function Saga() {
  const { t } = useTranslation()
  const bullets = t('saga.bullets', { returnObjects: true }) as string[]
  const frameSlotRef = useRef<HTMLDivElement | null>(null)
  const affordsWebgl = useAffordsWebgl()
  const near = useNearViewport(frameSlotRef)
  const renderFrame = affordsWebgl && near

  return (
    <section id="saga" className="zen-section relative">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-2">
        <div>
          <Hanko kanji="史" className="mb-5" />
          <Reveal as="p" delay={100} className="kicker-row mb-4">
            {t('saga.kicker')}
          </Reveal>
          <Reveal
            as="h2"
            delay={180}
            className="section-heading text-sumi"
          >
            {t('saga.heading')}
            <span className="block italic text-sumi-soft font-normal">
              {t('saga.headingItalic')}
            </span>
          </Reveal>
          <Reveal
            as="p"
            delay={260}
            className="prose-readable mt-7 text-[1.0625rem] text-sumi-soft"
          >
            {t('saga.body')}
          </Reveal>
          <Reveal as="ul" delay={340} className="mt-8 space-y-3 text-[0.9375rem] text-sumi-soft">
            {bullets.map((line) => (
              <li key={line} className="flex gap-3">
                <BrushTick className="text-sumi-soft mt-2 shrink-0" />
                {line}
              </li>
            ))}
          </Reveal>
          <Reveal delay={420}>
            <Link
              to="/features/battery-journal"
              className="group/learn mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-hinomaru/85 hover:text-hinomaru transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
            >
              {t('common.learnMore')}
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/learn:translate-x-0.5 group-hover/learn:-translate-y-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative flex items-center justify-center">
          <div ref={frameSlotRef} className="relative aspect-[3/4] w-full max-w-xs">
            {renderFrame ? (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <BatteryJournal className="w-full" />
                  </div>
                }
              >
                <FrameBorder
                  className="relative rounded-sm"
                  color="#1c1a17"
                  backgroundColor="#f4ede0"
                  speed={1.36}
                  borderWidth={0.5}
                  falloff={1}
                  noiseScale={7.5}
                  noiseStrength={5}
                  noiseOctaves={5}
                  intensity={1}
                  gamma={2}
                  opacity={1}
                >
                  <div className="absolute inset-0 flex items-center justify-center p-7 sm:p-8">
                    <BatteryJournal className="w-full rotate-[-1.4deg] transition-transform duration-500 hover:rotate-0" />
                  </div>
                </FrameBorder>
              </Suspense>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <BatteryJournal className="w-full rotate-[-1.4deg] transition-transform duration-500 hover:rotate-0" />
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
