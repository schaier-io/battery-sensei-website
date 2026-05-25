import { useId, useMemo } from 'react'

// Deterministic PRNG — pairs with the app's InkPRNG output style.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type InkLevelThreshold = {
  /** Semantic battery fraction this threshold fires at (drives the pulse delay). */
  fraction: number
  /**
   * Optional visual position 0…1 used for the flick along the bar.
   * Defaults to `fraction`. Useful when several thresholds bunch at the
   * low end of a linear bar; passing spread-out values keeps them legible.
   */
  displayFraction?: number
  /** Visual tint — maps to css variables. */
  level: 'info' | 'warn' | 'critical'
  /** Optional label rendered beside the flick. */
  label?: string
}

type InkLevelBarProps = {
  className?: string
  /** Total bar width in svg units; viewBox scales responsively via `width="100%"`. */
  baseWidth?: number
  /** Thresholds drawn as vertical sumi flicks across the bar. */
  thresholds?: InkLevelThreshold[]
  /** When true, the wet-brush meter cycles drain → recharge. Off renders a static stroke. */
  animate?: boolean
  /** Seed for reproducible wobble. */
  seed?: number
}

const DEFAULT_THRESHOLDS: InkLevelThreshold[] = [
  { fraction: 0.35, level: 'info' },
  { fraction: 0.15, level: 'warn' },
  { fraction: 0.05, level: 'critical' },
]

// Colors mirror the app's rule-style palette in SetupWizardWarningPreview
// (`color(for: rule)` / `styleTextColor`): smallCenter → bright blue,
// redOverlay → orange, flashingOverlay → red.
const COLOR_BY_LEVEL: Record<InkLevelThreshold['level'], string> = {
  info: 'rgb(33, 125, 247)', // #217DF7 — Color(0.13, 0.49, 0.97)
  warn: 'rgb(250, 133, 10)', // #FA850A — MenuBarBatteryChargeBand.orange
  critical: 'rgb(255, 56, 71)', // #FF3848 — MenuBarBatteryChargeBand.red
}

/**
 * Horizontal sumi ink meter — port of the warning-level preview from the app
 * (`Surfaces/SetupWizard.swift` → `SetupWizardWarningPreview`, `InkBrushStroke`,
 * `InkVerticalFlick`, `InkHeadMask`).
 *
 * The faint dry-brush track represents the full battery span; the dark wet
 * stroke is the live charge, which drains from full to empty in a slow cycle,
 * dissolving into the page at the head (mirrors `InkHeadMask`'s dispersion
 * gradient). Each threshold is a vertical sumi flick that pulses as the live
 * stroke passes over it.
 */
export function InkLevelBar({
  className,
  baseWidth = 420,
  thresholds = DEFAULT_THRESHOLDS,
  animate = true,
  seed = 0x517f,
}: InkLevelBarProps) {
  const id = useId().replace(/[:]/g, '')
  const W = baseWidth
  const H = 30
  const Y = H / 2
  const THICKNESS = 6.5
  const id_wet = `ink-wet-${id}`
  const id_fade = `ink-fade-${id}`

  // Pre-compute brush passes so the wobble is stable across re-renders.
  const dryPasses = useMemo(() => buildBrushPasses({ seed, w: W, y: Y, thickness: THICKNESS, wet: false }), [seed, W])
  const wetPasses = useMemo(() => buildBrushPasses({ seed: seed + 32, w: W, y: Y, thickness: THICKNESS, wet: true }), [seed, W])
  const dryEndCaps = useMemo(() => buildSpeckles({ seed: seed + 91, w: W, y: Y, thickness: THICKNESS, wet: false }), [seed, W])
  const wetEndCaps = useMemo(() => buildSpeckles({ seed: seed + 123, w: W, y: Y, thickness: THICKNESS, wet: true }), [seed, W])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className={`ink-level-bar ${animate ? 'ink-level-bar--animate' : ''} ${className ?? ''}`}
      aria-hidden
    >
      <defs>
        {/* Linear fade for the wet-stroke's dispersing head — mirrors InkHeadMask. */}
        <linearGradient id={id_fade} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="62%" stopColor="white" stopOpacity="1" />
          <stop offset="74%" stopColor="white" stopOpacity="0.86" />
          <stop offset="84%" stopColor="white" stopOpacity="0.55" />
          <stop offset="92%" stopColor="white" stopOpacity="0.24" />
          <stop offset="98%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* The wet stroke is drawn full-width and revealed via this mask. Two
            stacked rects share the same clip-path (animated charge fraction):
            • `--fade`  uses the dispersion gradient — visible while DRAINING,
              so the head dissolves into the page like ink in water.
            • `--sharp` is solid white — visible while RECHARGING, so the head
              advances with a clean, deliberate edge.
            `--ink-head-fade` (0 = sharp, 1 = fade) is keyframed in styles.css
            and switches between them at the drain↔recharge boundary. */}
        <mask id={id_wet} maskUnits="userSpaceOnUse">
          <rect
            className="ink-level-bar__mask ink-level-bar__mask--fade"
            x="0"
            y="0"
            width={W}
            height={H}
            fill={`url(#${id_fade})`}
          />
          <rect
            className="ink-level-bar__mask ink-level-bar__mask--sharp"
            x="0"
            y="0"
            width={W}
            height={H}
            fill="white"
          />
        </mask>
      </defs>

      <BrushGroup
        passes={dryPasses}
        speckles={dryEndCaps}
        color="var(--sumi)"
        opacityScale={0.32}
      />

      <g mask={`url(#${id_wet})`}>
        <BrushGroup
          passes={wetPasses}
          speckles={wetEndCaps}
          color="var(--sumi)"
          opacityScale={0.92}
        />
      </g>

      {thresholds.map((t, i) => (
        <Flick
          key={`${t.fraction}-${i}`}
          x={(t.displayFraction ?? t.fraction) * W}
          y={Y}
          color={COLOR_BY_LEVEL[t.level]}
          seed={seed + 11 * (i + 1) + Math.round(t.fraction * 100)}
          fraction={t.fraction}
        />
      ))}
    </svg>
  )
}

