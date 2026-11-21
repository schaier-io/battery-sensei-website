import { useMounted } from '#/lib/use-mounted'
/**
 * Faint washi paper fibers: seeded dots and short curved strands. Static
 * port of the app's Surfaces/Zen/WashiFiberOverlay.swift (one fiber per
 * 1250 pt², ink at 3.2% light / 1.8% dark). Place inside a `relative`,
 * `overflow-hidden` card.
 */

const FIBER_AREA = 1250

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

export function WashiFibers({
  seed = 1,
  width,
  height,
}: {
  seed?: number
  /** Design size in points; the SVG covers its parent with `slice`. */
  width: number
  height: number
}) {
  // Decorative texture: skip it in the prerendered HTML (first-paint path).
  const mounted = useMounted()
  if (!mounted) return null
  const r = rng(seed)
  const count = Math.max(8, Math.round((width * height) / FIBER_AREA))
  const fibers = []
  for (let i = 0; i < count; i++) {
    const x = r() * width
    const y = r() * height
    const opacity = 0.45 + r() * 0.55
    if (r() < 0.58) {
      const d = 0.7 + r() * 1.9
      fibers.push(
        <ellipse key={i} cx={x} cy={y} rx={(d * (0.8 + r() * 0.7)) / 2} ry={d / 2} fill="currentColor" opacity={opacity} />,
      )
    } else {
      const length = 2 + r() * 8
      const angle = (r() * 2 - 1) * Math.PI
      const dx = length * Math.cos(angle)
      const dy = length * Math.sin(angle)
      const curve = (r() - 0.5) * 4
      fibers.push(
        <path
          key={i}
          d={`M${x} ${y}Q${x + dx / 2 - dy * curve * 0.1} ${y + dy / 2 + dx * curve * 0.1} ${x + dx} ${y + dy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={opacity}
        />,
      )
    }
  }
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full text-sumi opacity-[0.032] dark:opacity-[0.018]"
    >
      {fibers}
    </svg>
  )
}
