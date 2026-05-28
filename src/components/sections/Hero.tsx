import { useEffect, useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '#/components/zen/Reveal'
import { MenuBarMockup } from '#/components/zen/MenuBarMockup'
import { TRIAL_DAYS } from '#/lib/polar'
import { useLifetimePrice } from '#/lib/use-price'

function ScrollCue() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let rafId = 0
    const updateHidden = () => {
      setHidden((prev) => prev || window.scrollY > 24)
    }
    const onScroll = () => {
      if (rafId !== 0) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        updateHidden()
      })
    }
    updateHidden()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== 0) window.cancelAnimationFrame(rafId)
    }
  }, [])
  return (
    <a
      href="#features"
      aria-label="Scroll down"
      className={`fixed bottom-5 left-1/2 z-30 -translate-x-1/2 transition-[opacity,transform] duration-700 ease-out ${
        hidden
          ? 'pointer-events-none translate-y-2 opacity-0'
          : 'pointer-events-auto opacity-60 hover:opacity-100'
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sumi/10 bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] shadow-[0_6px_20px_-10px_rgba(28,26,23,0.25)] backdrop-blur-sm">
        <ChevronDown
          className="h-4 w-4 animate-gentle-bob text-sumi-soft"
          strokeWidth={1.8}
          aria-hidden
        />
      </span>
    </a>
  )
}

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
  const lifetime = useLifetimePrice()
  const price = lifetime.discounted
  const { t } = useTranslation()

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
        className="vertical-jp drift pointer-events-none absolute right-[max(1.25rem,calc(50%-32rem))] top-1/2 -translate-y-1/2 text-[0.95rem] lg:text-[1.05rem] leading-loose hidden md:block"
      />

      <ScrollCue />
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
            className="group inline-flex h-11 items-center gap-2.5 rounded-md pl-4 pr-2 text-sm text-sumi-soft hover:text-sumi transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            {t('hero.readMore')}
            {/* Circle wrapper carries the hover lift / glow. The
                inner chevron breathes via OPACITY only (no transform)
                so the parent's translate-y doesn't double-bob with
                the icon. Earlier rev used `animate-gentle-bob` here,
                which moved the chevron downward inside an already-
                lifting circle — net effect was a chevron that looked
                like it was trying to escape its container. */}
            <span
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-sumi/15 bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] transition-[transform,background-color,border-color,box-shadow] duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-y-0.5 group-hover:border-sumi/35 group-hover:bg-[color-mix(in_oklab,var(--washi)_45%,#fff)] group-hover:shadow-[0_4px_12px_-6px_rgba(28,26,23,0.25)]"
              aria-hidden
            >
              <ChevronDown
                className="h-3.5 w-3.5 animate-gentle-pulse text-sumi-soft group-hover:text-sumi group-hover:opacity-100"
                strokeWidth={2}
              />
            </span>
          </a>
        </Reveal>

        <Reveal as="p" delay={560} className="spec-strip mt-7">
          {t('hero.specStrip', { trial: TRIAL_DAYS, price: price.formatted })}
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
