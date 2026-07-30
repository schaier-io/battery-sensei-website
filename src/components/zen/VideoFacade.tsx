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
 * The facade shows the video's own poster frame (served from YouTube's image
 * CDN, already allowed by img-src) with a play affordance, and swaps in the
 * real iframe on the first click, autoplaying so the click still reads as
 * "play" rather than "load".
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
      <img
        src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-sumi/25 transition-colors duration-[320ms] group-hover:bg-sumi/15"
      />
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[color-mix(in_oklab,var(--washi)_92%,var(--paper-lift))] shadow-[0_8px_24px_-8px_rgba(28,26,23,0.5)] transition-transform duration-[320ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
      >
        <Play className="ml-0.5 h-6 w-6 fill-hinomaru text-hinomaru-ink" strokeWidth={1.5} />
      </span>
    </button>
  )
}
