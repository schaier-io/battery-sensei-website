type EnsoSpinnerProps = {
  /** Pixel size of the square SVG. */
  size?: number
  className?: string
  /** Ink colour; defaults to the current text colour. */
  stroke?: string
  /** Accessible status label (the mark itself is aria-hidden). */
  label?: string
}

const C = 24 // centre
const R = 18 // centreline radius
const HEAD = 1.55 // half-thickness at the loaded head
const TAIL = 0.2 // half-thickness at the dry tail
const START = -108 // head angle (deg) — just left of top
const SWEEP = 300 // clockwise span (deg)
const SEGMENTS = 56

/**
 * A calm, looping sumi ensō spinner.
 *
 * The ring is a *filled* crescent rather than a stroked arc, so it can carry
 * a real calligraphic taper — a thick, round "loaded" head sweeping clockwise
 * and thinning to a dry point — which a uniform-width stroke can't express.
 * The whole mark turns slowly and breathes in opacity, reading as an ink
 * brush sweep rather than a mechanical throbber. Honours prefers-reduced-motion
 * (see styles.css).
 */
export function EnsoSpinner({
  size = 72,
  className = '',
  stroke = 'currentColor',
  label = 'Loading',
}: EnsoSpinnerProps) {
  const at = (radius: number, deg: number): string => {
    const a = (deg * Math.PI) / 180
    return `${(C + radius * Math.cos(a)).toFixed(2)} ${(C + radius * Math.sin(a)).toFixed(2)}`
  }

  const outer: string[] = []
  const inner: string[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const deg = START + SWEEP * t
    // Start as a dry point and thicken into the loaded head at the end of
    // the sweep (the inverse of a drying stroke — a brush being re-loaded).
    const half = TAIL + (HEAD - TAIL) * Math.pow(t, 1.5)
    outer.push(at(R + half, deg))
    inner.push(at(R - half, deg))
  }

  // Trace the outer edge head→tail, then the inner edge back. The flat head
  // is tucked under a round cap circle below, so it reads as a loaded brush.
  const d =
    `M ${outer[0]} ` +
    outer
      .slice(1)
      .map((p) => `L ${p}`)
      .join(' ') +
    ` L ${inner[inner.length - 1]} ` +
    inner
      .slice(0, -1)
      .reverse()
      .map((p) => `L ${p}`)
      .join(' ') +
    ' Z'

  return (
    <span
      className={`enso-spinner ${className}`}
      role="status"
      aria-label={label}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        {/* Paper-ghost full ring — the unswept remainder of the circle. */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke={stroke}
          strokeOpacity="0.08"
          strokeWidth="1"
        />
        <g className="enso-spinner-rot">
          <path d={d} fill={stroke} fillOpacity="0.9" />
          {/* Round, loaded head — now at the end of the sweep. */}
          <circle
            cx={at(R, START + SWEEP).split(' ')[0]}
            cy={at(R, START + SWEEP).split(' ')[1]}
            r={HEAD}
            fill={stroke}
            fillOpacity="0.9"
          />
        </g>
      </svg>
    </span>
  )
}
