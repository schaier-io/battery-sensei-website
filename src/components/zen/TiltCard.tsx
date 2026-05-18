import type { SpringOptions } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

interface TiltCardProps {
  children: ReactNode
  className?: string
  rotateAmplitude?: number
  scaleOnHover?: number
  perspective?: number
}

const spring: SpringOptions = { damping: 30, stiffness: 100, mass: 2 }

/**
 * Content-tilt wrapper. Same motion physics as React Bits Pro `TiltedCard`,
 * but tilts arbitrary children instead of an <img>. Built for paper cards.
 */
export function TiltCard({
  children,
  className = '',
  rotateAmplitude = 8,
  scaleOnHover = 1.02,
  perspective = 900,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(useMotionValue(0), spring)
  const rotateY = useSpring(useMotionValue(0), spring)
  const scale = useSpring(1, spring)

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - rect.width / 2
    const offsetY = e.clientY - rect.top - rect.height / 2
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude)
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude)
  }

  function handleEnter() {
    scale.set(scaleOnHover)
  }

  function handleLeave() {
    rotateX.set(0)
    rotateY.set(0)
    scale.set(1)
  }

  return (
    <div
      ref={ref}
      className={`[transform-style:preserve-3d] ${className}`}
      style={{ perspective: `${perspective}px` }}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <motion.div
        className="h-full w-full [transform-style:preserve-3d] will-change-transform"
        style={{ rotateX, rotateY, scale }}
      >
        {children}
      </motion.div>
    </div>
  )
}
