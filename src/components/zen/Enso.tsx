import { useId } from 'react'

type EnsoProps = {
  className?: string
  stroke?: string
  size?: number
}

/**
 * Sumi enso brush stroke. Built from clustered concentric bristle arcs with
 * deliberate paper-white gaps between clusters (the "track lines" you see in
 * a real loaded brush), tapered along its length via a gradient mask so the
 * stroke reads as loaded → dry, and finished with a long fanned tail of
 * parallel hair flicks at the exit point.
 */
export function Enso({ className, stroke = 'currentColor', size = 520 }: EnsoProps) {
  const id = useId().replace(/[:]/g, '')

  // Two bristle clusters with a paper-white gap between them.
  // Each bristle = [radius, strokeWidth, opacity, delayMs]
  const clusters: Array<Array<[number, number, number, number]>> = [
    // Dense core (the loaded body)
    [
      [84.0, 2.0, 1.0, 0],
      [83.0, 2.6, 1.0, 30],
      [82.0, 2.4, 1.0, 60],
      [81.0, 1.8, 0.95, 90],
    ],
    // ── visible paper gap at r ≈ 80 ──
    // Inner thin cluster
    [
      [78.5, 1.0, 0.65, 130],
      [77.5, 0.8, 0.45, 170],
      [76.5, 0.6, 0.28, 210],
    ],
  ]

  const bristles = clusters.flat()

  const exitAngleDeg = 230
  const arcEndpoint = (r: number) => {
    const rad = ((exitAngleDeg - 90) * Math.PI) / 180
    return { x: 110 + r * Math.cos(rad), y: 110 + r * Math.sin(rad) }
  }

  // (Tail fan removed — body bristles only.)

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        {/* Crisp split-hair filter — tighter, higher displacement */}
        <filter id={`bristle-${id}`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        {/* Coarse paper-bleed filter */}
        <filter id={`rough-${id}`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        {/* Sharp ultra-high-frequency filter for the very fine top bristles */}
        <filter id={`fine-${id}`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="17" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <filter id={`spatter-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="14" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>

        {/* Taper mask: loaded edge fades in, body solid, dry edge fades out.
            Aligned diagonally so it follows the brush direction (top→lower-left). */}
        <linearGradient id={`taper-${id}`} x1="80%" y1="0%" x2="20%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="18%" stopColor="white" stopOpacity="1" />
          <stop offset="62%" stopColor="white" stopOpacity="1" />
          <stop offset="86%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0.3" />
        </linearGradient>
        <mask id={`taper-mask-${id}`}>
          <rect width="220" height="220" fill={`url(#taper-${id})`} />
        </mask>
      </defs>

      {/* Body — masked for taper */}
      <g
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        transform="translate(110 110) rotate(-22) translate(-110 -110)"
        mask={`url(#taper-mask-${id})`}
      >
        {bristles.map(([r, w, op, delay], i) => {
          const end = arcEndpoint(r)
          const start = { x: 110, y: 110 - r }
          // Pick filter per bristle for variation
          const filter =
            i % 4 === 0
              ? `url(#fine-${id})`
              : i % 3 === 0
                ? `url(#rough-${id})`
                : `url(#bristle-${id})`
          return (
            <path
              key={i}
              d={`M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
              strokeWidth={w}
              opacity={op}
              filter={filter}
              className="enso-spin enso-main"
              style={{ animationDelay: `${delay}ms` }}
            />
          )
        })}
      </g>

      {/* Tail fan removed per design choice */}

      {/* Ink loading drop at brush start */}
      <g className="enso-fade" style={{ animationDelay: '40ms' }}>
        <ellipse
          cx="148"
          cy="22"
          rx="6.5"
          ry="4"
          fill={stroke}
          opacity="0.65"
          filter={`url(#rough-${id})`}
        />
      </g>

      {/* Spatter removed with bristle ends */}
    </svg>
  )
}
