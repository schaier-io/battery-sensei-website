/* Builds a custom-subsetted Noto Serif JP woff2 containing only the JP glyphs
   used across the site. Run with: node scripts/subset-noto-jp.mjs
   Outputs to public/fonts/. Commit the outputs; the source TTF is cached
   under .cache/ and is gitignored. */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
/* Source: Google Fonts CSS API with &text= param returns a single woff2 already
   subsetted to the requested chars. We grab the URL from the CSS and download
   the file. */
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/fonts')

const WEIGHTS = [400, 700, 900]
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function collectChars() {
  const chars = new Set()
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue
        walk(p)
      } else if (/\.(json|tsx?|jsx?|md|html)$/.test(e.name)) {
        const text = readFileSync(p, 'utf8')
        for (const c of text) {
          const cp = c.codePointAt(0)
          if (
            (cp >= 0x3000 && cp <= 0x30ff) ||
            (cp >= 0x4e00 && cp <= 0x9fff) ||
            (cp >= 0xff00 && cp <= 0xffef) ||
            (cp >= 0x3040 && cp <= 0x309f)
          ) {
            chars.add(c)
          }
        }
      }
    }
  }
  walk(join(root, 'src'))
  return [...chars].sort().join('')
}

async function fetchSubset(weight, text) {
  const family = `Noto+Serif+JP:wght@${weight}`
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text()
  const m = css.match(/url\((https:\/\/[^)]+)\)\s*format\('woff2'\)/)
  if (!m) throw new Error(`no woff2 url for weight ${weight}:\n${css}`)
  const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer())
  return buf
}

const text = collectChars()
console.log(`subsetting ${text.length} unique JP chars`)
await mkdir(outDir, { recursive: true })

for (const weight of WEIGHTS) {
  const out = await fetchSubset(weight, text)
  const outPath = join(outDir, `noto-serif-jp-${weight}.woff2`)
  await writeFile(outPath, out)
  console.log(`  ${weight}: ${(out.length / 1024).toFixed(1)} KiB → ${outPath}`)
}
