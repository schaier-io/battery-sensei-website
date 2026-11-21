/**
 * GET /roadmap: server render per request. vercel.json rewrites /roadmap to
 * /api/feature-requests?page=roadmap, whose GET hands off here. It lives in
 * that function, not its own api/ file, because the Hobby plan caps a
 * deployment at 12 functions (see .vercelignore).
 *
 * Every other page is prerendered to static HTML at build time. The roadmap
 * shows live feature requests and votes, so this function runs TanStack
 * Start's own built SSR handler (dist/server/server.js). The route loader
 * puts the first board page into the HTML and the dehydrated router state,
 * and the client hydrates from that state without a second fetch.
 *
 * The response gets the same two transforms the static pages get at build
 * time (inline CSS, hydration after first paint). The CDN caches it for 60 s,
 * the same window as GET /api/feature-requests.
 *
 * Required env: DATABASE_URL (via the route loader).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error build output without type declarations (exists after `vite build`)
import server from '../dist/server/server.js'
// @ts-expect-error plain .mjs build script without type declarations
import { deferHydration } from '../scripts/postbuild-defer-hydration.mjs'
// @ts-expect-error plain .mjs build script without type declarations
import { inlineCss } from '../scripts/postbuild-inline-css.mjs'

const ROUTE_PATH = '/roadmap'
const CLIENT_ROOT = join(process.cwd(), 'dist/client')
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

const cssCache = new Map<string, string>()
function readCss(href: string): string {
  let css = cssCache.get(href)
  if (css === undefined) {
    css = readFileSync(join(CLIENT_ROOT, href), 'utf8')
    cssCache.set(href, css)
  }
  return css
}

/** Applies the build-time HTML transforms (each one is a no-op on a miss). */
function transformHtml(html: string): string {
  const deferred: string | null = deferHydration(html)
  const withDefer = deferred ?? html
  try {
    const inlined: string | null = inlineCss(withDefer, readCss)
    return inlined ?? withDefer
  } catch (error) {
    // CSS missing from the bundle (includeFiles): serve the page with its
    // normal stylesheet link rather than a 500.
    console.error('roadmap: CSS inlining skipped', error)
    return withDefer
  }
}

export async function renderRoadmapPage(request: Request): Promise<Response> {
  // The page reads no query params. Dropping them keeps tracking tags
  // (?utm_…) from reaching the router.
  const target = new URL(ROUTE_PATH, new URL(request.url).origin)
  const response: Response = await server.fetch(
    new Request(target, { method: 'GET', headers: request.headers }),
  )
  const type = response.headers.get('content-type') ?? ''
  if (!response.ok || !type.includes('text/html')) return response

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('cache-control', CACHE_CONTROL)
  return new Response(transformHtml(await response.text()), { status: response.status, headers })
}
