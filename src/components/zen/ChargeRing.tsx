import { useEffect, useId, useRef, useState } from 'react'
import { BrushRing } from '#/components/zen/BrushRing'

type ChargeRingProps = {
  /** 0..1 — how much of the gold arc fills the ring. */
  fraction: number
  /** Ring diameter in px. */
  size?: number
  /** Optional caption shown under the icon. */
  percentLabel?: string
  subLabel?: string
  className?: string
  /** Path to the centered asset. Defaults to the transparent SVG logo so
   *  the white coin behind shows through cleanly. */
  iconSrc?: string
  iconSrcSet?: string
}

/**
 * Bristled sumi brush ring with a gold charge arc, a shimmer that sweeps
 * along the arc, and the Battery Sensei app icon centered. Mirrors the
 * macOS app's `heroIconPanel` (ContentView.swift), plus a "charging"
 * shimmer to make the website hero feel alive.
 */
export function ChargeRing({
  fraction,
  size = 260,
  percentLabel,
  subLabel,
  className = '',
  iconSrc = '/logo.svg',
  iconSrcSet,
}: ChargeRingProps) {
  const [revealed, setRevealed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 220)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      ref={rootRef}
      className={`relative inline-grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer sumi bristled brush ring — closed full circle. */}
      <BrushRing
        className="absolute inset-0 text-sumi"
        size={size}
        lineWidth={Math.max(6, Math.round(size * 0.038))}
        bristleCount={24}
        trim={[0.0, 1.0]}
        inkOpacity={0.52}
        animate={false}
      />

      {/* Single solid gold stroke. One continuous arc in kin from the top
          clockwise to fraction. */}
      <GoldUnderstroke
        fraction={fraction}
        revealed={revealed}
        size={size}
      />

      {/* One roving wet-ink shimmer with its own gradient (transparent →
          bright → transparent along the dash). */}
      <ChargeArc fraction={fraction} revealed={revealed} className="absolute inset-0" />

      {/* Logo coin — fully rounded white plate framing the icon so it sits
          cleanly inside the bristled outer ring. */}
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: Math.round(size * 0.54),
          height: Math.round(size * 0.54),
          background: '#ffffff',
          boxShadow: '0 8px 22px -12px rgba(28,26,23,0.28)',
          transform: revealed ? 'scale(1)' : 'scale(0.92)',
          opacity: revealed ? 1 : 0,
          transition:
            'transform 720ms cubic-bezier(0.2, 0.8, 0.2, 1) 220ms, opacity 720ms cubic-bezier(0.2, 0.8, 0.2, 1) 220ms',
        }}
      >
        <img
          src={iconSrc}
          {...(iconSrcSet ? { srcSet: iconSrcSet } : {})}
          alt=""
          aria-hidden
          className="relative"
          style={{
            width: Math.round(size * 0.42),
            height: Math.round(size * 0.42),
          }}
        />
      </div>

      {(percentLabel || subLabel) && (
        <div
          className="absolute left-1/2 top-full -translate-x-1/2 pt-5 text-center"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed
              ? 'translate(-50%, 0)'
              : 'translate(-50%, 6px)',
            transition:
              'opacity 600ms cubic-bezier(0.2, 0.8, 0.2, 1) 980ms, transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1) 980ms',
          }}
        >
          {percentLabel && (
            <p className="display-title text-[2.25rem] font-bold leading-none tabular-nums tracking-[-0.02em] text-sumi">
              {percentLabel}
            </p>
          )}
          {subLabel && (
            <p className="mt-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft">
              {subLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Solid kin under-stroke for the gold body. Provides one continuous arc
 * so the BrushRing layered on top — which is naturally a *band* of
 * parallel bristles — can't visually split into two lines at its edges.
 */
/**
 * One continuous gold stroke with sumi-style ink character. Painted as a
 * CSS `conic-gradient` so the fade-in / fade-out at the **actual start
 * and end angles** of the arc work correctly (SVG linearGradients can't
 * follow a curved path). The conic ring is then run through an SVG
 * turbulence filter for ink wobble.
 */
function GoldUnderstroke({
  fraction,
  revealed,
  size,
}: {
  fraction: number
  revealed: boolean
  size: number
}) {
  const arcEnd = Math.max(0, Math.min(1, fraction))
  const totalDeg = arcEnd * 360
  const fadeIn = 12 // degrees of fade at the start
  const fadeOut = 12 // degrees of fade at the end

  // Reveal: snap the visible angular span to 0 before mount, then grow
  // to its target on reveal so the gold draws in as one continuous body.
  const visibleDeg = revealed ? totalDeg : 0

  // Build the conic stops. CSS conic-gradient angles measure clockwise
  // from the 12-o'clock position by default, so `from 0deg` puts the
  // gold's first stop right at 12 o'clock and the cone walks clockwise.
  // With fraction=0.8 (288°), the visible gold ends at 12 + 288° ≈ 9.
  const stops = (() => {
    if (visibleDeg <= 0) return 'transparent 0deg, transparent 360deg'
    if (visibleDeg <= fadeIn + fadeOut) {
      // Too short for both caps to fit — taper from 0 → peak → 0 over
      // whatever angular room we have.
      const half = visibleDeg / 2
      return [
        `transparent 0deg`,
        `var(--kin) ${half.toFixed(2)}deg`,
        `transparent ${visibleDeg.toFixed(2)}deg`,
        `transparent 360deg`,
      ].join(', ')
    }
    return [
      `transparent 0deg`,
      `var(--kin) ${fadeIn}deg`,
      `var(--kin) ${(visibleDeg - fadeOut).toFixed(2)}deg`,
      `transparent ${visibleDeg.toFixed(2)}deg`,
      `transparent 360deg`,
    ].join(', ')
  })()

  // Annular mask: keep only the band between strokeInner and strokeOuter
  // radii so the conic-gradient fill reads as a stroke, not a pie slice.
  const strokeW = Math.max(7, (size / 220) * 13)
  const innerR = 80 // px in the 220 viewBox
  const outerR = innerR + strokeW

  return (
    <div
      className="absolute inset-0"
      style={{ filter: 'url(#gold-ink-filter)', opacity: 0.85 }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${stops})`,
          // closest-side puts the gradient's 100% reference at the div's
          // edge (size/2), so the inner/outer radii line up with the
          // sumi BrushRing's bristle band (baseR=86 ± ~5 in viewBox 220
          // ≈ 73 % to 83 % of half-side).
          WebkitMaskImage: `radial-gradient(circle closest-side, transparent 71%, #000 73%, #000 84%, transparent 86%)`,
          maskImage: `radial-gradient(circle closest-side, transparent 71%, #000 73%, #000 84%, transparent 86%)`,
          transition:
            'background 1.4s cubic-bezier(0.55, 0.08, 0.18, 1) 220ms',
        }}
      />
      {/* Hidden SVG holds the wobble filter so the conic stroke reads as
          inked, not as a CSS arc. */}
      <svg
        width="0"
        height="0"
        aria-hidden
        style={{ position: 'absolute' }}
      >
        <defs>
          <filter id="gold-ink-filter" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.7"
              numOctaves="2"
              seed="11"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}

