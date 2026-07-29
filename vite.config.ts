import { execSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Last meaningful content edit. Reads the most recent commit date that touched
// user-facing surfaces (routes, sections, i18n, public docs). Falls back to
// today's date if git is unavailable (shallow clones, sandbox builds). Surfaced
// into the bundle as `__LAST_UPDATED__` and used by the WebPage / HowTo schema
// so freshness signals to Google + AI search don't go stale silently.
function lastUpdated(): string {
  try {
    const out = execSync(
      'git log -1 --format=%cs -- src/routes src/components src/lib/i18n public/llms.txt public/pricing.md',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out
  } catch {
    // git missing or repo unavailable — fall through.
  }
  return new Date().toISOString().slice(0, 10)
}

/**
 * Dev-only bridge to the Vercel functions in root `api/`.
 *
 * In production Vercel discovers `api/*.ts` itself; in `vite dev` those
 * files are just modules — worse, vite's transform middleware resolves a
 * GET to `/api/feature-requests` onto `api/feature-requests/index.ts`
 * and serves the transpiled SOURCE instead of executing it. This plugin
 * runs before vite's internals, loads the mapped module via
 * `ssrLoadModule`, and dispatches the Web-standard handler exports
 * (GET/POST/…) so dev behaves like production for these endpoints.
 */
const DEV_API_ROUTES: Record<string, string> = {
  '/api/feature-requests': '/api/feature-requests/index.ts',
  '/api/feature-requests/vote': '/api/feature-requests/vote.ts',
  '/api/admin/session': '/api/admin/session.ts',
  '/api/admin/feature-requests': '/api/admin/feature-requests.ts',
}

function devApiFunctions(): Plugin {
  return {
    name: 'dev-api-functions',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        const modulePath = pathname ? DEV_API_ROUTES[pathname] : undefined
        if (!modulePath) return next()
        void (async () => {
          try {
            const mod = (await server.ssrLoadModule(modulePath)) as Record<
              string,
              (request: Request) => Promise<Response>
            >
            const handler = mod[req.method ?? 'GET']
            if (typeof handler !== 'function') {
              res.statusCode = 405
              res.end('Method not allowed')
              return
            }
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk as Buffer))
            }
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === 'string') headers.set(key, value)
              else if (Array.isArray(value)) headers.set(key, value.join(', '))
            }
            const method = req.method ?? 'GET'
            const request = new Request(`http://localhost${req.url ?? '/'}`, {
              method,
              headers,
              body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
            })
            const response = await handler(request)
            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value)
            })
            const setCookies = response.headers.getSetCookie()
            if (setCookies.length > 0) res.setHeader('set-cookie', setCookies)
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch (error) {
            next(error)
          }
        })()
      })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    __LAST_UPDATED__: JSON.stringify(lastUpdated()),
  },
  plugins: [
    devApiFunctions(),
    devtools(),
    tailwindcss(),
    tanstackStart({
      // Localized home pages live at /de /es /fr /ja (the $lang route). The link
      // crawler can't discover them — the language switcher uses buttons, not
      // <a href> — so register them explicitly for prerendering.
      pages: [
        // Not linked from anywhere on purpose — see src/routes/404.tsx.
        { path: '/404', prerender: { enabled: true } },
        { path: '/de', prerender: { enabled: true } },
        { path: '/es', prerender: { enabled: true } },
        { path: '/fr', prerender: { enabled: true } },
        { path: '/ja', prerender: { enabled: true } },
      ],
      prerender: {
        enabled: true,
        autoSubfolderIndex: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: true,
        // Skip paths the crawler discovers in rendered HTML that are not
        // actual application routes: `/download/*` is a Vercel redirect to
        // the GitHub Releases zip, and `/pricing.md` is a static file in
        // `public/`. Both 404 at prerender time even though they work in
        // production.
        filter: (page) =>
          !page.path.startsWith('/download/') && page.path !== '/pricing.md',
      },
    }),
    viteReact(),
  ],
})

export default config
