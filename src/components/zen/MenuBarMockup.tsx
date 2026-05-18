import { useEffect, useRef, useState } from 'react'
import { Wifi, Bluetooth, Search } from 'lucide-react'
import { BrushRing } from '#/components/zen/BrushRing'

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

const CHARGE = 0.62
const TIME_LEFT = '3h 47m'

/**
 * Mini hero-panel preview of Battery Sensei. Mirrors the app's `heroIconPanel`
 * + `headerSection` (ContentView.swift) — a bristled brush ring around the app
 * icon, big percentage, time remaining, and the right-hand status / power rows.
 * Rendered inside a macOS menu-bar strip so the context (which app this is)
 * stays obvious.
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
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const time = formatTime(now)

  return (
    <div
      ref={rootRef}
      data-revealed={revealed ? 'true' : 'false'}
      className={`menu-bar-mockup paper-card relative overflow-visible rounded-xl ${className}`}
      style={{ aspectRatio: '5 / 4' }}
    >
      {/* macOS menu bar strip — Battery Sensei icon highlighted on the right */}
      <div className="absolute inset-x-0 top-0 flex h-8 items-center justify-between rounded-t-[inherit] border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_92%,var(--sumi))/0.04] px-3 text-[11px] text-sumi z-10">
        <div className="flex items-center gap-3 font-medium">
          <span aria-hidden></span>
          <span>Finder</span>
          <span className="text-sumi-soft">File</span>
          <span className="text-sumi-soft">Edit</span>
          <span className="text-sumi-soft">View</span>
        </div>
        <div className="flex items-center gap-3 text-sumi-soft">
          <BatteryIcon
            level={CHARGE}
            className="text-hinomaru"
            highlighted
            ariaLabel={`Battery Sensei — ${Math.round(CHARGE * 100)}%`}
          />
          <Bluetooth className="h-3 w-3" strokeWidth={1.6} />
          <Wifi className="h-3 w-3" strokeWidth={1.6} />
          <Search className="h-3 w-3" strokeWidth={1.6} />
          <span className="font-jp text-[10px] tracking-wide tabular-nums">{time}</span>
        </div>
      </div>

      {/* Sensei dropdown — port of the app's heroIconPanel + headerSection. */}
      <div className="absolute left-1/2 top-12 w-[88%] -translate-x-1/2 rounded-lg border border-[var(--line-strong)] bg-[var(--card)] p-4 shadow-[0_18px_40px_-16px_rgba(28,26,23,0.28)]">
        {/* Decorative kanji watermark — same as the app's hero panel (`電`). */}
        <span
          aria-hidden
          className="absolute top-2 right-3 font-jp text-2xl text-sumi/10 leading-none select-none"
        >
          電
        </span>

        <div className="flex items-center gap-4">
          {/* Left: bristled brush ring + app icon + numeric readout. */}
          <div className="flex flex-col items-center w-[112px] shrink-0">
            <div className="relative h-[92px] w-[92px]">
              <BrushRing
                className="absolute inset-0 text-sumi"
                size={92}
                bristleCount={18}
                lineWidth={6}
                trim={[0.0, 0.979]}
                inkOpacity={0.5}
                animate={false}
              />
              {/* Gold charge arc — overlays the bristled track up to the
                  current fraction. Animates from 0 → fraction when the
                  mockup scrolls into view (mirrors the app's `ZenMotion.gentle`
                  spring on `clampedFraction`). */}
              <ChargeArc fraction={CHARGE} revealed={revealed} className="absolute inset-0" />
              <img
                src="/app-icon-256.png"
                srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
                alt=""
                aria-hidden
                className="absolute inset-0 m-auto h-[42px] w-[42px] drop-shadow-[0_2px_4px_rgba(28,26,23,0.18)]"
              />
            </div>

            <span
              className="display-title mt-2 text-2xl font-bold leading-none text-sumi tabular-nums menu-bar-mockup__readout"
              style={{ ['--readout-delay' as string]: '320ms' }}
            >
              {Math.round(CHARGE * 100)}%
            </span>
            <span
              className="mt-1 text-[10px] font-semibold tracking-wider text-sumi-soft menu-bar-mockup__readout"
              style={{ ['--readout-delay' as string]: '420ms' }}
            >
              {TIME_LEFT} LEFT
            </span>
          </div>

          {/* Right: app name + status rows */}
          <div className="flex-1 min-w-0">
            <p className="display-title text-base font-semibold leading-tight text-sumi">
              Battery Sensei
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-sumi-soft">
              静かに、電池に寄り添う。
            </p>

            <StatusRow
              label="Status"
              value="On battery"
              valueKanji=""
            />
            <StatusRow
              label="Source"
              value="Internal · 84 Wh"
              valueKanji="電"
              dim
            />

            <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[var(--line)] pt-2 text-[10px] text-sumi-soft">
              <span>Limit · 80%</span>
              <span className="rounded-sm bg-sumi px-1.5 py-0.5 font-medium text-washi">
                On
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pointer connecting the popover to the menu-bar icon. */}
      <svg
        className="pointer-events-none absolute top-9 h-3 w-3 text-[var(--card)]"
        style={{ right: 'calc(7% + 14px)' }}
        viewBox="0 0 12 12"
        aria-hidden
      >
        <path
          d="M 6 0 L 12 6 L 0 6 Z"
          fill="currentColor"
          stroke="var(--line-strong)"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  )
}

