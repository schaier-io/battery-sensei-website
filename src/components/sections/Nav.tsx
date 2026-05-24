import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

const SECTIONS = ['features', 'saga', 'health', 'pricing', 'faq'] as const
type SectionId = (typeof SECTIONS)[number]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<SectionId | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (els.length === 0) return
    const visibility = new Map<SectionId, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visibility.set(e.target.id as SectionId, e.isIntersecting)
        }
        // Pick the first section (by source order) currently in view.
        const first = SECTIONS.find((id) => visibility.get(id))
        setActive(first ?? null)
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    )
    for (const el of els) io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className="sticky top-0 z-40 w-full border-b border-transparent bg-[color-mix(in_oklab,var(--washi)_78%,transparent)] backdrop-blur-md transition-[background-color,border-color,box-shadow,height] duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] data-[scrolled=true]:border-[var(--line-strong)] data-[scrolled=true]:shadow-[0_1px_0_rgba(28,26,23,0.04),0_8px_24px_-12px_rgba(28,26,23,0.18)]"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:h-20 sm:px-8 lg:px-10">
        <a
          href="#"
          className="group flex items-center gap-3 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 rounded-md"
          aria-label="Battery Sensei — home"
        >
          <img
            src="/app-icon.png"
            srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
            alt=""
            aria-hidden
            className="h-10 w-10 shrink-0 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-rotate-3 sm:h-11 sm:w-11"
          />
          <span className="hidden sm:flex flex-col items-start gap-[2px] min-w-0">
            <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi whitespace-nowrap leading-none">
              Battery Sensei
            </span>
            <span className="font-jp text-[10px] tracking-[0.36em] text-hinomaru/80 whitespace-nowrap leading-none">
              電池先生
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              data-active={active === id ? 'true' : 'false'}
              className="nav-link capitalize"
            >
              {id}
            </a>
          ))}
        </nav>

        <a
          href="#download"
          className="btn-sumi inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="hidden xs:inline sm:inline">Download</span>
        </a>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-hinomaru/0 via-hinomaru/50 to-hinomaru/0 transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  )
}
