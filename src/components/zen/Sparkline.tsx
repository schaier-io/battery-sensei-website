import { useEffect, useId, useRef, useState } from 'react'

type SparklineProps = {
  /** Values 0..100. Renders the line through them in order. */
  values: number[]
  className?: string
  height?: number
  /** Show a soft fill area under the line */
  fill?: boolean
  /** Highlight the latest point with a hinomaru dot */
  markLatest?: boolean
}

/**
 * Smooth charge/capacity line chart. Mirrors the macOS app's
 * `BatteryChargeHistoryPanel` styling (Surfaces/SagaSurface.swift):
 * hinomaru stroke, gradient red area, latest-point bullseye.
 * Used in compact spots (Health bento, BatteryJournal).
 */
export function Sparkline({
  values,
  className = '',
  height = 56,
  fill = true,
  markLatest = true,
}: SparklineProps) {
  const id = useId().replace(/[:]/g, '')
  // Draw-in: line gets painted left → right via stroke-dashoffset on
  // first scroll into view. Fill area + endpoint mark cross-fade in
  // on the same beat (delayed slightly so the line lands first).
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (prefersReduced) {
      setRevealed(true)
      return
    }
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
  const w = 320
  const h = height
  const padX = 4
  const padY = 6
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const dx = (w - padX * 2) / Math.max(1, values.length - 1)

  const points = values.map((v, i) => {
    const x = padX + i * dx
    const y = padY + (h - padY * 2) * (1 - (v - min) / range)
    return [x, y] as const
  })

  const linePath = catmullRomPath(points)
  const areaPath = `${linePath} L ${points.at(-1)?.[0]} ${h - padY} L ${points[0][0]} ${h - padY} Z`

  const last = points.at(-1)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`sl-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hinomaru)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--hinomaru)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Faint baseline */}
      <line
        x1={padX}
        y1={h - padY}
        x2={w - padX}
        y2={h - padY}
        stroke="var(--line)"
        strokeWidth="0.8"
        strokeDasharray="3 4"
      />

      {fill && (
        <path
          d={areaPath}
          fill={`url(#sl-grad-${id})`}
          style={{
            opacity: revealed ? 1 : 0,
            transition: 'opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) 600ms',
          }}
        />
      )}

      <path
        d={linePath}
        fill="none"
        stroke="var(--hinomaru)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray="100 100"
        style={{
          // 100 == fully hidden; transitions to 0 == fully drawn.
          // ease-out-expo for confident L→R brush stroke landing.
          strokeDashoffset: revealed ? 0 : 100,
          transition: 'stroke-dashoffset 1100ms cubic-bezier(0.16, 1, 0.3, 1) 120ms',
        }}
      />

      {markLatest && last && (
        <g
          style={{
            opacity: revealed ? 1 : 0,
            transition: 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1) 1000ms',
          }}
        >
          <circle cx={last[0]} cy={last[1]} r="3.8" fill="var(--hinomaru)" opacity="0.18" />
          <circle cx={last[0]} cy={last[1]} r="1.8" fill="var(--sumi)" />
        </g>
      )}
    </svg>
  )
}

/** Centripetal Catmull-Rom-ish smoothing — matches ChargeChart. */
function catmullRomPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  const tension = 0.22
  const segs: string[] = [`M ${pts[0][0]} ${pts[0][1]}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]
    const c1x = p1[0] + (p2[0] - p0[0]) * tension
    const c1y = p1[1] + (p2[1] - p0[1]) * tension
    const c2x = p2[0] - (p3[0] - p1[0]) * tension
    const c2y = p2[1] - (p3[1] - p1[1]) * tension
    segs.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`)
  }
  return segs.join(' ')
}
