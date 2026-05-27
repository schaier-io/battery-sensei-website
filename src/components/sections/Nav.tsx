import { useEffect, useRef, useState } from 'react'
import { Download, MessageCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouterState } from '@tanstack/react-router'
import { LanguageSwitcher } from '#/components/LanguageSwitcher'

/**
 * Build a section anchor href that works from every route.
 *
 * The header lives inside `__root.tsx`, so it renders on every page —
 * but the section ids (`#features`, `#pricing`, …) only exist on the
 * homepage. A bare `href="#pricing"` on `/checkout` just appends the
 * hash to the URL without navigating, leaving the user stuck. By
 * returning `"/#pricing"` whenever we're NOT on `"/"`, the browser
 * does a real cross-route navigation home and the scroll-to-anchor
 * fires correctly after the home route mounts.
 */
function sectionHref(id: string, pathname: string): string {
  // The legacy standalone Download section is gone; every "download"
  // intent now scrolls to the email-capture input inside the Pricing
  // section's free tier. Aliased here so all `sectionHref('download',
  // …)` call sites pick up the new target without per-site edits.
  const target = id === 'download' ? 'free-download-email' : id
  return pathname === '/' ? `#${target}` : `/#${target}`
}

const SECTIONS = ['features', 'saga', 'health', 'pricing', 'faq', 'contact'] as const
type SectionId = (typeof SECTIONS)[number]

// Desktop bar shows only the conversion-critical trio. History, Health, and
// Contact remain reachable via the full mobile drawer and in-page scroll, so
// the desktop header can breathe.
const DESKTOP_SECTIONS: ReadonlyArray<SectionId> = ['features', 'pricing', 'faq']

// Maps each section to a single-character kanji used as a quiet seal next to
// the link in the mobile drawer. Keeps the menu visually anchored to the
// brand's ink-on-washi aesthetic rather than a generic bullet list.
const SECTION_KANJI: Record<SectionId, string> = {
  features: '基',
  saga: '史',
  health: '健',
  pricing: '価',
  faq: '問',
  contact: '文',
}

