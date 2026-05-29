import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
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

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    __LAST_UPDATED__: JSON.stringify(lastUpdated()),
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      // Localized home pages live at /de /es /fr /ja (the $lang route). The link
      // crawler can't discover them — the language switcher uses buttons, not
      // <a href> — so register them explicitly for prerendering.
      pages: [
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
