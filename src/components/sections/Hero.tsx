import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '#/components/zen/Reveal'
import { MenuBarMockup } from '#/components/zen/MenuBarMockup'
import { TRIAL_DAYS } from '#/lib/polar'
import { useLifetimePrice } from '#/lib/use-price'

function useScrollProgress(maxAtProgress = 0.45): number {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let rafId = 0
    const updateProgress = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) {
        setProgress(Math.min(1, Math.max(0, y / max / maxAtProgress)))
      } else {
        setProgress(0)
      }
    }
    const onScroll = () => {
      if (rafId !== 0) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        updateProgress()
      })
    }
    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== 0) window.cancelAnimationFrame(rafId)
    }
  }, [maxAtProgress])
  return progress
}

const ENSO_CHARS = ['電', '池', '先', '生']
const RYOKU_CHARS = ['静', 'か', 'な', '力']

function KanjiRail({
  chars,
  progress,
  baseColor,
  className,
  charClassName = '',
}: {
  chars: string[]
  progress: number
  baseColor: string
  className?: string
  charClassName?: string
}) {
  const segment = 1 / chars.length
  return (
    <div className={className} aria-hidden>
      {chars.map((c, i) => {
        const localStart = i * segment
        const charProgress = Math.min(
          1,
          Math.max(0, (progress - localStart) / segment),
        )
        const stop = (charProgress * 100).toFixed(2)
        return (
          <span
            key={i}
            className={charClassName}
            style={{
              backgroundImage: `linear-gradient(to bottom, var(--hinomaru) ${stop}%, ${baseColor} ${stop}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            {c}
          </span>
        )
      })}
    </div>
  )
}

export function Hero() {
  const progress = useScrollProgress(0.12)
  const [hasStartedScroll, setHasStartedScroll] = useState(false)
  const [isChevronSettling, setIsChevronSettling] = useState(false)
  const [chevronInlineStyle, setChevronInlineStyle] = useState<CSSProperties>()
  const chevronRef = useRef<SVGSVGElement | null>(null)
  const settleRafRef = useRef<number | null>(null)
  const settleTimeoutRef = useRef<number | null>(null)
  const lifetime = useLifetimePrice()
  const price = lifetime.discounted
  const { t } = useTranslation()

  useEffect(() => {
    let rafId = 0
    const updateHasStartedScroll = () => {
      setHasStartedScroll(window.scrollY > 24)
    }
    const onScroll = () => {
      if (rafId !== 0) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        updateHasStartedScroll()
      })
    }
    updateHasStartedScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== 0) window.cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!hasStartedScroll) {
      if (settleRafRef.current !== null) {
        window.cancelAnimationFrame(settleRafRef.current)
        settleRafRef.current = null
      }
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current)
        settleTimeoutRef.current = null
      }
      setIsChevronSettling(false)
      setChevronInlineStyle(undefined)
      return
    }

    if (prefersReducedMotion || !chevronRef.current) return

    const computed = window.getComputedStyle(chevronRef.current)
    setIsChevronSettling(true)
    setChevronInlineStyle({
      transform:
        computed.transform === 'none' ? 'translateY(0)' : computed.transform,
      opacity: computed.opacity,
      transition:
        'transform 280ms cubic-bezier(0.2,0.8,0.2,1), opacity 280ms cubic-bezier(0.2,0.8,0.2,1)',
    })

    settleRafRef.current = window.requestAnimationFrame(() => {
      settleRafRef.current = null
      setChevronInlineStyle((prev) =>
        prev
          ? {
              ...prev,
              transform: 'translateY(0)',
              opacity: '1',
            }
          : prev,
      )
    })

    settleTimeoutRef.current = window.setTimeout(() => {
      settleTimeoutRef.current = null
      setIsChevronSettling(false)
      setChevronInlineStyle(undefined)
    }, 320)

    return () => {
      if (settleRafRef.current !== null) {
        window.cancelAnimationFrame(settleRafRef.current)
        settleRafRef.current = null
      }
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current)
        settleTimeoutRef.current = null
      }
    }
  }, [hasStartedScroll])

  return (
    <section
      className="relative overflow-hidden pb-20 pt-16 sm:pt-20 md:pb-28 md:pt-28"
      style={{
        // Subtle washi vignette so the hero still has depth without the ring.
        background:
          'radial-gradient(120% 70% at 50% 32%, color-mix(in oklab, var(--washi) 96%, transparent) 0%, transparent 70%)',
      }}
    >
      {/* Vertical kanji rails — show from md+ */}
      <KanjiRail
        chars={ENSO_CHARS}
        progress={progress}
        baseColor="rgba(28,26,23,0.28)"
        className="vertical-jp drift pointer-events-none absolute left-[max(1.25rem,calc(50%-32rem))] top-1/2 -translate-y-1/2 text-[2rem] lg:text-[2.4rem] leading-tight hidden md:block"
      />
      <KanjiRail
        chars={RYOKU_CHARS}
        progress={progress}
        baseColor="rgba(138,132,124,0.65)"
        className="vertical-jp drift pointer-events-none absolute right-[max(1.25rem,calc(50%-32rem))] top-1/2 -translate-y-1/2 font-jp text-[2rem] lg:text-[2.4rem] leading-tight tracking-[0.02em] hidden md:block"
      />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
        <Reveal as="p" delay={80} className="kicker-row mx-auto justify-center mb-8 text-center">
          <span>{t('hero.kicker', { trial: TRIAL_DAYS, price: price.formatted })}</span>
        </Reveal>

        <Reveal
          as="h1"
          delay={160}
          className="hero-display text-sumi"
        >
          {t('hero.title')}
          <span className="block mt-1 sm:mt-2 text-sumi-soft italic font-normal">
            {t('hero.titleItalic')}
          </span>
        </Reveal>

        <Reveal as="p" delay={320} className="mx-auto mt-8 font-jp text-base text-hinomaru/75 md:text-lg tracking-[0.08em]">
          {t('hero.jp')}
        </Reveal>
        <Reveal as="p" delay={400} className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft md:text-[1.125rem]">
          {t('hero.body')}
        </Reveal>

        <Reveal delay={480} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#free-download-email"
            className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Download className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5" strokeWidth={1.8} />
            {t('common.downloadMac')}
          </a>
          <a
            href="#features"
            className="group inline-flex h-11 items-center gap-2.5 rounded-md pl-4 pr-2 text-sm text-sumi-soft transition-colors duration-[360ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <span className="transition-transform duration-[360ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-[1px] motion-reduce:transform-none">
              {t('hero.readMore')}
            </span>
            <span
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] shadow-[0_6px_20px_-12px_rgba(28,26,23,0.25)] backdrop-blur-sm transition-[opacity,transform,background-color,border-color,box-shadow] duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-110 group-hover:border-sumi/35 group-hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] group-hover:shadow-[0_8px_18px_-12px_rgba(28,26,23,0.32)] motion-reduce:transform-none ${
                hasStartedScroll
                  ? 'border-sumi/15 opacity-100'
                  : 'border-sumi/10 opacity-70 group-hover:opacity-100'
              }`}
              aria-hidden
            >
              <ChevronDown
                ref={chevronRef}
                style={chevronInlineStyle}
                className={`h-4 w-4 text-sumi-soft transition-colors duration-[360ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:text-sumi motion-reduce:transform-none ${
                  !hasStartedScroll && !isChevronSettling
                    ? 'animate-gentle-bob motion-reduce:animate-none'
                    : ''
                }`}
                strokeWidth={2}
              />
            </span>
          </a>
        </Reveal>

        <Reveal
          delay={640}
          className="relative mx-auto mt-14 w-full max-w-[480px]"
        >
          <MenuBarMockup className="rotate-[-1.2deg] transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:rotate-0 hover:-translate-y-1" />
          <p className="spec-strip mt-4 text-center">
            {t('hero.menuCaption')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
