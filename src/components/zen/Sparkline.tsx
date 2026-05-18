import { useId } from 'react'

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
 * Tiny brush-stroke line graph. Defaults look like a battery capacity decline.
 */
export function Sparkline({
  values,
  className = '',
  height = 56,
  fill = true,
  markLatest = true,
}: SparklineProps) {
  const id = useId().replace(/[:]/g, '')
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

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(' ')

  const areaPath = `${linePath} L ${points.at(-1)?.[0]} ${h - padY} L ${points[0][0]} ${h - padY} Z`

  const last = points.at(-1)

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      className={className}
      aria-hidden
    >
      <defs>
        <filter id={`sl-rough-${id}`} x="-2%" y="-20%" width="104%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="0.8" />
        </filter>
        <linearGradient id={`sl-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Faint baseline */}
      <line
        x1={padX}
        y1={h - padY}
        x2={w - padX}
        y2={h - padY}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeDasharray="2 4"
      />

      {fill && <path d={areaPath} fill={`url(#sl-grad-${id})`} />}

      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#sl-rough-${id})`}
      />

      {markLatest && last && (
        <>
          <circle
            cx={last[0]}
            cy={last[1]}
            r="3.6"
            fill="var(--hinomaru)"
            opacity="0.18"
          />
          <circle cx={last[0]} cy={last[1]} r="1.8" fill="var(--hinomaru)" />
        </>
      )}
    </svg>
  )
}
