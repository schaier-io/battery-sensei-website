import { useId } from 'react'
import { useMounted } from '#/lib/use-mounted'

/**
 * Static port of the power popups' level meter (app:
 * Sources/Warnings/ChargeInkMeter.swift + ChargeInkMeterLayout.swift, with
 * the bristles of Surfaces/Zen/BrushStrokeLine.swift + BrushBristles.swift).
 *
 * A bristled sumi track runs to the charge limit. A gold brush stroke covers
 * it up to the level, and its tip flicks out and fades. Past a limit, a faint
 * brush tail is the reserve the limit keeps free. Drawn in SVG units of the
 * app's 312pt meter width (352pt panel minus 2 × 20pt padding); the SVG
 * stretches to its container, which only lengthens the horizontal bristles.
 */

const W = 312
const ROW_HEIGHT = 11
// Label row under the meter: `mt-px h-3` = 1 + 12 px.
const LABEL_ROW_HEIGHT = 13
const CY = ROW_HEIGHT / 2
const TRACK_WIDTH = 9
const RESERVE_WIDTH = 6
const RESERVE_OPACITY = 0.45
const INK_CORE_WIDTH = 5
const INK_CORE_OPACITY = 0.9
const INK_START_TAPER = 12
const FLICK_LENGTH = 12
const LIMIT_GAP = 3
const TIP_CLEARANCE = 1
const LABEL_GAP = 4
/** Rough advance of a 10px Source Sans 3 glyph; sizes the label clamp. */
const LABEL_CHAR_WIDTH = 5.6
/** BrushBristles.bundleSpread */
const BUNDLE_SPREAD = 1.05
const MAX_EDGE_FRAY = 12
const MAX_DASHES = 80

/** Gold of the hero ring's brush stroke (ZenTheme.brushGold). */
export const BRUSH_GOLD_CLASS = 'text-[#FACC2E] dark:text-[#EBB833]'

/** Deterministic 0…1 from (seed, a, b), like BrushBristles.rand. */
function rand(seed: number, a: number, b: number) {
  let x = (seed ^ Math.imul(a + 1, 0x9e3779b1)) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x ^= Math.imul(b + 1, 0xc2b2ae35)
  x = Math.imul(x ^ (x >>> 13), 0x27d4eb2f)
  x ^= x >>> 16
  return ((x >>> 0) % 10000) / 10000
}

function dashes(seed: number, bristle: number, length: number, edgeBias: number) {
  const out: number[] = []
  let remaining = length
  let k = 10
  while (remaining > 0.5 && out.length < MAX_DASHES) {
    const mark = (4 + rand(seed, bristle, k) * 18) * (1 - edgeBias * 0.45)
    const gap = (0.5 + rand(seed, bristle, k + 1) * 1.6) * (1 + edgeBias * 1.4)
    out.push(Math.min(mark, remaining))
    remaining -= mark
    if (remaining <= 0) break
    out.push(Math.min(gap, remaining))
    remaining -= gap
    k += 2
  }
  return out.map((d) => d.toFixed(2)).join(' ')
}

/** Horizontal fade mask over [x, x + length]: lead-in and lift-off tapers. */
function TaperMask({
  id,
  x,
  length,
  leading,
  trailing,
}: {
  id: string
  x: number
  length: number
  leading: number
  trailing: number
}) {
  const half = length / 2
  const lead = Math.min(leading, half) / length
  const trail = 1 - Math.min(trailing, half) / length
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={ROW_HEIGHT}>
      <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={x} x2={x + length} y1={0} y2={0}>
        <stop offset={0} stopColor="white" stopOpacity={lead > 0 ? 0 : 1} />
        <stop offset={lead} stopColor="white" stopOpacity={1} />
        <stop offset={trail} stopColor="white" stopOpacity={1} />
        <stop offset={1} stopColor="white" stopOpacity={trail < 1 ? 0 : 1} />
      </linearGradient>
      <rect x={x} y={0} width={length} height={ROW_HEIGHT} fill={`url(#${id}-g)`} />
    </mask>
  )
}

