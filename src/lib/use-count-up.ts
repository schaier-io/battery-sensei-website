import { useEffect, useRef, useState } from 'react'

type Options = {
  /** Final value to count to. */
  to: number
  /** Initial value the counter renders at while waiting to start. */
  from?: number
  /** Animation duration in ms. */
  durationMs?: number
  /** Element used to gate the count via IntersectionObserver. */
  ref: React.RefObject<HTMLElement | null>
  /** Default true. When false the value lands at `to` immediately. */
  enabled?: boolean
}

/**
 * Count-up hook with an `IntersectionObserver` gate, an `ease-out-expo`
 * curve, and `prefers-reduced-motion` support.
 *
 * Used by the BatteryJournal stat tiles so the cycle / day / capacity
 * numbers ink in like a sumi brush filling a glyph — the eye reads
 * "moving target" and lands on the final number with intent. Plain
 * static numbers on a static card felt inert next to the rest of the
 * page's motion.
 *
 * Returns the current displayed integer. Pair with `Intl.NumberFormat`
 * or a unit suffix at the call site.
 */
export function useCountUp({ to, from = 0, durationMs = 1400, ref, enabled = true }: Options): number {
  const [value, setValue] = useState(from)
  const startedRef = useRef(false)
  const cancelRafRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) {
      setValue(to)
      return
    }
    if (typeof window === 'undefined') return

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (prefersReduced) {
      setValue(to)
      return
    }

    const el = ref.current
    if (!el) return

    const start = () => {
      if (startedRef.current) return
      startedRef.current = true
      const t0 = performance.now()
      const delta = to - from
      let raf = 0
      const step = (now: number) => {
        const elapsed = now - t0
        const t = Math.min(1, elapsed / durationMs)
        // ease-out-expo — confident decisive landing rather than a soft glide
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        setValue(Math.round(from + delta * eased))
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
      cancelRafRef.current = () => cancelAnimationFrame(raf)
    }

    if (typeof IntersectionObserver === 'undefined') {
      start()
      return () => {
        cancelRafRef.current?.()
        cancelRafRef.current = null
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            start()
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.45 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelRafRef.current?.()
      cancelRafRef.current = null
    }
  }, [enabled, from, to, durationMs, ref])

  return value
}
