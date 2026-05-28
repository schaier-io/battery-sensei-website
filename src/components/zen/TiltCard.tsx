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
const interactiveSelector =
  'button, a, input, select, textarea, [role="button"], [role="tab"], [data-tilt-interactive]'

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

  function resetTilt() {
    rotateX.set(0)
    rotateY.set(0)
  }

  function shouldSuspendTilt(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return target.closest(interactiveSelector) !== null
  }

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    if (e.pointerType === 'touch' || shouldSuspendTilt(e.target)) {
      resetTilt()
      return
    }
    const rect = el.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - rect.width / 2
    const offsetY = e.clientY - rect.top - rect.height / 2
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude)
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude)
  }

  function handleEnter(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || shouldSuspendTilt(e.target)) {
      scale.set(1)
      return
    }
    scale.set(scaleOnHover)
  }

  function handleLeave() {
    resetTilt()
    scale.set(1)
  }

  return (
    <div
      ref={ref}
      // `h-full` on the outer wrapper is load-bearing: when a TiltCard sits
      // inside a CSS Grid cell, the grid uses `align-items: stretch` to make
      // siblings equal-height, but only if every intermediate wrapper
      // forwards that height. Without `h-full` here, the inner `motion.div`
      // and the child `paper-card` collapse to their intrinsic content size
      // and the cards end up uneven.
      className={`tilt-card h-full [transform-style:preserve-3d] ${className}`}
      style={{ perspective: `${perspective}px` }}
      onPointerMove={handleMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
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
