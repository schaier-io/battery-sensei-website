import { useEffect, useRef, useState } from 'react'
import { Wifi, Search, MoonStar, Minus, Plus } from 'lucide-react'

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], {
    weekday: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const CHARGE = 0.15

/**
 * Hero mockup: a tiny macOS desktop with the BatterySensei `WarningOverlay`
 * floating on top. Mirrors how the alert actually appears in the wild —
 * translucent menu bar with the app's icon highlighted on the right, washi
 * desktop, then the warning card centered with its own scrim.
 */
export function MenuBarMockup({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())
  const [revealed, setRevealed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    // Auto-fallback: even if the user never scrolls past the hero, the
    // mockup should still come alive shortly after page load.
    const autoTimer = window.setTimeout(() => setRevealed(true), 900)

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      window.clearTimeout(autoTimer)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            window.clearTimeout(autoTimer)
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(autoTimer)
    }
  }, [])

  const time = formatTime(now)
  const percent = Math.round(CHARGE * 100)

  return (
    <div
      ref={rootRef}
      data-revealed={revealed ? 'true' : 'false'}
      className={`menu-bar-mockup relative isolate overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--sumi)_24%,transparent)] shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_32px_70px_-26px_rgba(28,26,23,0.40),0_10px_22px_-12px_rgba(28,26,23,0.22)] ${className}`}
      style={{
        // Desktop "wallpaper" — soft warm washi wash with a high light source
        // for depth, like late-afternoon paper.
        background:
          'radial-gradient(140% 90% at 30% 8%, #f7f0e4 0%, #ebdec8 55%, #c8b394 100%)',
      }}
    >
      {/* macOS menu bar — translucent dark over the wallpaper */}
      <MenuBar time={time} percent={percent} />

      {/* Desktop area — kept proportionally large enough for the alert + a
          peek of the dock at the bottom. */}
      <div className="relative h-[360px] sm:h-[400px]">
        {/* Faint inked rule rows on the wallpaper, like a desktop with files */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          aria-hidden
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0 38px, color-mix(in oklab, var(--sumi) 8%, transparent) 38px 39px)',
          }}
        />

        {/* Window-shadow dimming behind the alert card */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(60% 50% at 50% 48%, color-mix(in oklab, var(--sumi) 18%, transparent) 0%, transparent 70%)',
          }}
        />

        {/* The alert overlay — same visual language as
            components/zen/WarningOverlay.tsx, miniaturized for the desktop
            stage so the whole scene fits inside the hero card. */}
        <AlertCard percent={percent} revealed={revealed} />

        {/* Dock — a hint at the bottom for desktop realism */}
        <Dock />
      </div>
    </div>
  )
}

function MenuBar({ time, percent }: { time: string; percent: number }) {
  return (
    <div className="relative z-20 flex h-7 items-center justify-between gap-3 border-b border-black/15 bg-[color-mix(in_oklab,var(--sumi)_72%,transparent)] px-3.5 text-[11px] text-white backdrop-blur-md">
      <div className="flex items-center gap-3.5 min-w-0">
        <AppleGlyph />
        <span className="font-semibold">Finder</span>
        <span className="text-white/80 hidden sm:inline">File</span>
        <span className="text-white/80 hidden sm:inline">Edit</span>
        <span className="text-white/80 hidden sm:inline">View</span>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 text-white/85">
        <BatteryIcon level={percent / 100} highlighted />
        <Wifi className="h-3 w-3" strokeWidth={1.8} />
        <Search className="h-3 w-3" strokeWidth={1.8} />
        <span className="font-medium tabular-nums tracking-wide whitespace-nowrap">
          {time}
        </span>
      </div>
    </div>
  )
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 14 18" width="11" height="14" aria-hidden className="text-white">
      <path
        fill="currentColor"
        d="M11.8 13.8c-.6 1.4-1.3 2.7-2.4 2.7-1 0-1.4-.6-2.5-.6-1.2 0-1.6.6-2.5.6-1.1 0-1.9-1.2-2.5-2.5C.4 11 .5 7.5 2.2 6c.7-.7 1.7-1.1 2.6-1.1.9 0 1.5.5 2.5.5.9 0 1.5-.6 2.6-.6.7 0 1.5.2 2.1.7-1.8 1-1.5 3.6.3 4.5-.4.9-.7 1.7-1.5 3.8zM9.3 3.9c-.6.7-1.6 1.2-2.5 1.1-.1-1 .4-2 .9-2.6.6-.7 1.6-1.2 2.5-1.3.1 1 -.4 2-1 2.8z"
      />
    </svg>
  )
}

