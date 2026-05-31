import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { prefersReducedMotion } from '#/lib/prefers-reduced-motion'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Cross-fade between routes on client navigation (document.startViewTransition).
    // Timing lives in styles.css. Disabled when prefers-reduced-motion (snap).
    // RouteFade keeps this in sync if the OS preference changes mid-session.
    defaultViewTransition: !prefersReducedMotion(),
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
