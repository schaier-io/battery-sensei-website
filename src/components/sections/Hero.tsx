import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { BrushRing } from '#/components/zen/BrushRing'
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
  // Each character has its own segment of progress; within that segment the
  // glyph fills top-down with hinomaru red as a percent. One kanji at a
  // time — the next one only starts once the previous is fully filled.
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
  // As the page scrolls, the vertical kanji rails fill one character at a
  // time with hinomaru red — top-down, like ink saturating each glyph in
  // sequence.
  // Fill spread across the portion of scroll where the hero rails are
  // still visible. Each kanji fills top-down with hinomaru, one after
  // the other; all four are fully red by the time the hero exits.
  const progress = useScrollProgress(0.12)

  return (
    <section className="relative overflow-hidden zen-section">
      {/* Bristled brush ring (円相) behind the headline. Many parallel sumi
          bristles fanning at the open end — ported from the app's
          BrushRingTrack so the hero ring matches the app's home-screen ring. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <BrushRing
          className="text-sumi -translate-y-6"
          size={640}
          lineWidth={9}
          bristleCount={24}
          trim={[0.0, 0.97]}
          inkOpacity={0.32}
        />
      </div>

      {/* Vertical kanji rails — each kanji fills top-down with hinomaru
          red, one after the other, as you scroll the page */}
      <KanjiRail
        chars={ENSO_CHARS}
        progress={progress}
        baseColor="rgba(28,26,23,0.3)"
        className="vertical-jp drift pointer-events-none absolute left-[max(2rem,calc(50%-32rem))] top-1/2 -translate-y-1/2 text-[2.4rem] leading-tight hidden lg:block"
      />
      <KanjiRail
        chars={RYOKU_CHARS}
        progress={progress}
        baseColor="rgba(138,132,124,0.7)"
        className="vertical-jp drift pointer-events-none absolute right-[max(2rem,calc(50%-32rem))] top-1/2 -translate-y-1/2 text-[1.05rem] leading-loose hidden lg:block"
      />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
        <Reveal as="p" delay={80} className="kicker-row mx-auto justify-center mb-10">
          <span>macOS menu-bar app · Battery health for MacBook</span>
        </Reveal>

        <Reveal
          as="h1"
          delay={160}
          className="display-title text-[2.5rem] sm:text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-sumi"
        >
          Quiet power
          <span className="block mt-2 sm:mt-3 text-sumi-soft italic font-normal">
            for your MacBook.
          </span>
        </Reveal>

        <Reveal as="p" delay={320} className="mx-auto mt-10 max-w-xl font-jp text-base text-sumi-soft md:text-lg">
          静かに、電池に寄り添う。
        </Reveal>
        <Reveal as="p" delay={400} className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-lg">
          A calm macOS menu-bar app that watches your MacBook battery so you
          don't have to. Smart low-battery warnings, charge limits with one-click
          Travel Mode, cycle tracking, and a personal battery history.
        </Reveal>

        <Reveal delay={480} className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#download"
            className="btn-sumi inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Download for macOS
          </a>
          <a
            href="https://github.com/sandro/battery-sensei"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm text-sumi-soft hover:text-sumi transition-colors"
          >
            View source
          </a>
        </Reveal>

        <Reveal as="p" delay={560} className="mt-8 text-xs text-nezumi tracking-wider">
          macOS 13+ · Apple Silicon &amp; Intel · Free · Notarized
        </Reveal>

        {/* Product preview — menu bar mockup, hand-drawn, slight tilt */}
        <Reveal
          delay={640}
          className="relative mx-auto mt-16 w-full max-w-[480px]"
        >
          <MenuBarMockup className="rotate-[-1.2deg] transition-transform duration-500 hover:rotate-0" />
          <p className="mt-4 text-center text-[11px] tracking-wider text-nezumi">
            Lives in your menu bar. Speaks only when needed.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