function AlertCard({ percent, revealed }: { percent: number; revealed: boolean }) {
  return (
    <div
      className="alert-card absolute left-1/2 top-1/2 z-10 w-[80%] max-w-[360px] rounded-[22px] border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-5 pt-4 pb-4 text-center shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_28px_60px_-22px_rgba(28,26,23,0.45),0_8px_22px_-10px_rgba(28,26,23,0.30)]"
      data-revealed={revealed ? 'true' : 'false'}
      style={{
        transform: `translate(-50%, calc(-50% + ${revealed ? '0px' : '12px'}))`,
        opacity: revealed ? 1 : 0,
        transition:
          'transform 680ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 680ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <span
        aria-hidden
        className="mx-auto mb-3 block h-[3px] w-8 rounded-full bg-[color-mix(in_oklab,var(--sumi)_22%,transparent)]"
      />

      <div className="mb-2 flex justify-center">
        <div
          className="relative grid h-[58px] w-[58px] place-items-center rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, #fbe3e0 0%, #f7d0cd 60%, #f1c1be 100%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -8px 14px -10px color-mix(in oklab, var(--hinomaru) 22%, transparent), 0 0 0 1px color-mix(in oklab, var(--hinomaru) 14%, transparent), 0 6px 18px -10px color-mix(in oklab, var(--hinomaru) 45%, transparent)',
          }}
        >
          <SmallBatteryGlyph fraction={percent / 100} />
        </div>
      </div>

      <p className="display-title text-[15px] font-semibold leading-tight text-sumi">
        Low battery
      </p>

      <div className="mx-auto mt-3 h-[5px] w-[140px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--sumi)_10%,var(--washi-soft))]">
        <div
          className="h-full rounded-full bg-hinomaru transition-[width] duration-[1100ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: revealed ? `${percent}%` : '0%' }}
        />
      </div>

      <p className="display-title mt-3 text-[2.25rem] font-semibold leading-none tabular-nums tracking-[-0.02em] text-sumi">
        {percent}%
      </p>

      <p className="mx-auto mt-2 text-[11px] font-medium leading-relaxed text-sumi-soft">
        Battery is now at {percent}%.
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]">
          <span className="px-1 text-sumi-soft" aria-hidden>
            <MoonStar className="h-3 w-3" strokeWidth={1.8} />
          </span>
          <span
            aria-hidden
            className="grid h-5 w-5 place-items-center rounded-md text-sumi-soft"
          >
            <Minus className="h-3 w-3" strokeWidth={2} />
          </span>
          <span className="rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-2 py-0.5 text-[10px] font-semibold text-sumi shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
            <span className="text-sumi-soft">Snooze </span>
            <span className="tabular-nums">5 min</span>
          </span>
          <span
            aria-hidden
            className="grid h-5 w-5 place-items-center rounded-md text-sumi-soft"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-lg bg-hinomaru px-2.5 py-1.5 text-[11px] font-semibold text-[#fff8eb] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_2px_4px_rgba(188,0,45,0.22)]"
        >
          Dismiss
          <kbd className="rounded bg-[color-mix(in_oklab,#fff8eb_24%,transparent)] px-1 py-0.5 text-[9px] font-medium tracking-wider text-[#fff8eb] ring-1 ring-inset ring-[#fff8eb]/30">
            Esc
          </kbd>
        </span>
      </div>
    </div>
  )
}

function Dock() {
  return (
    <div
      className="absolute inset-x-0 bottom-1 z-0 mx-auto flex h-9 w-fit max-w-[88%] items-center gap-1.5 rounded-2xl border border-white/40 bg-white/35 px-2 backdrop-blur-md"
      aria-hidden
    >
      {/* Tiny app tiles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="block h-6 w-6 rounded-md"
          style={{
            background:
              i === 4
                ? 'linear-gradient(180deg, var(--hinomaru), color-mix(in oklab, var(--hinomaru) 78%, var(--sumi)))'
                : `color-mix(in oklab, var(--sumi) ${10 + (i % 3) * 8}%, var(--washi))`,
            boxShadow:
              '0 1px 1px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </div>
  )
}

function SmallBatteryGlyph({ fraction }: { fraction: number }) {
  const inner = Math.max(2, fraction * 22)
  return (
    <svg
      viewBox="0 0 36 20"
      width="32"
      height="18"
      aria-hidden
      className="text-hinomaru"
    >
      <rect
        x="1"
        y="2"
        width="28"
        height="16"
        rx="3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="30" y="7" width="3" height="6" rx="1" fill="currentColor" />
      <rect
        x="3"
        y="4"
        width={inner}
        height="12"
        rx="2.2"
        fill="currentColor"
      />
    </svg>
  )
}

function BatteryIcon({
  level,
  highlighted = false,
}: {
  level: number
  highlighted?: boolean
}) {
  return (
    <span className="relative inline-flex items-center" aria-hidden>
      <svg viewBox="0 0 24 12" width="20" height="10">
        <rect
          x="0.5"
          y="1"
          width="20"
          height="10"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect x="21.5" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
        <rect
          x="2"
          y="2.5"
          width={Math.max(1, level * 17)}
          height="7"
          rx="1"
          fill={highlighted ? 'var(--hinomaru)' : 'currentColor'}
        />
      </svg>
      {highlighted && (
        <span
          className="absolute -inset-0.5 rounded-sm ring-1 ring-hinomaru/45"
          aria-hidden
        />
      )}
    </span>
  )
}
