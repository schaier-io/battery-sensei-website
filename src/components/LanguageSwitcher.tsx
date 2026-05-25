import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES, loadLocale, type Locale } from '#/lib/i18n'
import { useLocaleSwitcher } from '#/lib/i18n/I18nProvider'

// Native endonym shown next to each option — readable in its own script.
const NATIVE_NAME: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
}

// Compact label for the trigger chip.
const SHORT_LABEL: Record<Locale, string> = {
  en: 'EN',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
  ja: '日',
}

// A tiny brush-script glyph that signals "language" without leaning on a
// generic globe icon. 言 = "word / speech".
function LangGlyph({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`lang-glyph-anim font-jp text-hinomaru/85 leading-none ${className}`}
    >
      言
    </span>
  )
}

type Variant = 'chip' | 'inline'

// Close animation duration matches the `lang-pop-out` keyframe in styles.css.
// Keep the two in lockstep — if you change one, change the other.
const CLOSE_MS = 180

export function LanguageSwitcher({
  className = '',
  variant = 'chip',
  align = 'end',
}: {
  className?: string
  variant?: Variant
  /** Dropdown alignment relative to the trigger. */
  align?: 'start' | 'end'
}) {
  const { t } = useTranslation()
  const { current, setLocale } = useLocaleSwitcher()
  // `open` is the logical state; `mounted` keeps the panel in the DOM long
  // enough to run the exit animation before unmount. `state` drives CSS.
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pending, setPending] = useState<Locale | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  // Trigger rect drives the portal's fixed position. Recomputed on open,
  // scroll, and resize so the panel stays glued to the chip.
  const [rect, setRect] = useState<{ top: number; left: number; right: number } | null>(null)

  // Sync mount lifecycle with open: mount immediately on open, defer
  // unmount until the close animation finishes.
  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      setMounted(true)
      return
    }
    if (!mounted) return
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false)
      closeTimerRef.current = null
    }, CLOSE_MS)
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (popRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Keep the portal anchored to the trigger across layout shifts.
  useLayoutEffect(() => {
    if (!mounted) return
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.bottom, left: r.left, right: window.innerWidth - r.right })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [mounted])

  const handlePick = (loc: Locale) => {
    if (loc === current || pending) return
    setPending(loc)
    void setLocale(loc).finally(() => {
      setPending(null)
      setOpen(false)
    })
  }

  // Warm the JSON chunk on any intent signal so the click feels instant.
  // `loadLocale` dedupes, so spamming it during hover is free after the
  // first call. `en` is bundled and returns immediately.
  const prefetch = (loc: Locale) => {
    if (loc === current) return
    void loadLocale(loc)
  }

  // When the menu opens, kick off all non-active chunks at low priority so
  // the most likely next click already has its bytes in the SW cache.
  useEffect(() => {
    if (!open) return
    const id = window.requestIdleCallback?.(
      () => SUPPORTED_LOCALES.forEach((loc) => prefetch(loc)),
      { timeout: 1500 },
    ) ?? window.setTimeout(
      () => SUPPORTED_LOCALES.forEach((loc) => prefetch(loc)),
      150,
    )
    return () => {
      if (typeof id === 'number') window.clearTimeout(id)
      else window.cancelIdleCallback?.(id)
    }
    // `current` intentionally omitted — the effect only needs to re-run when
    // the menu opens; `prefetch` itself skips the active locale anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Inline variant: render the options as a simple list (used inside the
  // mobile drawer where a popover would be redundant).
  if (variant === 'inline') {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center gap-3">
          <LangGlyph className="text-xl" />
          <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
            {t('common.language')}
          </span>
          <span
            aria-hidden
            className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
          />
        </div>
        <ul className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('common.language')}>
          {SUPPORTED_LOCALES.map((loc) => {
            const active = loc === current
            const isPending = pending === loc
            return (
              <li key={loc}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isPending}
                  onClick={() => handlePick(loc)}
                  onPointerEnter={() => prefetch(loc)}
                  onFocus={() => prefetch(loc)}
                  className={[
                    'group relative flex w-full items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left transition-[colors,transform] duration-200 active:scale-[0.98]',
                    active
                      ? 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)]'
                      : 'border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_72%,#fff)] hover:border-[var(--line-strong)]',
                  ].join(' ')}
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="font-jp text-base leading-none text-hinomaru/80 w-5 text-center">
                      {SHORT_LABEL[loc]}
                    </span>
                    <span className="display-title text-[0.9375rem] font-medium text-sumi truncate">
                      {NATIVE_NAME[loc]}
                    </span>
                  </span>
                  {active && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-hinomaru" strokeWidth={2.2} aria-hidden />
                  )}
                  {isPending && !active && (
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 rounded-full border border-sumi-soft/40 border-t-sumi animate-spin"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // Chip variant — header trigger + popover.
  // `data-state` drives enter/exit keyframes defined in styles.css.
  // CSS-side origin lets the panel scale from the trigger corner, so the
  // motion feels anchored regardless of `align`.
  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={[
          'lang-trigger group inline-flex h-9 items-center gap-2 rounded-md border bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-2.5 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
          open
            ? 'border-[var(--line-strong)] text-sumi'
            : 'border-[var(--line)] text-sumi-soft hover:text-sumi hover:border-[var(--line-strong)]',
        ].join(' ')}
      >
        <LangGlyph className="text-[15px]" />
        <span
          aria-hidden
          className="h-3 w-px bg-[var(--line)] group-hover:bg-[var(--line-strong)] transition-colors"
        />
        <span className="tabular-nums">{SHORT_LABEL[current]}</span>
        <ChevronDown
          aria-hidden
          className="lang-chevron h-3 w-3 text-nezumi/70 group-hover:text-sumi-soft"
          strokeWidth={2}
        />
      </button>

      {mounted && rect && createPortal(
        <div
          ref={popRef}
          data-state={open ? 'open' : 'closing'}
          style={{
            ['--origin-x' as string]: align === 'end' ? '100%' : '0%',
            position: 'fixed',
            top: rect.top + 8,
            ...(align === 'end'
              ? { right: rect.right }
              : { left: rect.left }),
          }}
          className="lang-pop z-[1000] w-56 overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]"
        >
          {/* Header strip — kanji accent + label + brush rule */}
          <div className="lang-pop-header flex items-center gap-2.5 px-3 pt-2.5 pb-2">
            <LangGlyph className="text-base" />
            <span className="font-jp text-[10px] tracking-[0.34em] text-nezumi uppercase">
              言 語
            </span>
            <span
              aria-hidden
              className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
            />
          </div>

          <ul role="listbox" aria-label={t('common.language')}>
            {SUPPORTED_LOCALES.map((loc, i) => {
              const active = loc === current
              const isPending = pending === loc
              return (
                <li
                  key={loc}
                  role="option"
                  aria-selected={active}
                  className="lang-item relative"
                  style={{ ['--i' as string]: i }}
                >
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handlePick(loc)}
                    onPointerEnter={() => prefetch(loc)}
                    onFocus={() => prefetch(loc)}
                    className={[
                      'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-colors duration-[200ms]',
                      active
                        ? 'bg-[color-mix(in_oklab,var(--hinomaru)_8%,transparent)] text-sumi'
                        : 'text-sumi-soft hover:bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] hover:text-sumi',
                      isPending ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <span className="flex items-baseline gap-2.5 min-w-0">
                      <span className="font-jp text-base leading-none text-hinomaru/80 w-5 text-center shrink-0 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.08]">
                        {SHORT_LABEL[loc]}
                      </span>
                      <span className="display-title text-[13px] text-sumi truncate">
                        {NATIVE_NAME[loc]}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-hinomaru" strokeWidth={2.2} aria-hidden />
                    ) : isPending ? (
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full border border-sumi-soft/40 border-t-sumi animate-spin"
                      />
                    ) : null}
                  </button>
                  <span aria-hidden className="lang-item-rule" />
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
