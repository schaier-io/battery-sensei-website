/* Build step: subset every web font to the characters the site uses.

   Runs before `vite build` and `vite dev` (see package.json), offline.
   Writes:
     public/fonts/gen/*.woff2       content-hashed subsets (gitignored)
     src/lib/fonts.generated.ts     @font-face CSS + preload URLs (gitignored)

   Latin families (Spectral, Source Sans 3, Geist Mono): each fontsource
   latin / latin-ext file is cut down to the chars found in src/, plus safety
   sets for text that never appears in source (form input, Intl dates and
   numbers, currency signs). Each face gets an exact unicode-range, so the
   browser downloads a file only when one of its chars renders.

   Noto Serif JP (400 only), two slices with ranges that never overlap (with
   overlapping ranges Chrome fetches both files):
     deco  the JP chars used outside ja.json (brand kanji, kickers). Generated
           here from the committed full file. Every locale loads only this.
     full  public/fonts/noto-serif-jp-<w>.woff2, committed, built by
           scripts/subset-noto-jp.mjs. Covers the other JP chars, so in
           practice only /ja downloads it. */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// harfbuzzjs + fontverter come in through the `subset-font` devDependency.
// subset-font itself keeps EVERY OpenType feature (`--font-features=*`), and
// layout closure then pulls in every alternate glyph (small caps, old-style
// figures, swashes) of every kept char. We call HarfBuzz directly instead and
// keep its default feature set plus the features the site's CSS turns on.
const requireFromSubsetFont = createRequire(createRequire(import.meta.url).resolve('subset-font'))
const fontverter = requireFromSubsetFont('fontverter')
const hbWasmPath = requireFromSubsetFont.resolve('harfbuzzjs/hb-subset.wasm')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(root, 'public/fonts/gen')
const OUT_URL = '/fonts/gen'
const OUT_TS = join(root, 'src/lib/fonts.generated.ts')

const LATIN_FONTS = [
  { pkg: 'spectral', family: 'Spectral', weight: 400, style: 'normal' },
  { pkg: 'spectral', family: 'Spectral', weight: 400, style: 'italic' },
  { pkg: 'spectral', family: 'Spectral', weight: 500, style: 'normal' },
  { pkg: 'source-sans-3', family: 'Source Sans 3', weight: 400, style: 'normal' },
  { pkg: 'source-sans-3', family: 'Source Sans 3', weight: 500, style: 'normal' },
  { pkg: 'geist-mono', family: 'Geist Mono', weight: 400, style: 'normal' },
  { pkg: 'geist-mono', family: 'Geist Mono', weight: 500, style: 'normal' },
  { pkg: 'geist-mono', family: 'Geist Mono', weight: 600, style: 'normal' },
]
// No 600 face for Spectral / Source Sans 3 and only JP 400: the 600 / 700 /
// 900 text is a few labels, the nav brand and the hanko kanji, and the browser
// synthesises their bold from the lighter face. Dropping the files saves
// 75 KiB and about 0.45 s of mobile LCP (Lighthouse, 2026-11-21).
// Fontsource subsets to draw from, in priority order (a char shared by two
// subsets goes to the first, which keeps the ranges disjoint).
const LATIN_SUBSETS = ['latin', 'latin-ext']
const JP_WEIGHTS = [400]
const JP_BLOCKS = [
  [0x3000, 0x30ff],
  [0x4e00, 0x9fff],
  [0xff00, 0xffef],
]
// ja.json strings rendered in bold Noto Serif JP (pricing kickers, `meta-label
// font-jp`). Without them, /ja downloads a full JP file (about 170 KiB) for 14
// chars. A missing key costs bytes only: the full face still covers it.
const DECO_JA_KEYS = ['pricing.free.whatYouKeep', 'pricing.lifetime.premiumAdds', 'pricing.support.perksTitle']
// Above-the-fold faces to <link rel="preload">: H1 / headings, body text, and
// the hero kanji rail. The rail uses the deco slice. A separate small "hero"
// slice was tried: the page still fetches deco for below-fold kanji, so the
// split only added a request (Lighthouse mobile FCP 1.20 s → 1.50 s, 2026-11-21).
const PRELOAD = new Set(['Spectral 500 normal latin', 'Source Sans 3 400 normal latin', 'Noto Serif JP 400 deco'])

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
// Text that renders but is not in src/: anything a visitor types (ASCII),
// Intl output (U+00A0 / U+202F spaces in de/fr numbers; accented month names
// use letters the de/es/fr locale files already contain) and currency signs
// for USD / EUR / CZK (Kč). Any other char must
// appear in src/ to make it into a subset; a missing one falls back to the
// next font in the CSS stack.
const LATIN_SAFETY = [...range(0x20, 0x7e), 0xa0, 0x202f, 0x20ac, 0x010c, 0x010d]

