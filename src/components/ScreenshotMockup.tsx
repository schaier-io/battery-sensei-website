/**
 * Real app screenshot for a feature page, in place of a hand-built JSX mockup.
 *
 * The PNGs under `public/screenshots/` are generated from the app itself by
 * `MarketingShotTests` in the battery-sensei repo — real renders of the
 * shipping SwiftUI views against a deterministic fixture, so a screenshot can
 * never drift from what users actually see. Regenerate with:
 *
 *   TEST_RUNNER_MARKETING_SHOTS=1 xcodebuild -scheme "Battery Sensei" \
 *     -destination 'platform=macOS' test \
 *     -only-testing:'battery-senseiTests/MarketingShotTests'
 *
 * Both appearances ship; the browser picks via `prefers-color-scheme`.
 */
import { SCREENSHOT_DIMENSIONS } from './screenshot-dimensions'

type Props = {
  /** Basename under /screenshots, without the -light/-dark suffix. */
  name: string
  /** Alt text — describe what the shot shows, not "screenshot of …". */
  alt: string
}

export function ScreenshotMockup({ name, alt }: Props) {
  // Intrinsic size comes from the file itself so the browser reserves the box
  // before the bytes arrive — without it the page reflows when the shot lands
  // (Cumulative Layout Shift, and a visible jump under the reader's eyes).
  const size = SCREENSHOT_DIMENSIONS[name]
  return (
    <>
      {/* Sits inside the figure's own padding — an earlier version bled past
          the card on wide screens, which left the shot flush to the left and
          right edges while keeping the top and bottom inset. Full-size detail
          lives one click away instead. */}
      <a
        href={`/screenshots/${name}-light.png`}
        target="_blank"
        rel="noreferrer"
        className="block"
        aria-label={`${alt} (opens the full-size screenshot)`}
      >
        <picture>
          <source
            srcSet={`/screenshots/${name}-dark.png`}
            media="(prefers-color-scheme: dark)"
          />
          <img
            src={`/screenshots/${name}-light.png`}
            alt={alt}
            width={size?.width}
            height={size?.height}
            loading="lazy"
            decoding="async"
            className="mx-auto h-auto w-full rounded-lg border border-[var(--line)]"
          />
        </picture>
      </a>
    </>
  )
}