/**
 * One wet-ink shimmer. Rendered as a single short arc <path> with its own
 * linearGradient (objectBoundingBox) whose stops fade opacity to 0 at
 * both ends — so the dash has a soft fade-in / peak / fade-out painted
 * into its stroke colour. CSS rotates the path around the circle centre
 * so the shimmer roams across the gold portion, with an opacity envelope
 * driving the entrance/exit fade and a real rest period before looping.
 */
function ChargeArc({
  fraction,
  revealed,
  className,
}: {
  fraction: number
  revealed: boolean
  className?: string
}) {
  const id = useId().replace(/[:]/g, '')
  const VB = 220
  const cx = VB / 2
  const cy = VB / 2
  const r = 86

  if (!revealed || fraction <= 0) {
    return null
  }

  // Shimmer's angular length on the ring. Small + soft.
  const shimmerDeg = 26
  // The path is defined at the top of the circle. CSS rotation moves it
  // around. We sweep it from 0° (top) to (fraction * 360 - shimmerDeg)°
  // so the trailing edge never overshoots the end of the gold.
  const endDeg = Math.max(0, fraction * 360 - shimmerDeg)
  const a0 = -90 // start angle (top of circle, in degrees from +x)
  const a1 = a0 + shimmerDeg
  const toRad = (d: number) => (d * Math.PI) / 180
  const x0 = cx + r * Math.cos(toRad(a0))
  const y0 = cy + r * Math.sin(toRad(a0))
  const x1 = cx + r * Math.cos(toRad(a1))
  const y1 = cy + r * Math.sin(toRad(a1))
  const d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`

  const strokeW = 10

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" className={className} aria-hidden>
      <defs>
        {/* Gradient painted *into the shimmer stroke*. objectBoundingBox
            makes the gradient travel with the path, so the fade-at-ends
            stays attached to the dash no matter where CSS rotates it. */}
        <linearGradient
          id={`charge-arc-shimmer-${id}`}
          x1="0"
          y1="0.5"
          x2="1"
          y2="0.5"
        >
          <stop offset="0%" stopColor="#fff8d6" stopOpacity="0" />
          <stop offset="25%" stopColor="#fff8d6" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="75%" stopColor="#fff8d6" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff8d6" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        className="charge-ring-shimmer"
        d={d}
        fill="none"
        stroke={`url(#charge-arc-shimmer-${id})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
        opacity="0"
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          ['--shimmer-end' as never]: `${endDeg.toFixed(2)}deg`,
        }}
      />
    </svg>
  )
}