// Beyond HarfBuzz's defaults (kern, liga, calt, ccmp, locl, mark, ...): the
// font-feature-settings / font-variant-numeric values used in src/ (tnum is
// Tailwind's `tabular-nums`).
const EXTRA_FEATURES = ['dlig', 'lnum', 'tnum', 'zero', 'ss01', 'cv11']
const SUBSET_SETS_LAYOUT_FEATURE_TAG = 6
const SUBSET_FLAGS_NO_HINTING = 0x1
const tag = (s) => [...s].reduce((a, ch) => ((a << 8) | ch.charCodeAt(0)) >>> 0, 0)

let hb
/** Subset a font to `codepoints`, returned as woff2. */
async function subset(fontBuffer, codepoints) {
  if (!hb) hb = (await WebAssembly.instantiate(readFileSync(hbWasmPath))).instance.exports
  const ttf = await fontverter.convert(fontBuffer, 'truetype')
  const heap = () => new Uint8Array(hb.memory.buffer)
  const ptr = hb.malloc(ttf.byteLength)
  heap().set(new Uint8Array(ttf), ptr)
  const blob = hb.hb_blob_create(ptr, ttf.byteLength, 2 /* HB_MEMORY_MODE_WRITABLE */, 0, 0)
  const face = hb.hb_face_create(blob, 0)
  hb.hb_blob_destroy(blob)
  const input = hb.hb_subset_input_create_or_fail()
  // Drop TrueType hinting (~40% of Spectral). macOS / iOS ignore it, and
  // Google Fonts serves unhinted files to non-Windows browsers too.
  hb.hb_subset_input_set_flags(input, hb.hb_subset_input_get_flags(input) | SUBSET_FLAGS_NO_HINTING)
  const features = hb.hb_subset_input_set(input, SUBSET_SETS_LAYOUT_FEATURE_TAG)
  for (const f of EXTRA_FEATURES) hb.hb_set_add(features, tag(f))
  const unicodes = hb.hb_subset_input_unicode_set(input)
  for (const cp of codepoints) hb.hb_set_add(unicodes, cp)
  const out = hb.hb_subset_or_fail(face, input)
  hb.hb_subset_input_destroy(input)
  if (!out) throw new Error('build-fonts: hb_subset_or_fail failed')
  const result = hb.hb_face_reference_blob(out)
  const data = hb.hb_blob_get_data(result, 0)
  const ttfOut = Buffer.from(heap().subarray(data, data + hb.hb_blob_get_length(result)))
  hb.hb_blob_destroy(result)
  hb.hb_face_destroy(out)
  hb.hb_face_destroy(face)
  hb.free(ptr)
  return fontverter.convert(ttfOut, 'woff2', 'truetype')
}

const isJp = (cp) => JP_BLOCKS.some(([lo, hi]) => cp >= lo && cp <= hi)

function collectCodepoints({ skip = () => false } = {}) {
  const cps = new Set()
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p)
      } else if (/\.(json|tsx?|jsx?|md|html|css)$/.test(e.name) && !skip(p) && p !== OUT_TS) {
        for (const c of readFileSync(p, 'utf8')) cps.add(c.codePointAt(0))
      }
    }
  }
  walk(join(root, 'src'))
  return cps
}

/** CSS unicode-range for a set of code points: runs become U+A-B. */
export function unicodeRange(codepoints) {
  const cps = [...codepoints].sort((a, b) => a - b)
  const parts = []
  const hex = (n) => n.toString(16).toUpperCase()
  for (let i = 0; i < cps.length; i++) {
    let j = i
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++
    parts.push(i === j ? `U+${hex(cps[i])}` : `U+${hex(cps[i])}-${hex(cps[j])}`)
    i = j
  }
  return parts.join(',')
}

/** Parse a CSS unicode-range ("U+0000-00FF,U+0131") into a Set of code points. */
export function parseUnicodeRange(text) {
  const out = new Set()
  for (const part of text.split(',')) {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-')
    const lo = parseInt(a, 16)
    for (let cp = lo; cp <= (b ? parseInt(b, 16) : lo); cp++) out.add(cp)
  }
  return out
}

