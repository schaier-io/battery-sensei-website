import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

/**
 * Route transitions: View Transition API + CSS when motion is allowed;
 * instant snap when prefers-reduced-motion.
 *
 * This component renders its children unchanged. It exists only to keep the
 * router's `defaultViewTransition` flag in step with the OS motion setting.
 *
 * It must not branch on anything the server cannot see. It used to render a
 * `motion.div` wrapper for browsers without `document.startViewTransition`,
 * decided by a `typeof document` test. That test is always false during SSR
 * and true in a browser that has the API, so the server sent one tree and the
 * client built another. React failed hydration and re-rendered the whole app
 * on the client, on every route.
 *
 * Browsers without the View Transition API now get an instant route change
 * instead of a 410ms cross-fade. That is the whole cost of removing the
 * wrapper, and it is smaller than losing the server-rendered markup.
 */
export function RouteFade({ children }: { children: React.ReactNode }) {
  const router = useRouter()

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

  return children
}
