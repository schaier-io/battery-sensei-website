import { useEffect } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { prefersReducedMotion } from '#/lib/prefers-reduced-motion'

function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof document.startViewTransition === 'function'
  )
}

/**
 * Route transitions: View Transition API + CSS when motion is allowed;
 * instant snap when prefers-reduced-motion. Motion/react fallback only
 * for browsers without the API and without reduced motion.
 */
export function RouteFade({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const reduceMotion = useReducedMotion()

  // Keep router defaultViewTransition aligned if the OS preference changes.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      router.options.defaultViewTransition = !mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [router])

  if (reduceMotion || prefersReducedMotion()) {
    return children
  }

  if (supportsViewTransitions()) {
    return children
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        className="route-fade-shell"
        variants={{
          initial: { opacity: 0 },
          animate: {
            opacity: 1,
            transition: { duration: 0.41, delay: 0.15, ease: [0.22, 1, 0.36, 1] },
          },
          exit: {
            opacity: 0,
            transition: { duration: 0.41, ease: [0.22, 1, 0.36, 1] },
          },
        }}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