type BrushPass = { d: string; strokeWidth: number; opacity: number }
type Speckle = { x: number; y: number; length: number; opacity: number; strokeWidth: number; angle: number }

function buildBrushPasses({
  seed,
  w,
  y,
  thickness,
  wet,
}: {
  seed: number
  w: number
  y: number
  thickness: number
  wet: boolean
}): BrushPass[] {
  const passes = wet ? 5 : 3
  const out: BrushPass[] = []
  for (let p = 0; p < passes; p++) {
    const r = rng(seed + p * 1009)
    const yJitter = (r() - 0.5) * 0.6 * thickness
    const amplitude = thickness * (wet ? 0.2 : 0.32)
    const phase = r() * 6.28
    const frequency = 0.045 + p * 0.012
    const step = Math.max(2.5, 5 - p * 0.4)
    const segCount = Math.max(8, Math.round(w / step))
    const widthBase = thickness * (wet ? 0.55 + p * 0.1 : 0.4 + p * 0.1)
    const alphaBase = wet ? 0.42 + p * 0.1 : 0.3 + p * 0.12

    const taperLen = Math.min(w * 0.5, Math.max(thickness * 2.0, 10))
    let d = ''
    let drawing = false
    for (let s = 0; s <= segCount; s++) {
      const t = s / segCount
      const x = w * t
      const wave = Math.sin(x * frequency + phase) * amplitude * 0.5
      const bucket = Math.floor(x / 4)
      const noise = (rng(seed + bucket)() - 0.5) * 2 * amplitude * 0.35
      const yp = y + yJitter + wave + noise

      const distFromStart = x
      const distFromEnd = w - x
      const edgeT = Math.min(1, Math.min(distFromStart, distFromEnd) / taperLen)
      // Dropout near the ends — randomly skip segments so the brush "runs dry".
      const dropoutThreshold = Math.max(0, 1 - edgeT * 1.4)
      const dropoutNoise = rng(seed + p * 1097 + s)()
      const draw = dropoutNoise > dropoutThreshold

      if (draw) {
        d += drawing ? ` L ${x.toFixed(2)} ${yp.toFixed(2)}` : ` M ${x.toFixed(2)} ${yp.toFixed(2)}`
        drawing = true
      } else {
        drawing = false
      }
    }

    out.push({
      d: d.trim(),
      strokeWidth: Math.max(0.5, widthBase * 0.7),
      opacity: alphaBase,
    })
  }
  return out
}

function buildSpeckles({
  seed,
  w,
  y,
  thickness,
  wet,
}: {
  seed: number
  w: number
  y: number
  thickness: number
  wet: boolean
}): Speckle[] {
  const endSpeckles = wet ? 9 : 6
  const midSpeckles = wet ? 4 : 2
  const capWindow = Math.min(w * 0.45, Math.max(thickness * 3, 14))
  const out: Speckle[] = []

  const r = rng(seed)
  for (let s = 0; s < endSpeckles; s++) {
    const bias = Math.pow(r(), 1.8)
    const nearStart = (s & 1) === 0
    const cx = nearStart ? capWindow * bias : w - capWindow * bias
    const length = 0.6 + r() * 2.8
    const yJ = (r() - 0.5) * 1.4 * thickness * 0.5
    const alpha = 0.1 + r() * 0.3
    const strokeW = thickness * (0.16 + r() * 0.18)
    out.push({
      x: cx,
      y: y + yJ,
      length,
      opacity: alpha,
      strokeWidth: Math.max(0.4, strokeW),
      angle: 0,
    })
  }

  for (let s = 0; s < midSpeckles; s++) {
    const t = 0.18 + r() * 0.64
    const cx = w * t
    const length = 1 + r() * 2.5
    const yJ = (r() - 0.5) * 0.9 * thickness * 0.5
    const alpha = 0.14 + r() * 0.14
    out.push({
      x: cx,
      y: y + yJ,
      length,
      opacity: alpha,
      strokeWidth: thickness * 0.26,
      angle: 0,
    })
  }
  return out
}

