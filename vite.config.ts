import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
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
