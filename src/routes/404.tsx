import { createFileRoute } from '@tanstack/react-router'
import { RouteNotFound } from '#/components/CatchBoundary'

/**
 * Static home for the styled 404. The client router already renders
 * `RouteNotFound` for unmatched paths — but on the static Vercel deploy an
 * unmatched URL never reaches the router. Prerendering this route (and the
 * postbuild step that copies it to `dist/client/404.html`) is what replaces
 * the platform's bare "404: NOT_FOUND" screen.
 */
export const Route = createFileRoute('/404')({
  head: () => ({
    meta: [
      { title: 'Page not found — Battery Sensei' },
      // Never index the error shell itself.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: RouteNotFound,
})
