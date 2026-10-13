import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  applyThemePreference,
  readThemePreference,
  writeThemePreference,
  THEME_OPTIONS,
  type ThemePreference,
} from '#/lib/theme'

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
}

/** Hover motion per icon, played when its button (`group`) is hovered: the
    sun turns a quarter (its 8 rays land back on themselves), the moon tilts,
    the monitor lifts. Motion-safe only. */
const ICON_HOVER: Record<ThemePreference, string> = {
  light: 'motion-safe:group-hover:rotate-90',
  system: 'motion-safe:group-hover:-translate-y-px',
  dark: 'motion-safe:group-hover:-rotate-[18deg]',
}
const ICON_MOTION =
  'transition-[rotate,translate] duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]'

/** Matches the language/currency popovers, which keep the panel mounted for
    one animation beat after close. */
const CLOSE_MS = 180

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Light / Match system / Dark.
 *
 * In the header it is `bare`: one icon, no border, fill or chevron, and its
 * popup is a single row of three icons. The Download button is the only
 * filled control in the bar and has to stay that way, so this reads as a
 * utility affordance rather than a third thing to decide.
 *
 * Three options rather than a two-way toggle: the site follows the OS by
 * default, and a binary switch would silently discard that for anyone whose
 * Mac changes theme on a schedule.
 */
export function ThemeSwitcher({
  className = '',
  variant = 'dropdown',
  bare = false,
}: {
  className?: string
  /** Dropdown only: icon alone, no border, fill or chevron (the header, where
   *  Download must stay the only button-shaped control). */
  bare?: boolean
  /** `inline` is the mobile-drawer form: a flat row, no popover. Mirrors
      LanguageSwitcher's variant so the drawer reads as one utility block. */
  variant?: 'dropdown' | 'inline'
}) {
  const { t } = useTranslation()
  // Starts at 'system' so SSR markup and the first client render agree; the
  // stored value arrives in the layout effect below.
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [rect, setRect] = useState<{ top: number; right: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useIsomorphicLayoutEffect(() => {
    const stored = readThemePreference()
    setPreference(stored)
    // Re-assert the class: React reconciles <html> during hydration and can
    // strip what the pre-paint script added. A layout effect lands before
    // the browser paints the hydrated tree, so there is no flash.
    applyThemePreference(stored)
  }, [])

  // Keep the panel in the DOM for one beat after close so it can animate out.
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (!mounted) return
    const id = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    const measure = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (r) setRect({ top: r.bottom, right: window.innerWidth - r.right })
    }
    measure()
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(next: ThemePreference) {
    setOpen(false)
    setPreference(next)
    writeThemePreference(next)

    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Reveal the new theme as an ink blot spreading from the control
    // (styles/theme-wipe.css). View Transitions snapshot the old and new
    // frames for us, so this costs one mask animation rather than
    // transitioning colours on every element (which would also fight hover
    // states for the duration).
    if (reduced || !document.startViewTransition) {
      applyThemePreference(next)
      return
    }

    const r = triggerRef.current?.getBoundingClientRect()
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2
    const y = r ? r.top + r.height / 2 : 0
    // Distance to the far corner. theme-wipe.css scales the blot past it,
    // so the ink always covers the last pixel.
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )
    root.style.setProperty('--theme-wipe-x', `${x}px`)
    root.style.setProperty('--theme-wipe-y', `${y}px`)
    root.style.setProperty('--theme-wipe-r', `${radius}px`)
    root.dataset.themeWipe = 'on'

    const transition = document.startViewTransition(() => {
      applyThemePreference(next)
    })
    void transition.finished.finally(() => {
      delete root.dataset.themeWipe
    })
  }

  const CurrentIcon = ICONS[preference]

  if (variant === 'inline') {
    return (
      <div className={className}>
        <div className="mb-2 flex items-center gap-1.5">
          <span aria-hidden className="font-jp text-[12px] leading-none text-hinomaru-ink">
            色
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sumi-soft">
            {t('theme.label')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('theme.label')}>
          {THEME_OPTIONS.map((option) => {
            const Icon = ICONS[option]
            const active = preference === option
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option)}
                className={[
                  'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
                  active
                    ? 'border-hinomaru/45 bg-[color-mix(in_oklab,var(--hinomaru)_7%,var(--washi))] text-sumi'
                    : 'border-[var(--line)] text-sumi-soft hover:border-[var(--line-strong)] hover:text-sumi',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
                {t(`theme.${option}`)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('theme.label')}
        title={t('theme.label')}
        className={[
          'lang-trigger group inline-flex h-9 items-center rounded-md transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
          bare
            ? `w-9 justify-center ${open ? 'text-sumi' : 'text-sumi-soft hover:text-sumi'}`
            : `gap-1.5 border bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] px-2 ${
                open
                  ? 'border-[var(--line-strong)] text-sumi'
                  : 'border-[var(--line)] text-sumi-soft hover:text-sumi hover:border-[var(--line-strong)]'
              }`,
        ].join(' ')}
      >
        <CurrentIcon className={`h-4 w-4 ${ICON_MOTION} ${ICON_HOVER[preference]}`} strokeWidth={1.7} aria-hidden />
        {!bare && (
          <ChevronDown
            aria-hidden
            className="lang-chevron h-3 w-3 text-nezumi/70 group-hover:text-sumi-soft"
            strokeWidth={2}
          />
        )}
      </button>

      {mounted && rect && createPortal(
        <div
          data-state={open ? 'open' : 'closing'}
          style={{
            ['--origin-x' as string]: '100%',
            position: 'fixed',
            top: rect.top + 8,
            right: rect.right,
          }}
          className="lang-pop z-[1000] overflow-hidden rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]"
        >
          {/* One row of icons, no text: the name is on aria-label and the
              tooltip, the active option is the tinted one. */}
          <ul role="listbox" aria-label={t('theme.label')} className="flex gap-0.5 p-1">
            {THEME_OPTIONS.map((option, i) => {
              const Icon = ICONS[option]
              const active = preference === option
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={active}
                  className="lang-item relative"
                  style={{ ['--i' as string]: i }}
                >
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    aria-label={t(`theme.${option}`)}
                    title={t(`theme.${option}`)}
                    className={[
                      'group grid h-9 w-9 place-items-center rounded-md transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
                      active
                        ? 'bg-[color-mix(in_oklab,var(--hinomaru)_10%,transparent)] text-hinomaru-ink'
                        : 'text-sumi-soft hover:bg-[color-mix(in_oklab,var(--sumi)_8%,transparent)] hover:text-sumi',
                    ].join(' ')}
                  >
                    <Icon className={`h-4 w-4 ${ICON_MOTION} ${ICON_HOVER[option]}`} strokeWidth={1.7} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
