import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const items: { href: string; key: string }[] = [
  { href: '#features', key: 'alerts' },
  { href: '#features', key: 'chargeLimit' },
  { href: '#features', key: 'travelMode' },
  { href: '#health', key: 'cycle' },
  { href: '#health', key: 'watts' },
  { href: '#saga', key: 'history' },
  // Comparison row now lives directly on the homepage Compare section,
  // not on a separate /vs-aldente subpage — link points to the anchor.
  { href: '#compare', key: 'aldenteAlt' },
]

export function Categories() {
  const { t } = useTranslation()
  // The strip overflows on narrow screens (the seven feature links don't
  // fit). When it does, animate it as a seamless marquee so the cut-off
  // items scroll into view on their own instead of demanding a swipe;
  // when it fits (wide desktop), stay a plain static row. A duplicated
  // track + translateX(-50%) keeps the loop seamless; `aria-hidden` on
  // the clone keeps the links from being announced twice.
  const maskRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const mask = maskRef.current
    const group = groupRef.current
    if (!mask || !group) return
    // Reduced-motion users keep the plain swipe-to-scroll row — never the
    // crawl. (The CSS also kills the keyframes, but we must avoid the
    // overflow-hidden mask, which would otherwise clip with no animation
    // and no way to scroll.)
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const check = () => {
      // 4px slack so a near-exact fit doesn't flip into a pointless crawl.
      setAnimate(motionOk && group.scrollWidth > mask.clientWidth + 4)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(mask)
    ro.observe(group)
    return () => ro.disconnect()
  }, [t])

  // One repeating unit: the kanji label, a hairline divider, then every
  // link. `pr-5` matches the inter-item `gap-5` so the seam between the
  // unit and its clone is indistinguishable from a normal gap.
  const renderGroup = (clone: boolean) => (
    <div
      ref={clone ? undefined : groupRef}
      aria-hidden={clone || undefined}
      className="flex shrink-0 items-center gap-5 pr-5"
    >
      <span
        aria-hidden
        className="font-jp normal-case tracking-[0.32em] text-hinomaru/80 text-xs shrink-0"
      >
        機能
      </span>
      <span aria-hidden className="h-3 w-px shrink-0 bg-[var(--line-strong)]" />
      {items.map(({ href, key }) => (
        <a
          key={key}
          href={href}
          tabIndex={clone ? -1 : undefined}
          className="shrink-0 whitespace-nowrap text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi focus-visible:outline-none focus-visible:text-sumi"
        >
          {t(`categories.items.${key}`)}
        </a>
      ))}
    </div>
  )

  return (
    <section
      aria-label={t('categories.ariaLabel')}
      className="relative border-y border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi-soft)_70%,transparent)] backdrop-blur-[3px]"
    >
      <div
        ref={maskRef}
        className={`mx-auto max-w-6xl px-5 py-3.5 text-[11px] uppercase tracking-[0.18em] sm:px-8 sm:py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          animate ? 'overflow-hidden' : 'overflow-x-auto'
        }`}
      >
        <div
          className={
            animate
              ? 'categories-marquee-track flex w-max items-center'
              : 'flex w-max items-center'
          }
        >
          {renderGroup(false)}
          {animate && renderGroup(true)}
        </div>
      </div>
    </section>
  )
}