/** unicode-range per subset from a fontsource weight CSS (e.g. 400-italic.css). */
function fontsourceRanges(pkg, weight, style) {
  const file = `${weight}${style === 'italic' ? '-italic' : ''}.css`
  const css = readFileSync(join(root, 'node_modules/@fontsource', pkg, file), 'utf8')
  const ranges = {}
  // Block comments look like `/* geist-mono-latin-ext-400-normal */`.
  const re = new RegExp(`/\\* ${pkg}-([a-z-]+)-${weight}-${style} \\*/[^}]*?unicode-range:\\s*([^;]+);`, 'g')
  for (const m of css.matchAll(re)) ranges[m[1]] = parseUnicodeRange(m[2])
  return ranges
}

async function emit(name, buffer, chars) {
  const out = await subset(buffer, chars)
  const hash = createHash('sha256').update(out).digest('hex').slice(0, 8)
  const fileName = `${name}-${hash}.woff2`
  writeFileSync(join(OUT_DIR, fileName), out)
  return { url: `${OUT_URL}/${fileName}`, bytes: out.length }
}

const face = ({ family, weight, style, url, cps }) =>
  `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;` +
  `src:url(${url}) format('woff2');unicode-range:${unicodeRange(cps)};}`

async function main() {
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  const faces = []
  const preloads = []
  const report = []

  const used = collectCodepoints()
  const latinWanted = new Set([...used].filter((cp) => cp >= 0x20 && !isJp(cp)).concat(LATIN_SAFETY))

  for (const f of LATIN_FONTS) {
    const ranges = fontsourceRanges(f.pkg, f.weight, f.style)
    const taken = new Set()
    for (const subset of LATIN_SUBSETS) {
      if (!ranges[subset]) continue
      const cps = [...latinWanted].filter((cp) => ranges[subset].has(cp) && !taken.has(cp))
      if (cps.length === 0) continue
      cps.forEach((cp) => taken.add(cp))
      const src = join(root, 'node_modules/@fontsource', f.pkg, 'files', `${f.pkg}-${subset}-${f.weight}-${f.style}.woff2`)
      const id = `${f.pkg}-${subset}-${f.weight}-${f.style}`
      const { url, bytes } = await emit(id, readFileSync(src), cps)
      faces.push(face({ ...f, url, cps }))
      if (PRELOAD.has(`${f.family} ${f.weight} ${f.style} ${subset}`)) preloads.push(url)
      report.push(`${id}: ${cps.length} chars, ${(bytes / 1024).toFixed(1)} KiB`)
    }
  }

  // Deco = JP chars outside ja.json, plus the ja.json strings set in bold
  // Noto (DECO_JA_KEYS). Full = every other char in the JP blocks.
  const ja = JSON.parse(readFileSync(join(root, 'src/lib/i18n/locales/ja.json'), 'utf8'))
  const decoJa = DECO_JA_KEYS.flatMap((key) => {
    const value = key.split('.').reduce((node, part) => node?.[part], ja)
    if (typeof value !== 'string') throw new Error(`build-fonts: DECO_JA_KEYS entry ${key} is not a ja.json string`)
    return [...value].map((c) => c.codePointAt(0))
  })
  const deco = [
    ...new Set([...collectCodepoints({ skip: (p) => p.endsWith(join('locales', 'ja.json')) }), ...decoJa]),
  ].filter(isJp)
  const decoSet = new Set(deco)
  const rest = JP_BLOCKS.flatMap(([lo, hi]) => range(lo, hi)).filter((cp) => !decoSet.has(cp))
  for (const weight of JP_WEIGHTS) {
    const full = readFileSync(join(root, `public/fonts/noto-serif-jp-${weight}.woff2`))
    const base = { family: 'Noto Serif JP', weight, style: 'normal' }
    faces.push(face({ ...base, url: `/fonts/noto-serif-jp-${weight}.woff2`, cps: rest }))
    for (const [slice, cps] of [['deco', deco]]) {
      const { url, bytes } = await emit(`noto-serif-jp-${slice}-${weight}`, full, cps)
      faces.push(face({ ...base, url, cps }))
      if (PRELOAD.has(`Noto Serif JP ${weight} ${slice}`)) preloads.push(url)
      report.push(`noto-serif-jp-${slice}-${weight}: ${cps.length} chars, ${(bytes / 1024).toFixed(1)} KiB`)
    }
  }

  writeFileSync(
    OUT_TS,
    '// Generated by scripts/build-fonts.mjs. Do not edit; it runs before dev and build.\n' +
      `export const FONT_FACE_CSS = ${JSON.stringify(faces.join('\n'))}\n` +
      `export const FONT_PRELOADS: string[] = ${JSON.stringify(preloads)}\n`,
  )
  console.log(`build-fonts: ${faces.length} faces\n  ` + report.join('\n  '))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
