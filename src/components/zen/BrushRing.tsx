import { useId } from 'react'

// Deterministic PRNG matching the app's SeededRNG output style (Surfaces/Zen/BrushRingTrack.swift).
function makeRand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type BrushRingProps = {
  size?: number
  className?: string
  /** Bristle bundle base width (the ring's overall thickness in svg units). */
  lineWidth?: number
  /** Number of parallel bristles drawn across the bundle. */
  bristleCount?: number
  /** Trim range of the brushed arc — [start, end] in 0...1 around the circle. */
  trim?: readonly [number, number]
  seed?: number
  /** Play the brush-draw reveal on mount. */
  animate?: boolean
  /** Multiplier applied to each bristle's opacity (1 = app-faithful, lower = watermark). */
  inkOpacity?: number
}

/**
 * Bristled sumi-brush ring (円相). Renders the bundle as many parallel arcs,
 * each with a randomized dash pattern so the stroke reads as dry-brush ink
 * rather than a single uniform line. Edge bristles fan out wispier; inner
 * bristles stay dense and darker.
 *
 * Ported from `battery-sensei/Surfaces/Zen/BrushRingTrack.swift`. The animated
 * reveal mimics the app's `ZenMotion.ensoDraw` curve (cubic 0.55 0.08 0.18 1,
 * ~1.4s) — soft start, fast middle, long decel tail, like a real loaded brush.
 */
export function BrushRing({
  size = 520,
  className,
  lineWidth = 9,
  bristleCount = 22,
  trim = [0.0, 0.97],
  seed = 0xb155,
  animate = true,
  inkOpacity = 1,
}: BrushRingProps) {
  const id = useId().replace(/[:]/g, '')
  const VB = 220
  const cx = VB / 2
  const cy = VB / 2
  const baseR = 86
  const [tStart, tEnd] = trim

  const rand = makeRand(seed)
  type Bristle = { d: string; dashes: string; opacity: number; width: number }
  const bristles: Bristle[] = []

  for (let i = 0; i < bristleCount; i++) {
    const t = i / Math.max(bristleCount - 1, 1)
    const edgeBias = Math.abs(t - 0.5) * 2 // 0 mid, 1 outermost
    const radialOffset = (t - 0.5) * lineWidth * 1.05
    const r = baseR + radialOffset

    const startInset = rand() * (0.005 + edgeBias * 0.05)
    const endInset = rand() * (0.005 + edgeBias * 0.05)
    const s = Math.min(tEnd, tStart + startInset)
    const e = Math.max(tStart, tEnd - endInset)
    if (e - s < 0.01) continue

    const arcLen = (e - s) * 2 * Math.PI * r
    const segs: number[] = []
    let remaining = arcLen
    while (remaining > 0.5 && segs.length < 40) {
      const mark = (4 + rand() * 18) * (1 - edgeBias * 0.45)
      const gap = (0.5 + rand() * 1.6) * (1 + edgeBias * 1.4)
      const m = Math.min(mark, remaining)
      segs.push(m)
      remaining -= mark
      if (remaining <= 0) break
      const g = Math.min(gap, remaining)
      segs.push(g)
      remaining -= gap
    }

    const a0 = s * Math.PI * 2
    const a1 = e * Math.PI * 2
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const largeArc = a1 - a0 > Math.PI ? 1 : 0
    const d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`

    const opacity = (0.3 + 0.55 * (1 - edgeBias)) * inkOpacity
    const width = 0.55 + (1 - edgeBias) * 0.85 + rand() * 0.25

    bristles.push({ d, dashes: segs.map((n) => n.toFixed(2)).join(' '), opacity, width })
  }

  // Soft taper mask at both visible ends so the brush "lifts off" rather than
  // stopping flat. Implemented as an angular fade applied on top of the
  // animated reveal mask.
  const C = 2 * Math.PI * baseR
  const visible = (tEnd - tStart) * C
  const revealWidth = lineWidth + 14 // wide enough to cover the bristle bundle

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        {/* Animated reveal mask: a stroked arc whose dashoffset sweeps to 0,
            revealing the bristles beneath as if a brush is being drawn. */}
        <mask id={`br-reveal-${id}`} maskUnits="userSpaceOnUse">
          <rect x={-VB} y={-VB} width={VB * 3} height={VB * 3} fill="black" />
          <circle
            cx={cx}
            cy={cy}
            r={baseR}
            fill="none"
            stroke="white"
            strokeWidth={revealWidth}
            strokeLinecap="round"
            strokeDasharray={`${visible.toFixed(2)} ${(C * 1.1).toFixed(2)}`}
            strokeDashoffset={animate ? visible.toFixed(2) : '0'}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={
              animate
                ? {
                    animation: `brush-ring-draw 1.4s cubic-bezier(0.55, 0.08, 0.18, 1) forwards`,
                  }
                : undefined
            }
          />
        </mask>
      </defs>

      <g
        mask={`url(#br-reveal-${id})`}
        transform={`rotate(-90 ${cx} ${cy})`}
        stroke="currentColor"
        fill="none"
      >
        {bristles.map((b, i) => (
          <path
            key={i}
            d={b.d}
            strokeWidth={b.width}
            strokeLinecap="butt"
            strokeDasharray={b.dashes}
            opacity={b.opacity}
          />
        ))}
      </g>
    </svg>
  )
}