function ChargeArc({
  fraction,
  revealed,
  className,
}: {
  fraction: number
  revealed: boolean
  className?: string
}) {
  // Mirrors the gold body+leading-cap arc the app draws over the bristled
  // track (ContentView.swift `heroIconPanel`). The dashoffset transitions
  // from fully hidden (C) → showing `visible` length when `revealed` flips,
  // so the gold arc sweeps in as the user scrolls the mockup into view.
  const VB = 220
  const cx = VB / 2
  const cy = VB / 2
  const r = 86
  const trackEnd = 0.979
  const arcEnd = Math.min(trackEnd, Math.max(0, fraction * trackEnd))
  const C = 2 * Math.PI * r
  const visible = arcEnd * C
  const dashOffset = revealed ? C - visible : C
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" className={className} aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--kin)"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${C.toFixed(2)} ${C.toFixed(2)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity="0.92"
        // Setting strokeDashoffset via CSS (not the SVG attribute) so the
        // value change actually fires a CSS transition. Setting it as an
        // SVG attribute changes the value instantly with no animation.
        style={{
          strokeDashoffset: dashOffset,
          transition: 'stroke-dashoffset 1.4s cubic-bezier(0.55, 0.08, 0.18, 1) 200ms',
        }}
      />
    </svg>
  )
}

function StatusRow({
  label,
  value,
  valueKanji,
  dim = false,
}: {
  label: string
  value: string
  valueKanji?: string
  dim?: boolean
}) {
  return (
    <div className={`mt-1.5 flex items-baseline justify-between gap-2 ${dim ? 'opacity-80' : ''}`}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-nezumi">{label}</span>
      <span className="flex items-baseline gap-1.5 text-[11px] font-medium text-sumi">
        {valueKanji && <span className="font-jp text-[10px] text-hinomaru/80">{valueKanji}</span>}
        {value}
      </span>
    </div>
  )
}

function BatteryIcon({
  level,
  className = '',
  highlighted = false,
  ariaLabel,
}: {
  level: number
  className?: string
  highlighted?: boolean
  ariaLabel?: string
}) {
  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 24 12" width="22" height="11" aria-hidden>
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
          fill="currentColor"
        />
      </svg>
      {highlighted && (
        <span
          className="absolute -inset-1 rounded-md ring-1 ring-hinomaru/30"
          aria-hidden
        />
      )}
    </span>
  )
}