/** SVG port of BrushStrokeLine: dashed bristles, wispier at the edges. */
function BrushStrokeLine({
  id,
  x,
  length,
  lineWidth,
  bristles,
  seed,
  leadingTaper = 14,
  trailingTaper = 14,
}: {
  id: string
  x: number
  length: number
  lineWidth: number
  bristles: number
  seed: number
  leadingTaper?: number
  trailingTaper?: number
}) {
  if (length <= 0) return null
  const tapered = leadingTaper > 0 || trailingTaper > 0
  const lines = []
  for (let i = 0; i < bristles; i++) {
    const t = i / Math.max(bristles - 1, 1)
    const y = CY + (t - 0.5) * lineWidth * BUNDLE_SPREAD
    const edgeBias = Math.abs(t - 0.5) * 2
    const fray = 1 + edgeBias * MAX_EDGE_FRAY
    const start = x + rand(seed, i, 1) * fray
    const end = x + length - rand(seed, i, 3) * fray
    if (end <= start) continue
    lines.push(
      <line
        key={i}
        x1={start}
        x2={end}
        y1={y}
        y2={y}
        stroke="currentColor"
        strokeOpacity={0.3 + 0.55 * (1 - edgeBias)}
        strokeWidth={0.55 + (1 - edgeBias) * 0.85 + rand(seed, i, 7) * 0.25}
        strokeDasharray={dashes(seed, i, end - start, edgeBias)}
      />,
    )
  }
  return (
    <>
      {tapered && (
        <TaperMask id={id} x={x} length={length} leading={leadingTaper} trailing={trailingTaper} />
      )}
      <g mask={tapered ? `url(#${id})` : undefined}>{lines}</g>
    </>
  )
}

/** ChargeInkMeterLayout: geometry in points of the 312pt meter. */
function meterLayout(level: number, target: number) {
  const hasReserve = target < 1
  const limitX = W * Math.min(Math.max(target, 0), 1)
  const gap = hasReserve ? LIMIT_GAP : 0
  const strokeLimit = Math.max(limitX - gap - (hasReserve ? TIP_CLEARANCE : 0), 0)
  const raw = W * Math.min(Math.max(level, 0), 1)
  const end = level > target ? raw : Math.min(raw, strokeLimit)
  const flick =
    !hasReserve || level > target
      ? Math.min(FLICK_LENGTH, end)
      : Math.min(FLICK_LENGTH, end, Math.max(limitX - gap - end, 0))
  return { hasReserve, limitX, gap, end, flick }
}

/** Text centered under x, moved in only as far as it must to stay inside. */
function labelCenter(x: number, textWidth: number) {
  const half = Math.min(textWidth, W) / 2
  return Math.min(Math.max(x, half), W - half)
}

