import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Headline = { lead: string; tail: string }

// How long each headline holds before the next is drawn in.
const HOLD_MS = 4200

/**
 * Split a line into inline-block words (each holding inline-block glyph
 * spans) so every visible character can be animated independently while
 * words still wrap at the spaces between them. `start` seeds a running
 * glyph index that drives the left→right draw stagger; the returned
 * `next` continues it onto the following line, so the whole headline
 * draws top-to-bottom as one gesture.
 */
function drawnLine(
  text: string,
  start: number,
): { nodes: ReactNode[]; next: number } {
  const words = text.split(' ')
  let idx = start
  const nodes: ReactNode[] = []
  words.forEach((word, wi) => {
    const chars = Array.from(word).map((ch, ci) => {
      const i = idx++
      return (
        <span
          key={ci}
          className="hero-hl-char"
          style={{ ['--i' as string]: i }}
        >
          {ch}
        </span>
      )
    })
    nodes.push(
      <span key={`w${wi}`} className="hero-hl-word">
        {chars}
      </span>,
    )
    // Real space between words — plain text so the line still wraps here.
    if (wi < words.length - 1) nodes.push(<span key={`s${wi}`}> </span>)
  })
  return { nodes, next: idx }
}

/**
 * Hero headline that cycles through `hero.headlines`, drawing each new
 * line in one glyph at a time — a brush crossing the line left→right
 * (see `.hero-hl-char` in styles.css) — while the outgoing line dries
 * and lifts away. Deliberately hand-drawn and gradual, not a slide/fade.
 *
 * All headlines render stacked in a single grid cell, so the enclosing
 * <h1> reserves the tallest line's height and never reflows as copy
 * cycles. The whole visual is `aria-hidden`; the <h1> carries a stable
 * accessible name via the sr-only line Hero renders alongside it.
 *
 * Under `prefers-reduced-motion` the rotation never starts — the first
 * headline simply stays put.
 */
export function RotatingHeadline() {
  const { t } = useTranslation()
  const raw = t('hero.headlines', { returnObjects: true })
  const headlines: Headline[] = Array.isArray(raw)
    ? (raw as Headline[]).filter(
        (h) => h && typeof h.lead === 'string' && typeof h.tail === 'string',
      )
    : []

  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  // Stays false on first paint so the initial headline shows statically
  // (its entrance is owned by the parent Reveal); flips true once the
  // rotation begins, arming the per-glyph draw + line-out keyframes.
  const [rotating, setRotating] = useState(false)

  const count = headlines.length
  useEffect(() => {
    if (count <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setActive((a) => {
        setPrev(a)
        return (a + 1) % count
      })
      setRotating(true)
    }, HOLD_MS)
    return () => window.clearInterval(id)
  }, [count])

  if (count === 0) return null

  return (
    <span aria-hidden className="grid">
      {headlines.map((h, i) => {
        const isPrev = i === prev
        const lead = drawnLine(h.lead, 0)
        const tail = drawnLine(h.tail, lead.next)
        return (
          <span
            key={i}
            className="hero-headline-layer"
            data-active={i === active || undefined}
            data-prev={isPrev || undefined}
            data-animate={rotating || undefined}
            onAnimationEnd={(e) => {
              // The outgoing layer's own line-out fade (target === layer)
              // signals it's fully dried — drop it back to hidden. Ignore
              // the many glyph-draw events bubbling up from the active one.
              if (isPrev && e.target === e.currentTarget) {
                setPrev((p) => (p === i ? null : p))
              }
            }}
          >
            <span className="block">{lead.nodes}</span>
            <span className="block mt-1 sm:mt-2 text-sumi-soft italic font-normal">
              {tail.nodes}
            </span>
          </span>
        )
      })}
    </span>
  )
}
