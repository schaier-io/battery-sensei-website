import { useEffect, useId, useRef, useState } from 'react'

type ChargeChartProps = {
  /** Percentage samples 0–100, evenly spaced across the window */
  values: number[]
  /** Time labels rendered on the x-axis (e.g., ["13:00", "19:00", "01:00", "07:00"]) */
  timeLabels?: string[]
  /** Charge limit guide (e.g., 85) — renders a dashed horizontal line */
  limit?: number
  /** Latest reading badge (e.g., "12%") shown at the right end */
  endLabel?: string
  className?: string
  /** Height of the plot area in px */
  height?: number
}

/**
 * Charge-over-time chart — mirrors the macOS app's BatteryChargeHistoryPanel
 * (Surfaces/SagaSurface.swift):
 *   - Smooth (Catmull-Rom-ish) line in hinomaru red
 *   - Gradient area fill below
 *   - Dashed horizontal RuleMark at the charge limit, with a percent annotation
 *   - Y-axis at 0/25/50/75/100, X-axis labels at the supplied times
 *   - A solid point at the latest sample
 *
 * Pure SVG so the page stays light (no chart library).
 */
export function ChargeChart({
  values,
  timeLabels = ['13:00', '19:00', '01:00', '07:00'],
  limit = 85,
  endLabel,
  className = '',
  height = 200,
}: ChargeChartProps) {
  const id = useId().replace(/[:]/g, '')
  const rootRef = useRef<SVGSVGElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true)
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const W = 720
  const H = height
  const padL = 44
  const padR = 14
  const padT = 14
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const xForIndex = (i: number) => padL + (i / Math.max(1, values.length - 1)) * plotW
  const yForValue = (v: number) => padT + (1 - v / 100) * plotH

  const pts = values.map((v, i) => [xForIndex(i), yForValue(v)] as const)

  const linePath = catmullRomPath(pts)
  const lastX = pts.at(-1)?.[0] ?? padL + plotW
  const lastY = pts.at(-1)?.[1] ?? padT + plotH
  const firstX = pts[0]?.[0] ?? padL
  const areaPath = `${linePath} L ${lastX} ${padT + plotH} L ${firstX} ${padT + plotH} Z`

  const yTicks = [0, 25, 50, 75, 100]
  const limitY = yForValue(limit)

  return (
    <svg
      ref={rootRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className={`charge-chart ${className}`}
      data-revealed={revealed ? 'true' : 'false'}
      role="img"
      aria-label={`Battery charge over ${timeLabels.length > 0 ? `${timeLabels[0]} – ${timeLabels.at(-1)}` : 'the selected window'}`}
    >
      <defs>
        <linearGradient id={`cc-area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hinomaru)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--hinomaru)" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id={`cc-clip-${id}`}>
          <rect
            x={padL}
            y={padT}
            width={plotW}
            height={plotH}
            rx="2"
            ry="2"
          />
        </clipPath>
      </defs>

      {/* Y-axis gridlines + labels */}
      {yTicks.map((t) => {
        const y = yForValue(t)
        return (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeWidth="0.8"
              strokeDasharray={t === 0 ? '' : '3 4'}
            />
            <text
              x={padL - 10}
              y={y + 4}
              textAnchor="end"
              className="text-[10px] fill-[var(--nezumi)] tabular-nums"
              style={{ fontSize: 10 }}
            >
              {t}%
            </text>
          </g>
        )
      })}

      {/* X-axis labels evenly spaced */}
      {timeLabels.map((label, i) => {
        const x = padL + (i / Math.max(1, timeLabels.length - 1)) * plotW
        const anchor = i === 0 ? 'start' : i === timeLabels.length - 1 ? 'end' : 'middle'
        return (
          <text
            key={label + i}
            x={x}
            y={H - 6}
            textAnchor={anchor}
            className="fill-[var(--nezumi)] tabular-nums"
            style={{ fontSize: 10 }}
          >
            {label}
          </text>
        )
      })}

      {/* Dashed charge-limit rule + annotation */}
      <line
        x1={padL}
        x2={W - padR}
        y1={limitY}
        y2={limitY}
        stroke="color-mix(in oklab, var(--hinomaru) 35%, transparent)"
        strokeWidth="1"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <text
        x={W - padR - 4}
        y={limitY - 5}
        textAnchor="end"
        className="fill-[var(--hinomaru)] font-semibold tabular-nums"
        style={{ fontSize: 10 }}
      >
        {limit}%
      </text>

      {/* Animated area + line: clipped reveal sweeps in left → right */}
      <g clipPath={`url(#cc-clip-${id})`}>
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="transparent"
        />
        <g
          style={{
            transformOrigin: `${padL}px 0px`,
            transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
            transition:
              'transform 1300ms cubic-bezier(0.2, 0.8, 0.2, 1) 120ms',
          }}
        >
          <path d={areaPath} fill={`url(#cc-area-${id})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--hinomaru)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* Latest reading: bullseye dot */}
      <g
        style={{
          opacity: revealed ? 1 : 0,
          transition: 'opacity 320ms ease 1400ms',
        }}
      >
        <circle
          cx={lastX}
          cy={lastY}
          r="6"
          fill="var(--hinomaru)"
          opacity="0.18"
        />
        <circle cx={lastX} cy={lastY} r="3" fill="var(--sumi)" />
        {endLabel && (
          <text
            x={lastX - 10}
            y={lastY - 10}
            textAnchor="end"
            className="fill-[var(--sumi)] font-semibold tabular-nums"
            style={{ fontSize: 10 }}
          >
            {endLabel}
          </text>
        )}
      </g>
    </svg>
  )
}

/**
 * Smooth interpolation through `pts` using a centripetal-ish Catmull-Rom.
 * Returns an SVG path "M ... C ... C ... C ..." that passes through every point.
 */
function catmullRomPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  const tension = 0.22 // lower = smoother; 0.16–0.25 reads as gentle curve

  const segments: string[] = [`M ${pts[0][0]} ${pts[0][1]}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]

    const c1x = p1[0] + (p2[0] - p0[0]) * tension
    const c1y = p1[1] + (p2[1] - p0[1]) * tension
    const c2x = p2[0] - (p3[0] - p1[0]) * tension
    const c2y = p2[1] - (p3[1] - p1[1]) * tension

    segments.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`)
  }
  return segments.join(' ')
}
