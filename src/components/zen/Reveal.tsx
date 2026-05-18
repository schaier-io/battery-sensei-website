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
  as: Tag = 'div',
  delay = 0,
  className = '',
  stamp = false,
  threshold = 0.18,
  once = true,
  style,
  id,
}: RevealProps) {
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
      { threshold, rootMargin: '0px 0px -8% 0px' },
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
