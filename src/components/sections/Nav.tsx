import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md bg-[color-mix(in_oklab,var(--washi)_82%,transparent)] transition-shadow duration-300 ${
        scrolled
          ? 'border-[var(--line-strong)] shadow-[0_1px_0_rgba(28,26,23,0.04),0_8px_24px_-12px_rgba(28,26,23,0.18)]'
          : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-36 max-w-6xl items-center justify-between gap-6 px-8 py-4 sm:px-10 lg:px-12">
        <a href="#" className="flex flex-col items-center gap-0.5 min-w-0 leading-none">
          <img
            src="/app-icon.png"
            srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
            alt="Battery Sensei logo"
            className="h-24 w-24 shrink-0"
          />
          <span className="hidden sm:flex flex-col items-center gap-[3px] min-w-0">
            <span aria-hidden className="block h-px w-6 bg-[var(--line-strong)]" />
            <span className="display-title text-[9px] font-medium uppercase tracking-[0.32em] text-sumi whitespace-nowrap">
              Battery Sensei
            </span>
            <span className="font-jp text-[8px] tracking-[0.4em] text-hinomaru/70 whitespace-nowrap">
              電 池 先 生
            </span>
          </span>
        </a>
        <nav className="hidden items-center gap-9 md:flex">
          <a href="#features" className="nav-link">Features</a>
          <a href="#saga" className="nav-link">Saga</a>
          <a href="#health" className="nav-link">Health</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </nav>
        <a
          href="#download"
          className="btn-sumi inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
          Download
        </a>
      </div>
    </header>
  )
}