export function ChargeInkMeter({
  level,
  target = 1,
  levelLabel,
  targetLabel,
  tintClass = BRUSH_GOLD_CLASS,
}: {
  /** Current level, 0…1. */
  level: number
  /** Charge limit, 0…1. At 1 there is no reserve tail. */
  target?: number
  levelLabel: string
  targetLabel?: string
  /** Tailwind text-color class for the gold stroke (red in the low state). */
  tintClass?: string
}) {
  const id = useId().replace(/[:]/g, '')
  const { hasReserve, limitX, gap, end, flick } = meterLayout(level, target)
  const pct = (x: number) => x / W

  const levelWidth = levelLabel.length * LABEL_CHAR_WIDTH
  const targetWidth = targetLabel ? targetLabel.length * LABEL_CHAR_WIDTH : undefined
  const levelX = labelCenter(end, levelWidth)
  const targetX = targetWidth !== undefined ? labelCenter(limitX, targetWidth) : 0
  // ChargeInkMeterLayout.levelLabelFits
  const levelFits =
    level <= target &&
    (targetWidth === undefined || levelX + levelWidth / 2 + LABEL_GAP <= targetX - targetWidth / 2)

  // Procedural bristles are ~8 KB gzip per meter: render them after
  // hydration so they stay out of the prerendered HTML. The box keeps its
  // height (meter row + label row), so nothing shifts when they appear.
  const mounted = useMounted()
  if (!mounted) return <div aria-hidden className="w-full" style={{ height: ROW_HEIGHT + LABEL_ROW_HEIGHT }} />

  return (
    <div aria-hidden className="w-full">
      <svg
        viewBox={`0 0 ${W} ${ROW_HEIGHT}`}
        width="100%"
        height={ROW_HEIGHT}
        preserveAspectRatio="none"
        className="block overflow-visible"
      >
        <defs>
          {/* The track shows only ahead of the gold: it fades in under the flick. */}
          <linearGradient id={`${id}-tg`} gradientUnits="userSpaceOnUse" x1={0} x2={W} y1={0} y2={0}>
            <stop offset={pct(end)} stopColor="white" stopOpacity={0} />
            <stop offset={pct(end + flick)} stopColor="white" stopOpacity={1} />
          </linearGradient>
          <mask id={`${id}-tm`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={ROW_HEIGHT}>
            <rect width={W} height={ROW_HEIGHT} fill={`url(#${id}-tg)`} />
          </mask>
          {/* Gold: short brushed start, solid to the level, tip fades out. */}
          <linearGradient id={`${id}-ig`} gradientUnits="userSpaceOnUse" x1={0} x2={W} y1={0} y2={0}>
            <stop offset={0} stopColor="white" stopOpacity={0} />
            <stop offset={pct(Math.min(INK_START_TAPER, end / 2))} stopColor="white" stopOpacity={1} />
            <stop offset={pct(end)} stopColor="white" stopOpacity={1} />
            <stop offset={pct(end + flick)} stopColor="white" stopOpacity={0} />
          </linearGradient>
          <mask id={`${id}-im`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={ROW_HEIGHT}>
            <rect width={W} height={ROW_HEIGHT} fill={`url(#${id}-ig)`} />
          </mask>
        </defs>

        <g mask={`url(#${id}-tm)`}>
          <g className="text-sumi">
            <BrushStrokeLine
              id={`${id}-track`}
              x={0}
              length={Math.max(limitX - gap, 0)}
              lineWidth={TRACK_WIDTH}
              bristles={16}
              seed={0xb155}
            />
          </g>
          {hasReserve && (
            <g className="text-sumi-soft" opacity={RESERVE_OPACITY}>
              <BrushStrokeLine
                id={`${id}-reserve`}
                x={limitX + gap}
                length={Math.max(W - limitX - gap, 0)}
                lineWidth={RESERVE_WIDTH}
                bristles={10}
                seed={0x7a11}
                leadingTaper={4}
                trailingTaper={30}
              />
            </g>
          )}
        </g>

        {end > 0 && (
          <g mask={`url(#${id}-im)`} className={tintClass}>
            <rect
              x={0}
              y={CY - INK_CORE_WIDTH / 2}
              width={W}
              height={INK_CORE_WIDTH}
              fill="currentColor"
              opacity={INK_CORE_OPACITY}
            />
            <BrushStrokeLine
              id={`${id}-ink`}
              x={0}
              length={W}
              lineWidth={TRACK_WIDTH}
              bristles={20}
              seed={0xc0fe}
              leadingTaper={0}
              trailingTaper={0}
            />
            <BrushStrokeLine
              id={`${id}-core`}
              x={0}
              length={W}
              lineWidth={INK_CORE_WIDTH}
              bristles={12}
              seed={0xc0ff}
              leadingTaper={0}
              trailingTaper={0}
            />
          </g>
        )}
      </svg>

      {/* Labels: level (semibold, ink) under the tip; limit (regular, grey) under the gap. */}
      <div className="relative mt-px h-3 text-[10px] leading-3 tabular-nums">
        {levelFits && (
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-semibold text-sumi"
            style={{ left: `${pct(levelX) * 100}%` }}
          >
            {levelLabel}
          </span>
        )}
        {targetLabel && (
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-sumi-soft"
            style={{ left: `${pct(targetX) * 100}%` }}
          >
            {targetLabel}
          </span>
        )}
      </div>
    </div>
  )
}
