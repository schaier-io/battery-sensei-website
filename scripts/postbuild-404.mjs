// Vercel static deployments serve `404.html` for unmatched URLs. The
// prerenderer writes the styled not-found page to `404/index.html`
// (autoSubfolderIndex) — lift it to the filename Vercel actually looks for.
import { copyFileSync, existsSync } from 'node:fs'

const src = 'dist/client/404/index.html'
const dest = 'dist/client/404.html'
if (!existsSync(src)) {
  console.error('postbuild-404: missing ' + src + ' — was /404 removed from vite.config.ts pages?')
  process.exit(1)
}
copyFileSync(src, dest)
console.log('postbuild-404: wrote ' + dest)
