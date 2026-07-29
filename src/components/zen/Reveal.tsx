import { useEffect, useRef, type ReactNode, type ElementType, type CSSProperties } from 'react'

type RevealProps = {
  children: ReactNode
  as?: ElementType
  delay?: number
  className?: string
  stamp?: boolean
  threshold?: number
  once?: boolean
  style?: CSSProperties
  id?: string
}

export function Reveal({
  children,
  as = 'div',
  delay = 0,
  className = '',
  stamp = false,
  threshold = 0.04,
  once = true,
  style,
  id,
}: RevealProps) {
  // React 19 + TS 6 collapse polymorphic ElementType props to `never` at
  // the call site. The plain `any` cast is the standard escape hatch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag: any = as
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-revealed', 'true')
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            if (once) io.unobserve(entry.target)
          } else if (!once) {
            entry.target.setAttribute('data-revealed', 'false')
          }
        }
      },
      // Fire as soon as the element's leading edge enters the viewport.
      // The old 0.18 threshold + -8% bottom inset meant tall sections (which
      // wrap whole groups) had to be substantially on screen before fading
      // in — content visibly popped in late, after the reader was already
      // looking at the empty space it should have occupied.
      { threshold, rootMargin: '0px 0px 0px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, once])

  return (
    <Tag
      ref={ref as never}
      id={id}
      data-reveal=""
      {...(stamp ? { 'data-stamp': '' } : {})}
      className={className}
      style={{ ...style, ['--reveal-delay' as never]: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
