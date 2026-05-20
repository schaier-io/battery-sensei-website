import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Reveal } from '#/components/zen/Reveal'
import { MenuBarMockup } from '#/components/zen/MenuBarMockup'

function useScrollProgress(maxAtProgress = 0.45): number {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let frame = 0
    let lastY = -1
    const tick = () => {
      const y = window.scrollY
      if (y !== lastY) {
        lastY = y
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (max > 0) {
          const p = Math.min(1, Math.max(0, y / max / maxAtProgress))
          setProgress(p)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
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

      <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
        <Reveal as="p" delay={80} className="kicker-row mx-auto justify-center mb-8 text-center">
          <span>Free for macOS · battery health</span>
        </Reveal>

        <Reveal
          as="h1"
          delay={160}
          className="display-title text-[2.5rem] xs:text-5xl sm:text-6xl md:text-[5.25rem] font-semibold leading-[1.04] tracking-[-0.02em] text-sumi"
        >
          Quiet power
          <span className="block mt-1 sm:mt-2 text-sumi-soft italic font-normal">
            for your MacBook.
          </span>
        </Reveal>

        <Reveal as="p" delay={320} className="mx-auto mt-8 font-jp text-base text-hinomaru/75 md:text-lg tracking-[0.08em]">
          静かに、電池に寄り添う。
        </Reveal>
        <Reveal as="p" delay={400} className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]">
          Your MacBook's battery is the one part that quietly wears down.
          Sensei watches it for you, gently. Warns before a surprise shutdown,
          holds your charge limit, and keeps an honest record of how it ages.
        </Reveal>

        <Reveal delay={480} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#download"
            className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Download className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5" strokeWidth={1.8} />
            Download for macOS
          </a>
          <a
            href="https://github.com/sandro/battery-sensei"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm text-sumi-soft hover:text-sumi transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            View source
          </a>
        </Reveal>

        <Reveal as="p" delay={560} className="mt-7 text-[11px] uppercase tracking-[0.22em] text-nezumi">
          Native macOS · barely sips power · stays in your menu bar · privacy-first
        </Reveal>

        <Reveal
          delay={640}
          className="relative mx-auto mt-14 w-full max-w-[480px]"
        >
          <MenuBarMockup className="rotate-[-1.2deg] transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:rotate-0 hover:-translate-y-1" />
          <p className="mt-4 text-center text-[11px] tracking-[0.18em] text-nezumi uppercase">
            Lives in your menu bar. Speaks only when needed.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
