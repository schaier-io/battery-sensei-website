import { useEffect, useRef } from 'react'

type HankoProps = {
  kanji: string
  className?: string
  /** Animate a stamp-down on first scroll into view */
  animate?: boolean
}

export function Hanko({ kanji, className = '', animate = true }: HankoProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !animate) return
    if (typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-revealed', 'true')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [animate])

  return (
    <span
      ref={ref}
      className={`hanko ${className}`}
      aria-hidden
      {...(animate ? { 'data-stamp': '' } : {})}
    >
      {kanji}
    </span>
  )
}