export function Nav() {
  const { t } = useTranslation()
  // `pathname` drives `sectionHref` — on `/` we keep bare `#id`
  // anchors so the IntersectionObserver-driven active state still
  // tracks; on subpages we rewrite to `/#id` so the link actually
  // navigates home instead of becoming a no-op.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<SectionId | null>(null)
  const [progress, setProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  // Remember which element opened the drawer so we can restore focus to
  // it on close. Defaults to the hamburger button but works the same if
  // some future surface programmatically opens the menu.
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)

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
        const first = SECTIONS.find((id) => visibility.get(id))
        setActive(first ?? null)
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    )
    for (const el of els) io.observe(el)
    return () => io.disconnect()
  }, [])

  // Body scroll lock + escape-to-close + focus restoration while the
  // drawer is open. Restoring focus to the hamburger on close keeps
  // keyboard navigation continuous — the user's previous "place" in the
  // tab order survives the modal interaction.
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
      // Pull focus back to the hamburger ONLY if focus fell to nothing
      // (e.g. user clicked outside the drawer). When they tap a section
      // link inside the drawer, the browser is already smooth-scrolling
      // and refocusing the off-screen hamburger would cancel that scroll
      // on mobile Safari. Wrapped in rAF so the drawer is fully unmounted
      // before we check `activeElement`.
      window.requestAnimationFrame(() => {
        const focused = document.activeElement
        if (!focused || focused === document.body) {
          hamburgerRef.current?.focus()
        }
      })
    }
  }, [menuOpen])

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className="sticky top-0 z-40 w-full border-b border-transparent bg-[color-mix(in_oklab,var(--washi)_78%,transparent)] backdrop-blur-md transition-[background-color,border-color,box-shadow,height] duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] data-[scrolled=true]:border-[var(--line-strong)] data-[scrolled=true]:shadow-[0_1px_0_rgba(28,26,23,0.04),0_8px_24px_-12px_rgba(28,26,23,0.18)]"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:h-20 sm:px-8 md:gap-5 lg:gap-6 lg:px-10">
        {/* Anchor href "/" (not "#") so the browser back button + history
            entries behave correctly. Clicking the wordmark on a deep
            page returns to home; on home itself it's a no-op scroll. */}
        <a
          href="/"
          className="group flex items-center gap-3 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 rounded-md"
          aria-label={t('nav.ariaHome')}
        >
          <img
            src="/logo-256.webp"
            srcSet="/logo-256.webp 1x, /logo-512.webp 2x"
            width="44"
            height="44"
            alt=""
            aria-hidden
            // First above-fold image → LCP candidate. Eager + high priority
            // + the matching <link rel="preload"> in __root.tsx kick the
            // request off before hydration discovers this img.
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-10 w-10 shrink-0 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-rotate-3 sm:h-11 sm:w-11"
          />
          {/* Wordmark reappears from md+ now that chat + language live in
              the footer below lg. The kanji subtitle only joins at lg
              where there's slack — md keeps it single-line so the bar
              doesn't shoulder past the nav links. */}
          <span className="hidden md:flex flex-col items-start gap-[2px] min-w-0">
            <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi whitespace-nowrap leading-none">
              Battery Sensei
            </span>
            <span className="hidden lg:inline font-jp text-[10px] tracking-[0.36em] text-hinomaru/80 whitespace-nowrap leading-none">
              電池先生
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8" aria-label={t('nav.ariaPrimary')}>
          {DESKTOP_SECTIONS.map((id) => (
            <a
              key={id}
              href={sectionHref(id, pathname)}
              data-active={active === id ? 'true' : 'false'}
              className="nav-link"
            >
              {t(`nav.sections.${id}`)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Quiet support affordance — signals "humans answer here" without
              competing with the primary nav. Visible only at lg+ where
              the bar has room; below lg the same link is in the footer
              and the mobile drawer. */}
          <a
            href={sectionHref('contact', pathname)}
            aria-label={t('nav.supportAria')}
            className="nav-support hidden lg:inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm text-sumi-soft hover:text-hinomaru transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            <span>{t('nav.support')}</span>
          </a>
          {/* Language switcher: visible only at lg+ where the bar has
              room. Below lg it sits in the footer; on mobile it lives
              inside the drawer. */}
          <LanguageSwitcher className="hidden lg:block" />
          <a
            href={sectionHref('download', pathname)}
            className="btn-sumi hidden md:inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>{t('common.download')}</span>
          </a>

          {/* Brush-stroke hamburger — three sumi lines that tilt + spread on
              hover. Visible only below md where the desktop nav is hidden. */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            className="md:hidden group inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] text-sumi-soft transition-colors duration-200 hover:border-[var(--line-strong)] hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <BrushBurger />
          </button>
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-hinomaru/0 via-hinomaru/50 to-hinomaru/0 transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />

      <MobileDrawer
        open={menuOpen}
        active={active}
        pathname={pathname}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  )
}

function BrushBurger() {
  return (
    <svg
      viewBox="0 0 22 14"
      width="22"
      height="14"
      aria-hidden
      className="text-current"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6">
        {/* Slight length variation + endpoint stagger so the bars read as
            three brush strokes rather than a clinical hamburger. */}
        <line x1="2" y1="2"  x2="20" y2="2" />
        <line x1="3" y1="7"  x2="17" y2="7" />
        <line x1="2" y1="12" x2="19" y2="12" />
      </g>
    </svg>
  )
}

function MobileDrawer({
  open,
  active,
  pathname,
  onClose,
}: {
  open: boolean
  active: SectionId | null
  /** Forwarded from `<Nav>` so the drawer's anchor links rewrite to
   *  `/#id` when the user is on a subpage (e.g. `/checkout`). Same
   *  fix as the desktop nav — see `sectionHref` rationale. */
  pathname: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  // Move keyboard focus into the drawer on open so a screen-reader user
  // immediately hears the dialog label + first interactive element. Pair
  // with the parent Nav effect that restores focus to the hamburger on
  // close. We don't trap Tab inside the drawer (would require more
  // plumbing) — Escape + click-outside cover the common exit paths and
  // the visually-hidden body content is scroll-locked underneath.
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => closeBtnRef.current?.focus(), 60)
    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <div
      id="mobile-drawer"
      data-open={open ? 'true' : 'false'}
      className="md:hidden fixed inset-0 z-50 pointer-events-none data-[open=true]:pointer-events-auto"
      aria-hidden={!open}
    >
      {/* Washi-wash backdrop — soft warm scrim that doesn't go full black. */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={t('nav.closeMenu')}
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--sumi)_55%,transparent)] backdrop-blur-[2px] opacity-0 transition-opacity duration-[320ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] data-[open=true]:opacity-100"
        data-open={open ? 'true' : 'false'}
      />

      {/* Sheet panel — washi-textured paper that slides down from the top. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.ariaPrimary')}
        className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] shadow-[0_18px_40px_-22px_rgba(28,26,23,0.45)] -translate-y-full transition-transform duration-[360ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] data-[open=true]:translate-y-0"
        data-open={open ? 'true' : 'false'}
      >
        {/* Header bar inside the sheet — mirrors the page header so the
            transition feels like a panel unfolding from it. */}
        <div className="flex items-center justify-between gap-3 px-5 h-16 border-b border-[var(--line)]">
          <span className="flex items-center gap-2.5 leading-none">
            <img
              src="/logo-256.webp"
              srcSet="/logo-256.webp 1x, /logo-512.webp 2x"
              width="36"
              height="36"
              alt=""
              aria-hidden
              decoding="async"
              className="h-9 w-9"
            />
            <span className="flex flex-col items-start gap-[2px]">
              <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi leading-none">
                Battery Sensei
              </span>
              <span className="font-jp text-[10px] tracking-[0.36em] text-hinomaru/80 leading-none">
                電池先生
              </span>
            </span>
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-sumi-soft transition-colors duration-200 hover:text-sumi hover:bg-[color-mix(in_oklab,var(--washi-deep)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <X className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          </button>
        </div>

        {/* Section list — each row gets a kanji seal + section name. Generous
            tap targets, sumi divider rules. */}
        <nav className="px-5 pt-5 pb-2" aria-label={t('nav.ariaPrimary')}>
          <ul className="flex flex-col">
            {SECTIONS.map((id, i) => {
              const isActive = active === id
              return (
                <li key={id}>
                  <a
                    href={sectionHref(id, pathname)}
                    onClick={onClose}
                    data-active={isActive ? 'true' : 'false'}
                    // Row-level hover treatment: the inner kanji + label
                    // group slides ~6 px to the right + the kanji deepens
                    // to hinomaru. Subtle but enough to make the row feel
                    // tappable on touch + responsive on pointer. The
                    // padding-x doesn't change, so the border-bottom
                    // alignment stays steady through the animation.
                    className="group flex items-center justify-between gap-4 py-4 border-b border-[var(--line)] last:border-b-0 transition-colors duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30 focus-visible:rounded-md"
                  >
                    <span className="flex items-baseline gap-4 min-w-0 transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-1.5">
                      <span
                        aria-hidden
                        className="font-jp text-2xl leading-none text-hinomaru/70 transition-colors duration-[220ms] group-hover:text-hinomaru w-8 text-center tabular-nums"
                      >
                        {SECTION_KANJI[id]}
                      </span>
                      <span className="display-title text-[1.25rem] font-medium text-sumi transition-colors duration-[220ms] group-hover:text-hinomaru group-data-[active=true]:text-hinomaru">
                        {t(`nav.sections.${id}`)}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="text-nezumi tabular-nums text-[10px] uppercase tracking-[0.18em] transition-colors duration-[220ms] group-hover:text-sumi-soft"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Brush divider between sections + utilities. */}
        <div className="px-5 mt-4">
          <span
            aria-hidden
            className="block h-px w-full bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent"
          />
        </div>

        {/* Chat row — voice tuned to match the inline LanguageSwitcher
            header (kanji glyph + tracked label + brush rule) below it,
            so the two utilities feel like one panel of options instead
            of two unrelated links stacked vertically. */}
        <div className="px-5 pt-6">
          <a
            href={sectionHref('contact', pathname)}
            onClick={onClose}
            className="group flex items-center gap-3 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_72%,#fff)] px-3.5 py-2.5 transition-colors duration-200 hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <span aria-hidden className="font-jp text-base leading-none text-hinomaru/80 w-5 text-center">
              文
            </span>
            <span className="display-title text-[0.9375rem] font-medium text-sumi truncate">
              {t('nav.support')}
            </span>
            <MessageCircle
              aria-hidden
              className="ml-auto h-4 w-4 text-nezumi transition-colors group-hover:text-sumi"
              strokeWidth={1.7}
            />
          </a>
        </div>
        <div className="px-5 pt-3">
          <LanguageSwitcher variant="inline" />
        </div>

        {/* Primary CTA + closing hanko-style mark. */}
        <div className="px-5 pt-7 pb-8 flex flex-col gap-4">
          <a
            href={sectionHref('download', pathname)}
            onClick={onClose}
            className="btn-sumi inline-flex h-12 items-center justify-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            {t('common.downloadMac')}
          </a>
          <p className="text-center font-jp text-[11px] tracking-[0.36em] text-nezumi">
            静 か な 力
          </p>
        </div>
      </aside>
    </div>
  )
}
