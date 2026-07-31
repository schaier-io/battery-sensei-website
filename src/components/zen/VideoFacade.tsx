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
 * "load". This avoids disclosing a visit to YouTube just to fetch a poster.
 */
export function VideoFacade({
  videoId,
  title,
  className = '',
}: {
  videoId: string
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
      <span
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--washi)_82%,var(--sumi))] transition-colors duration-[320ms] group-hover:bg-[color-mix(in_oklab,var(--washi)_88%,var(--sumi))]"
      />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          aria-hidden
          className="grid h-16 w-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--washi)_92%,var(--paper-lift))] shadow-[0_8px_24px_-8px_rgba(28,26,23,0.5)] transition-transform duration-[320ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
        >
          <Play className="ml-0.5 h-6 w-6 fill-hinomaru text-hinomaru-ink" strokeWidth={1.5} />
        </span>
        <span className="font-display text-base font-semibold text-sumi sm:text-lg">
          {title}
        </span>
      </span>
    </button>
  )
}
