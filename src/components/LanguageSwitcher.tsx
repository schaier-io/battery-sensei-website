import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { SUPPORTED_LOCALES, loadLocale, persistLocale, type Locale } from '#/lib/i18n'
import { runViewTransition } from '#/lib/prefers-reduced-motion'
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
      className={`lang-glyph-anim font-jp text-hinomaru-ink/85 leading-none ${className}`}
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
  const { t, i18n } = useTranslation()
  const { current, setLocale } = useLocaleSwitcher()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> })
  // Home variants ("/", "/de", "/es", "/fr", "/ja") have localized URLs;
  // every other page is English-only.
  const onHome =
    pathname === '/' ||
    SUPPORTED_LOCALES.some((l) => l !== 'en' && pathname === `/${l}`)
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
    setOpen(false)

    // HOME pages have a URL per locale (/, /de, /es, /fr, /ja). REDIRECT to it
    // rather than swapping i18n in place first — the old code called
    // `changeLanguage` up front, so the CURRENT page re-rendered into the new
    // language (a jarring "pop-in") before the URL caught up.
    //
    // The whole swap is wrapped in ONE root view transition so the page fades
    // out and the new-language page fades in (410ms — the `route-fade`
    // keyframes in styles.css). The language change rides INSIDE that callback,
    // so it's captured as the transition's "new" state and never painted on the
    // old URL. Works no matter which language is active when you click:
    //   - Non-English (/de…): the root `beforeLoad` loads the bundle + switches
    //     the active locale before the new route paints.
    //   - English ("/"): `beforeLoad` deliberately keeps the visitor's current
    //     language on the bare path (so home links don't bounce a German reader
    //     to English), so here we switch to `en` ourselves.
    if (onHome) {
      persistLocale(loc)
      const run = async () => {
        if (loc === 'en') {
          if (i18n.language !== 'en') await i18n.changeLanguage('en')
          // `viewTransition: false`: we run our own startViewTransition below,
          // so skip the router's per-nav one to avoid nesting two transitions.
          await navigate({ to: '/', viewTransition: false })
        } else {
          await navigate({ to: '/$lang', params: { lang: loc }, viewTransition: false })
        }
        setPending(null)
      }
      // Warm the chunk first so the transition's frozen frame is short (the
      // `beforeLoad` await resolves from cache), then cross-fade.
      void loadLocale(loc).then(() => {
        runViewTransition(run)
      })
      return
    }

    // Subpages are English-only URLs — there's no localized route to redirect
    // to, so swap client-side (cookie + i18n). No visible pop-in here since the
    // page content isn't translated; only the shared chrome re-renders.
    void setLocale(loc).finally(() => {
      setPending(null)
      // Subpage carrying a ?locale (newsletter / thanks flows): keep it in sync
      // so the URL stops contradicting the translated content — no more stale
      // ?locale=en lingering after a switch.
      if (search && 'locale' in search) {
        navigate({
          to: '.',
          search: (prev: Record<string, unknown>) => ({ ...prev, locale: loc }),
          replace: true,
        })
      }
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

  // Inline variant (mobile drawer): a single compact row of locale codes.
  // The full 2×2 grid of native names was eating vertical space and reading
  // as primary content; here each language is just its short code, with the
  // native name carried on aria-label/title for assistive tech + tooltip.
  if (variant === 'inline') {
    return (
      <div className={className}>
        {/* Quiet section label — a small red 言 ("speech/language") + the
            localized word, set above the compact code row so the picker reads
            as "Language: EN DE …" without the old full-width header bulk. */}
        <div className="mb-2 flex items-center gap-1.5">
          <span aria-hidden className="font-jp text-[12px] leading-none text-hinomaru-ink">
            言
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sumi-soft">
            {t('common.language')}
          </span>
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="radiogroup"
          aria-label={t('common.language')}
        >
          {SUPPORTED_LOCALES.map((loc) => {
          const active = loc === current
          const isPending = pending === loc
          return (
            <button
              key={loc}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={NATIVE_NAME[loc]}
              title={NATIVE_NAME[loc]}
              disabled={isPending}
              onClick={() => handlePick(loc)}
              onPointerEnter={() => prefetch(loc)}
              onFocus={() => prefetch(loc)}
              className={[
                'inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-md border px-2.5 font-jp text-[12px] tracking-[0.08em] transition-[colors,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
                active
                  ? 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--hinomaru)_10%,transparent)] text-hinomaru-ink'
                  : 'border-[var(--line)] text-sumi-soft hover:border-[var(--line-strong)] hover:text-sumi',
                isPending ? 'opacity-60' : '',
              ].join(' ')}
            >
              {SHORT_LABEL[loc]}
            </button>
          )
          })}
        </div>
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
          'lang-trigger group inline-flex h-9 items-center gap-2 rounded-md border bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] px-2.5 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
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
          className="lang-pop z-[1000] w-56 overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]"
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
                        : 'text-sumi-soft hover:bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] hover:text-sumi',
                      isPending ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <span className="flex items-baseline gap-2.5 min-w-0">
                      <span className="font-jp text-base leading-none text-hinomaru-ink/80 w-5 text-center shrink-0 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.08]">
                        {SHORT_LABEL[loc]}
                      </span>
                      <span className="display-title text-[13px] text-sumi truncate">
                        {NATIVE_NAME[loc]}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-hinomaru-ink" strokeWidth={2.2} aria-hidden />
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
