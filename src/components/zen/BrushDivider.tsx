import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

export function BrushDivider({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 95%', 'end 25%'],
  })
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.5 })
  const dashOffset = useTransform(smooth, [0, 1], [1400, 0])

  return (
    <div ref={ref} className={`mx-auto max-w-6xl px-6 ${className}`}>
      <svg
        viewBox="0 0 1200 24"
        className="brush-divider"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter id="bd-rough" x="-2%" y="-50%" width="104%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.7" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
        <motion.path
          d="M 30 12 C 250 4, 550 22, 800 10 S 1100 14, 1170 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#bd-rough)"
          strokeDasharray={1400}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
    </div>
  )
}