function BrushGroup({
  passes,
  speckles,
  color,
  opacityScale,
}: {
  passes: BrushPass[]
  speckles: Speckle[]
  color: string
  opacityScale: number
}) {
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {passes.map((p, i) => (
        <path
          key={`p${i}`}
          d={p.d}
          strokeWidth={p.strokeWidth}
          opacity={p.opacity * opacityScale}
        />
      ))}
      {speckles.map((s, i) => (
        <line
          key={`s${i}`}
          x1={s.x - s.length / 2}
          y1={s.y}
          x2={s.x + s.length / 2}
          y2={s.y}
          strokeWidth={s.strokeWidth}
          opacity={s.opacity * opacityScale}
        />
      ))}
    </g>
  )
}

function Flick({
  x,
  y,
  color,
  seed,
  fraction,
}: {
  x: number
  y: number
  color: string
  seed: number
  fraction: number
}) {
  // Vertical sumi flick — short downward stroke with tapered, irregular edges.
  // Renders 4 overlapping passes (matches InkVerticalFlick in the app).
  const HEIGHT = 24
  const TH = 3
  const passes = useMemo(() => {
    const out: BrushPass[] = []
    for (let p = 0; p < 4; p++) {
      const r = rng(seed + p * 211)
      const xJitter = (r() - 0.5) * 0.7 * TH
      const widthBase = TH * (0.55 + p * 0.12)
      const alphaBase = 0.42 + p * 0.14
      const phase = r() * 6.28
      const segCount = Math.max(10, Math.round(HEIGHT / 2.5))

      let d = ''
      for (let s = 0; s <= segCount; s++) {
        const t = s / segCount
        const yp = -HEIGHT / 2 + HEIGHT * t
        const wobble = Math.sin(t * Math.PI * 1.6 + phase) * TH * 0.16
        const segJ = (r() - 0.5) * 0.8 * TH * 0.35
        const xp = xJitter + wobble + segJ
        d += s === 0 ? `M ${xp.toFixed(2)} ${yp.toFixed(2)}` : ` L ${xp.toFixed(2)} ${yp.toFixed(2)}`
      }
      out.push({
        d,
        strokeWidth: Math.max(0.4, widthBase),
        opacity: alphaBase,
      })
    }
    return out
  }, [seed])

  // The cycle is a stepwise descent through the thresholds — the wet brush
  // pauses at each fraction (where a checkpoint pulse should fire) before
  // dropping to the next. Times below match the @keyframes in styles.css.
  // Cycle is 10 s; the visual settling points are 0.32 / 0.16 / 0.07 (set in
  // Features.tsx via displayFraction). The pulse fires just as the brush
  // head lands on each flick (≈11 %, ≈28 %, ≈45 % of the cycle).
  const CHECKPOINT_TIMES: Record<string, number> = {
    // Semantic battery percent → seconds into the 10 s cycle when the wet
    // brush head settles on this threshold's flick (visual settling points
    // are 0.32 / 0.16 / 0.07 — see styles.css ink-level-cycle).
    '0.15': 1.1, // Info  — head arrives at flick position 0.32
    '0.05': 2.8, // Warn  — head arrives at flick position 0.16
    '0.02': 4.5, // Alert — head arrives at flick position 0.07
    // Legacy values from the previous threshold scheme.
    '0.35': 1.1,
  }
  const key = fraction.toFixed(2)
  const delaySec = CHECKPOINT_TIMES[key] ?? (1 - fraction) * 5

  // Position the flick via an outer <g transform=…>. The inner group carries
  // the CSS-driven pulse animation; keeping the two responsibilities separate
  // avoids the CSS `transform: scale(1)` keyframe overriding the SVG translate.
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <g
        className="ink-level-bar__flick"
        style={{ animationDelay: `${delaySec.toFixed(2)}s`, color }}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {passes.map((p, i) => (
          <path
            key={i}
            d={p.d}
            strokeWidth={p.strokeWidth}
            opacity={p.opacity}
          />
        ))}
      </g>
    </g>
  )
}
