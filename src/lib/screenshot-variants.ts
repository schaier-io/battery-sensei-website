// Shared by scripts/build-images.mjs (writes the files) and ScreenshotMockup
// (builds srcSet). Plain erasable TypeScript so Node can import it directly.

/** Variant widths in px. 640 covers phones at 1x to 2x, 1080 covers the
 *  656 px desktop slot at 1.5x, 1800 is the source width for 2x and up. */
export const SCREENSHOT_WIDTHS = [640, 1080, 1800] as const
export const SCREENSHOT_FORMATS = ['avif', 'webp'] as const
export type ScreenshotFormat = (typeof SCREENSHOT_FORMATS)[number]

/** Public path of one variant, e.g. /screenshots/gen/general-dark-640.avif */
export function screenshotVariant(base: string, width: number, format: ScreenshotFormat): string {
  return `/screenshots/gen/${base}-${width}.${format}`
}

export function screenshotSrcSet(base: string, format: ScreenshotFormat): string {
  return SCREENSHOT_WIDTHS.map((w) => `${screenshotVariant(base, w, format)} ${w}w`).join(', ')
}
