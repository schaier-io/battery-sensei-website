// Generates per-language social share / Open Graph cards from the site's own
// design tokens + fonts, so the link preview (iMessage / Slack / WhatsApp /
// Telegram / X / LinkedIn) reads as the same product as the landing page in
// whichever locale was shared.
//
//   node scripts/make-share-card.mjs   (or: pnpm share-card)
//
// Outputs (public/), for each locale in COPY:
//   share-card-<loc>.png / .webp          1200x630   OG card
//   share-card-<loc>-square.png / .webp   1200x1200  square crop
// plus default aliases (= en):
//   share-card.png / .webp / share-card-square.png / .webp
//
// Rendering: SVG is rasterized with @resvg/resvg-js, handed the EXACT site
// faces (Spectral display serif + Source Sans 3 + Geist Mono), decoded from the
// @fontsource .woff files to .ttf at build time (zero extra deps — Node's
// zlib). Japanese (静かな力) resolves to Hiragino Mincho ProN via the system
// loader, the site's own JP fallback. Rendered at 2x and downscaled by sharp.

import { inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const FONT_DIR = join(tmpdir(), 'bs-share-fonts')
const SCALE = 2

// ---- site palette (mirrors src/styles.css :root) --------------------------
const C = {
  sumi: '#1c1a17',
  sumiSoft: '#4a4540',
  nezumi: '#8a847c',
  washi: '#f4ede0',
  washiSoft: '#ece3d1',
  gofun: '#fbf7ef',
  hinomaru: '#bc002d',
}

// ---- per-language copy -----------------------------------------------------
// brand + 静かな力 accent stay constant (product identity); everything else is
// localized to match each locale's hero. `kickerJp` flags JA so the kicker uses
// the serif JP face instead of tracked Latin caps, and the spec line drops the
// monospace (Geist Mono has no kana).
const COPY = {
  en: {
    kicker: 'QUIET POWER FOR YOUR MACBOOK',
    italic: 'Quiet battery care for your MacBook.',
    spec: 'macOS 13+ · Apple Silicon & Intel · Apple-notarized',
  },
  de: {
    kicker: 'RUHIGE KRAFT FÜR DEIN MACBOOK',
    italic: 'Ruhige Akkupflege für dein MacBook.',
    spec: 'macOS 13+ · Apple Silicon & Intel · Apple-beglaubigt',
  },
  es: {
    kicker: 'ENERGÍA TRANQUILA PARA TU MAC',
    italic: 'Cuidado silencioso para la batería de tu Mac.',
    spec: 'macOS 13+ · Apple Silicon e Intel · Notarizado por Apple',
  },
  fr: {
    kicker: 'ÉNERGIE SEREINE POUR VOTRE MAC',
    italic: 'Soin discret pour la batterie de votre Mac.',
    spec: 'macOS 13+ · Apple Silicon & Intel · Notarisé par Apple',
  },
  ja: {
    kicker: 'MacBook のための、静かな力',
    italic: '静かなバッテリーケア。そっと見守る。',
    spec: 'macOS 13+ · Apple Silicon・Intel · Apple 公証済み',
    kickerJp: true,
    specJp: true,
  },
}
const BRAND = 'Battery Sensei'
const JP_ACCENT = '静かな力'
const DEFAULT_LOCALE = 'en'

const SERIF_JP = "'Noto Serif JP', 'Hiragino Mincho ProN', serif"

// ---- woff1 -> ttf (per-table zlib; trivial to reassemble) ------------------
function woffToTtf(woffPath, ttfPath) {
  const b = readFileSync(woffPath)
  if (b.toString('ascii', 0, 4) !== 'wOFF') throw new Error('not a woff: ' + woffPath)
  const flavor = b.readUInt32BE(4)
  const numTables = b.readUInt16BE(12)
  const tables = []
  let p = 44
  for (let i = 0; i < numTables; i++) {
    const tag = b.toString('ascii', p, p + 4)
    const offset = b.readUInt32BE(p + 4)
    const compLength = b.readUInt32BE(p + 8)
    const origLength = b.readUInt32BE(p + 12)
    let data = b.subarray(offset, offset + compLength)
    if (compLength !== origLength) data = inflateSync(data)
    tables.push({ tag, data })
    p += 20
  }
  tables.sort((a, c) => (a.tag < c.tag ? -1 : 1))
  const n = tables.length
  let maxPow = 1, exp = 0
  while (maxPow * 2 <= n) { maxPow *= 2; exp++ }
  const header = Buffer.alloc(12)
  header.writeUInt32BE(flavor, 0)
  header.writeUInt16BE(n, 4)
  header.writeUInt16BE(maxPow * 16, 6)
  header.writeUInt16BE(exp, 8)
  header.writeUInt16BE(n * 16 - maxPow * 16, 10)
  const dir = Buffer.alloc(16 * n)
  const bodies = []
  const pad4 = (x) => (x + 3) & ~3
  let off = 12 + 16 * n
  tables.forEach((t, i) => {
    const len = t.data.length
    const padded = Buffer.alloc(pad4(len))
    t.data.copy(padded)
    let sum = 0
    for (let j = 0; j < padded.length; j += 4) sum = (sum + padded.readUInt32BE(j)) >>> 0
    const d = i * 16
    dir.write(t.tag, d, 4, 'ascii')
    dir.writeUInt32BE(sum >>> 0, d + 4)
    dir.writeUInt32BE(off, d + 8)
    dir.writeUInt32BE(len, d + 12)
    bodies.push(padded)
    off += padded.length
  })
  writeFileSync(ttfPath, Buffer.concat([header, dir, ...bodies]))
}

function prepareFonts() {
  mkdirSync(FONT_DIR, { recursive: true })
  const fs = join(ROOT, 'node_modules', '@fontsource')
  const faces = [
    ['spectral/files/spectral-latin-400-normal.woff', 'Spectral-Regular.ttf'],
    ['spectral/files/spectral-latin-400-italic.woff', 'Spectral-Italic.ttf'],
    ['spectral/files/spectral-latin-ext-400-italic.woff', 'Spectral-ExtItalic.ttf'],
    ['spectral/files/spectral-latin-600-normal.woff', 'Spectral-SemiBold.ttf'],
    ['source-sans-3/files/source-sans-3-latin-600-normal.woff', 'SourceSans3-SemiBold.ttf'],
    ['source-sans-3/files/source-sans-3-latin-ext-600-normal.woff', 'SourceSans3-ExtSemiBold.ttf'],
    ['geist-mono/files/geist-mono-latin-400-normal.woff', 'GeistMono-Regular.ttf'],
  ]
  // bundle the site's subsetted Noto Serif JP so JA renders identically here
  const notoJp = join(PUBLIC, 'fonts', 'noto-serif-jp-400.woff2')
  const out = []
  for (const [src, name] of faces) {
    const from = join(fs, src)
    if (!existsSync(from)) { console.warn('  missing font', src); continue }
    const to = join(FONT_DIR, name)
    try { woffToTtf(from, to); out.push(to) }
    catch (e) { console.warn('  font skip', name, e.message) }
  }
  if (existsSync(notoJp)) out.push(notoJp) // resvg reads woff2 directly
  return out
}

// ---- helpers --------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const iconDataUri = () =>
  'data:image/png;base64,' + readFileSync(join(PUBLIC, 'app-icon.png')).toString('base64')

// vertical kanji rail (resvg has no writing-mode; stack glyphs manually)
function kanjiRail(chars, x, yStart, step, size, color, opacity) {
  return chars
    .map(
      (c, i) =>
        `<text x="${x}" y="${yStart + i * step}" font-family="${SERIF_JP}" font-size="${size}" fill="${color}" fill-opacity="${opacity}" text-anchor="middle">${c}</text>`,
    )
    .join('')
}

function defs(w, h) {
  let rules = ''
  for (let y = 0; y < h; y += 48) {
    rules += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${C.sumi}" stroke-opacity="0.028"/>`
  }
  return `
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.washi}"/>
        <stop offset="1" stop-color="${C.washiSoft}"/>
      </linearGradient>
      <radialGradient id="bloom" cx="0.5" cy="0.30" r="0.85">
        <stop offset="0" stop-color="${C.gofun}" stop-opacity="0.6"/>
        <stop offset="0.7" stop-color="${C.gofun}" stop-opacity="0"/>
      </radialGradient>
      <filter id="iconshadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="${C.sumi}" flood-opacity="0.18"/>
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#paper)"/>
    <rect width="${w}" height="${h}" fill="url(#bloom)"/>
    ${rules}`
}

function iconBlock(x, y, size) {
  const r = size * 0.225
  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" ry="${r}"
      fill="${C.gofun}" filter="url(#iconshadow)"/>
    <clipPath id="ic${Math.round(x)}${Math.round(y)}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" ry="${r}"/></clipPath>
    <image href="${iconDataUri()}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#ic${Math.round(x)}${Math.round(y)})"/>`
}

// ---- layouts --------------------------------------------------------------
function landscapeSvg(c) {
  const w = 1200, h = 630, cx = w / 2
  const kickerFamily = c.kickerJp ? SERIF_JP : 'Source Sans 3'
  const kickerTrack = c.kickerJp ? 8 : 4
  const kickerSize = c.kickerJp ? 25 : 22
  const specFamily = c.specJp ? SERIF_JP : 'Geist Mono, monospace'
  const specSize = c.specJp ? 21 : 19
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(w, h)}
    ${kanjiRail(['電', '池', '先', '生'], 78, 210, 64, 50, C.sumi, 0.14)}
    ${kanjiRail(['静', 'か', 'な', '力'], w - 78, 210, 64, 50, C.nezumi, 0.5)}
    ${iconBlock(cx - 76, 70, 152)}
    <g text-anchor="middle">
      <text x="${cx}" y="298" font-family="${kickerFamily}" font-weight="600" font-size="${kickerSize}"
        letter-spacing="${kickerTrack}" fill="${C.nezumi}">${esc(c.kicker)}</text>
      <text x="${cx}" y="392" font-family="Spectral" font-weight="600" font-size="92"
        letter-spacing="-1.8" fill="${C.sumi}">${esc(BRAND)}</text>
      <text x="${cx}" y="452" font-family="Spectral" font-style="italic" font-weight="400"
        font-size="36" fill="${C.sumiSoft}">${esc(c.italic)}</text>
      <text x="${cx}" y="516" font-family="${SERIF_JP}"
        font-size="30" letter-spacing="6" fill="${C.hinomaru}" fill-opacity="0.8">${JP_ACCENT}</text>
      <text x="${cx}" y="566" font-family="${specFamily}" font-size="${specSize}"
        letter-spacing="0.5" fill="${C.nezumi}">${esc(c.spec)}</text>
    </g>
  </svg>`
}

function squareSvg(c) {
  const w = 1200, h = 1200, cx = w / 2
  const kickerFamily = c.kickerJp ? SERIF_JP : 'Source Sans 3'
  const kickerTrack = c.kickerJp ? 9 : 5
  const kickerSize = c.kickerJp ? 30 : 26
  const specFamily = c.specJp ? SERIF_JP : 'Geist Mono, monospace'
  const specSize = c.specJp ? 25 : 23
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(w, h)}
    ${kanjiRail(['電', '池', '先', '生'], 96, 470, 78, 60, C.sumi, 0.13)}
    ${kanjiRail(['静', 'か', 'な', '力'], w - 96, 470, 78, 60, C.nezumi, 0.48)}
    ${iconBlock(cx - 110, 250, 220)}
    <g text-anchor="middle">
      <text x="${cx}" y="586" font-family="${kickerFamily}" font-weight="600" font-size="${kickerSize}"
        letter-spacing="${kickerTrack}" fill="${C.nezumi}">${esc(c.kicker)}</text>
      <text x="${cx}" y="712" font-family="Spectral" font-weight="600" font-size="120"
        letter-spacing="-2.4" fill="${C.sumi}">${esc(BRAND)}</text>
      <text x="${cx}" y="788" font-family="Spectral" font-style="italic" font-weight="400"
        font-size="44" fill="${C.sumiSoft}">${esc(c.italic)}</text>
      <text x="${cx}" y="884" font-family="${SERIF_JP}"
        font-size="40" letter-spacing="8" fill="${C.hinomaru}" fill-opacity="0.8">${JP_ACCENT}</text>
      <text x="${cx}" y="958" font-family="${specFamily}" font-size="${specSize}"
        letter-spacing="0.5" fill="${C.nezumi}">${esc(c.spec)}</text>
    </g>
  </svg>`
}

async function render(svg, w, h, fontFiles) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: w * SCALE },
    background: C.washi,
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: 'Spectral' },
  })
  return sharp(resvg.render().asPng()).resize(w, h, { fit: 'fill' })
}

async function emit(name, svg, w, h, fontFiles) {
  const img = await render(svg, w, h, fontFiles)
  const png = await img.clone().png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer()
  writeFileSync(join(PUBLIC, `${name}.png`), png)
  const webp = await img.clone().webp({ quality: 82, effort: 6 }).toBuffer()
  writeFileSync(join(PUBLIC, `${name}.webp`), webp)
  return { png: png.length, webp: webp.length }
}

async function build() {
  const fontFiles = prepareFonts()
  for (const [loc, copy] of Object.entries(COPY)) {
    const land = await emit(`share-card-${loc}`, landscapeSvg(copy), 1200, 630, fontFiles)
    const sq = await emit(`share-card-${loc}-square`, squareSvg(copy), 1200, 1200, fontFiles)
    if (loc === DEFAULT_LOCALE) {
      await emit('share-card', landscapeSvg(copy), 1200, 630, fontFiles)
      await emit('share-card-square', squareSvg(copy), 1200, 1200, fontFiles)
    }
    console.log(
      `${loc}: card ${(land.png / 1024).toFixed(0)}KB / ${(land.webp / 1024).toFixed(0)}KB  ` +
        `square ${(sq.png / 1024).toFixed(0)}KB / ${(sq.webp / 1024).toFixed(0)}KB`,
    )
  }
}

build().catch((e) => { console.error(e); process.exit(1) })
