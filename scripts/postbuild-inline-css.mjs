/* Post-build: inline the site stylesheet so first paint skips a round trip.

   The prerendered pages link one render-blocking stylesheet (~32 KB gzip).
   On a slow mobile link that request costs about 150 ms before anything can
   paint (Lighthouse mobile FCP 1.35 s → 1.20 s, 2026-11-21). This step copies
   the CSS into a <style> in the head and keeps the <link>, switched to
   non-blocking (media="print", swapped to "all" on load). React 19 adopts the
   existing <link> on hydration, so it never inserts a second, blocking one.
   Without JS the inline copy alone styles the page. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LINK_RE = /<link rel="stylesheet" href="(\/assets\/[^"]+\.css)"([^>]*?)\/>/

/** Returns the rewritten HTML, or null when the page has no site stylesheet. */
export function inlineCss(html, readCss) {
  const m = html.match(LINK_RE)
  if (!m) return null
  const [link, href, rest] = m
  const css = readCss(href).replace(/<\/style/gi, '<\\/style')
  // Function replacer: CSS may contain `$&` / `$'`, which a string
  // replacement would expand.
  return html.replace(
    link,
    () => `<style>${css}</style><link rel="stylesheet" href="${href}"${rest} media="print" onload="this.media='all'"/>`,
  )
}

function* htmlFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* htmlFiles(p)
    else if (e.name.endsWith('.html')) yield p
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = 'dist/client'
  const cache = new Map()
  const readCss = (href) => {
    if (!cache.has(href)) cache.set(href, readFileSync(join(root, href), 'utf8'))
    return cache.get(href)
  }
  let n = 0
  for (const file of htmlFiles(root)) {
    const out = inlineCss(readFileSync(file, 'utf8'), readCss)
    if (out) {
      writeFileSync(file, out)
      n++
    }
  }
  const home = readFileSync(join(root, 'index.html'), 'utf8')
  if (!home.includes(`media="print" onload="this.media='all'"`)) {
    console.error('postbuild-inline-css: index.html still links a blocking stylesheet')
    process.exit(1)
  }
  console.log(`postbuild-inline-css: inlined CSS in ${n} HTML files`)
}
