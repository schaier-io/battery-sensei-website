#!/usr/bin/env node
/**
 * Composite the app icon onto a solid white circle and emit each favicon
 * size the site references. Run with: `sfw pnpm exec node scripts/make-favicons.mjs`
 *
 * Source: public/app-icon.png (1024x1024 master, transparent background)
 * Output: public/favicon-32.png, public/favicon.png, public/apple-touch-icon.png,
 *         public/logo192.png, public/logo512.png, public/favicon.ico
 */

import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dirname, '..', 'public')
const SOURCE = resolve(PUBLIC, 'app-icon.png')

/**
 * Fraction of the canvas the icon itself fills. The remainder is the white
 * ring around it. 0.74 leaves a 13% white halo on each side — wide enough
 * to read as a deliberate ring against the cream-tinted icon, and tight
 * enough that the mark stays legible at 32×32.
 *
 * The icon's rounded-square corners stay safely inside the circle's
 * inscribed square (≈0.707 of the diameter), so no edge of the icon
 * bleeds past the circle's edge once we apply the circular mask below.
 */
const ICON_FRACTION = 0.74

const PNG_TARGETS = [
  { file: 'favicon-32.png',       size: 32  },
  { file: 'favicon.png',          size: 64  },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'logo192.png',          size: 192 },
  { file: 'logo512.png',          size: 512 },
]

/** A white-filled circle on a transparent canvas, given side length. */
function whiteCircleSvg(size) {
  const r = size / 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#ffffff" />
    </svg>`,
  )
}

/**
 * A solid black circle used as an alpha mask. Sharp's `dest-in` blend
 * keeps the destination only where the mask is opaque, so this clips the
 * whole composition to a circle (no square corners around the favicon).
 */
function maskCircleSvg(size) {
  const r = size / 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#000000" />
    </svg>`,
  )
}

async function renderOne(size) {
  const iconSize = Math.round(size * ICON_FRACTION)
  const icon = await sharp(SOURCE)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  // White-circle background with the icon centered, then clipped to a
  // circle so the rendered favicon is truly round (no square halo).
  return sharp(whiteCircleSvg(size))
    .composite([
      { input: icon, gravity: 'center' },
      { input: maskCircleSvg(size), blend: 'dest-in' },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()
}

async function main() {
  console.log(`Source: ${SOURCE}`)

  for (const { file, size } of PNG_TARGETS) {
    const out = resolve(PUBLIC, file)
    const buf = await renderOne(size)
    await writeFile(out, buf)
    console.log(`  ✓ ${file.padEnd(24)} ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`)
  }

  // Multi-resolution .ico: bundle 16, 32, 48 so old browsers + Windows tiles
  // pick the sharpest available. `png-to-ico` lives at runtime via pnpm dlx.
  const require = createRequire(import.meta.url)
  let pngToIco
  try {
    const mod = require('png-to-ico')
    pngToIco = typeof mod === 'function' ? mod : mod.default
  } catch {
    console.warn(
      '\n  ⚠ `png-to-ico` not installed. Skipping favicon.ico generation.\n' +
      '    Install it with `sfw pnpm add -D png-to-ico` and rerun this script.',
    )
    return
  }

  const icoSizes = [16, 32, 48]
  const icoBuffers = await Promise.all(icoSizes.map((s) => renderOne(s)))
  const ico = await pngToIco(icoBuffers)
  await writeFile(resolve(PUBLIC, 'favicon.ico'), ico)
  console.log(`  ✓ favicon.ico            ${icoSizes.join(',')}  ${(ico.length / 1024).toFixed(1)} KB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
