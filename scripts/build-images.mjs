/* Build step: responsive AVIF + WebP variants of the app screenshots.

   public/screenshots/*.png come from the marketing-shot pipeline at 1800 px
   wide (0.2 to 1 MB each). Pages show them at about 656 CSS px, so each PNG
   gets AVIF and WebP copies at WIDTHS. The PNG stays as the full-size link
   target. Output goes to public/screenshots/gen (gitignored); a variant is
   only re-encoded when its PNG is newer, so dev restarts stay fast. */
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { SCREENSHOT_FORMATS, SCREENSHOT_WIDTHS, screenshotVariant } from '../src/lib/screenshot-variants.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(root, 'public/screenshots')
const OUT_DIR = join(root, 'public/screenshots/gen')
const ENCODE = {
  avif: (img) => img.avif({ quality: 55, effort: 4 }),
  webp: (img) => img.webp({ quality: 80, effort: 4 }),
}

const mtime = (p) => {
  try {
    return statSync(p).mtimeMs
  } catch {
    return 0
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const pngs = readdirSync(SRC_DIR).filter((f) => f.endsWith('.png'))
  let encoded = 0
  await Promise.all(
    pngs.map(async (file) => {
      const src = join(SRC_DIR, file)
      const base = file.replace(/\.png$/, '')
      for (const width of SCREENSHOT_WIDTHS) {
        for (const format of SCREENSHOT_FORMATS) {
          const out = join(root, 'public', screenshotVariant(base, width, format))
          if (mtime(out) > mtime(src)) continue
          await ENCODE[format](sharp(src).resize({ width, withoutEnlargement: true })).toFile(out)
          encoded++
        }
      }
    }),
  )
  console.log(`build-images: ${pngs.length} screenshots, ${encoded} variants encoded`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
