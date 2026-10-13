import { useState } from 'react'
import { Play } from 'lucide-react'

/**
 * Click-to-load wrapper for the YouTube embed.
 *
 * A bare lazy <iframe> paints as a large black rectangle until YouTube's
 * player boots, which on a slow connection is most of what a visitor sees
 * inside the paper card. It also pulls ~1 MB of third-party script on every
 * page view whether or not anyone watches.
 *
 * The facade stays entirely local until the first click, then swaps in the
 * real iframe and autoplays so the click still reads as "play" rather than
 * "load". This avoids disclosing a visit to YouTube just to fetch a poster:
 * pass `poster` as a self-hosted image, never an i.ytimg.com URL.
 */
export function VideoFacade({
  videoId,
  title,
  poster,
  className = '',
}: {
  videoId: string
  /** Self-hosted thumbnail painted behind the play button. */
  poster?: string
  /** Accessible name for both the poster button and the loaded player. */
  title: string
  className?: string
}) {
  const [active, setActive] = useState(false)

  if (active) {
    return (
      <iframe
        className={className}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={title}
      className={`group relative isolate block cursor-pointer overflow-hidden ${className}`}
    >
      {poster ? (
        <>
          <img
            src={poster}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-[600ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-hover:scale-[1.02]"
          />
          {/* Soft scrim so the play button and caption stay legible on any
              frame, lighter on hover so the thumbnail comes forward. */}
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(28,26,23,0.30),rgba(28,26,23,0.12))] transition-opacity duration-[320ms] group-hover:opacity-70"
          />
        </>
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 bg-[color-mix(in_oklab,var(--washi)_82%,var(--sumi))] transition-colors duration-[320ms] group-hover:bg-[color-mix(in_oklab,var(--washi)_88%,var(--sumi))]"
        />
      )}
      {/* With a poster the caption sits as a chip at the bottom; lift the play
          button below sm so the two never touch on 320px phones. */}
      <span
        className={`absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center ${poster ? 'pb-8 sm:pb-0' : ''}`}
      >
        <span
          aria-hidden
          className="grid h-12 w-12 place-items-center rounded-full sm:h-16 sm:w-16 bg-[color-mix(in_oklab,var(--washi)_92%,var(--paper-lift))] shadow-[0_8px_24px_-8px_rgba(28,26,23,0.5)] transition-transform duration-[320ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
        >
          <Play className="ml-0.5 h-5 w-5 fill-hinomaru sm:h-6 sm:w-6 text-hinomaru-ink" strokeWidth={1.5} />
        </span>
        <span
          className={
            poster
              ? 'absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-full bg-[color-mix(in_oklab,var(--washi)_92%,var(--paper-lift))] px-3.5 py-1.5 text-[13px] font-semibold text-sumi shadow-[0_6px_18px_-8px_rgba(28,26,23,0.45)] sm:bottom-4 sm:text-sm'
              : 'font-display text-base font-semibold text-sumi sm:text-lg'
          }
        >
          {title}
        </span>
      </span>
    </button>
  )
}
