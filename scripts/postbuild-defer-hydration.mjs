// Paint the prerendered HTML before the app JS loads.
//
// TanStack Start emits the client entry as `<script type="module" async>` plus
// `<link rel="modulepreload">` hints, so the browser fetches ~700 KB of JS
// (~185 KB brotli) in parallel with the CSS and fonts. An async module also
// runs as soon as it arrives, so parsing it and hydrating the whole page can
// push the first paint back. On a slow phone that JS competes for bandwidth and
// main-thread time with the content the visitor is waiting for.
//
// Every page here is static, so this post-build step rewrites each HTML file:
// it drops the preload hints and replaces the entry script with a tiny loader
// that injects the same preloads and entry after the first frame is painted.
// Links are real <a href>, so the page is usable before hydration finishes.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRELOAD_RE = /<link rel="modulepreload" href="([^"]+)"\/>/g
const ENTRY_RE = /<script type="module" async="" src="([^"]+)"><\/script>/
// Load the app anyway if no first-contentful-paint entry arrives by then.
const SAFETY_TIMEOUT_MS = 3000

/** Rewrite one HTML document. Returns null when it has no client entry. */
export function deferHydration(html) {
  const entry = html.match(ENTRY_RE)
  if (!entry) return null
  const preloads = [...html.matchAll(PRELOAD_RE)].map((m) => m[1])
  const loader =
    '<script>(function(){var p=' +
    JSON.stringify(preloads) +
    ',e=' +
    JSON.stringify(entry[1]) +
    ',d=0;function go(){if(d++)return;p.forEach(function(h){var l=document.createElement("link");l.rel="modulepreload";l.href=h;document.head.appendChild(l)});' +
    'var s=document.createElement("script");s.type="module";s.src=e;document.head.appendChild(s)}' +
    // Start the app once the browser reports the first contentful paint.
    // The timeout is a safety net (no paint entry, e.g. a hidden tab).
    // Without Paint Timing support: rAF + timeout, i.e. after the next frame.
    'var P=window.PerformanceObserver;if(P&&P.supportedEntryTypes&&P.supportedEntryTypes.indexOf("paint")>=0){' +
    'new P(function(l){if(l.getEntriesByName("first-contentful-paint").length)go()}).observe({type:"paint",buffered:true});' +
    `setTimeout(go,${SAFETY_TIMEOUT_MS})}` +
    'else requestAnimationFrame(function(){setTimeout(go,0)})})()</script>'
  return html.replace(PRELOAD_RE, '').replace(ENTRY_RE, () => loader)
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return htmlFiles(p)
    return e.name.endsWith('.html') ? [p] : []
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = 'dist/client'
  let count = 0
  for (const file of htmlFiles(root)) {
    const out = deferHydration(readFileSync(file, 'utf8'))
    if (out === null) continue
    writeFileSync(file, out)
    count++
  }
  // Fail loudly if the framework changed its script tags: a silent no-op would
  // quietly bring the slow first paint back.
  const home = readFileSync(join(root, 'index.html'), 'utf8')
  if (count === 0 || ENTRY_RE.test(home) || home.includes('<link rel="modulepreload"')) {
    console.error('postbuild-defer-hydration: entry script pattern not found or not rewritten in index.html')
    process.exit(1)
  }
  console.log(`postbuild-defer-hydration: rewrote ${count} HTML files`)
}
