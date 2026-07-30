import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '#/lib/pricing'
import {
  setCurrencyPreference,
  useCurrencyPreference,
} from '#/lib/currency-preference'
import { usePremiumPrice } from '#/lib/use-price'

function asSupportedCurrency(code: string): SupportedCurrency {
  if (code === 'EUR') return 'EUR'
  if (code === 'CZK') return 'CZK'
  return 'USD'
}

// Symbol + native locale label shown in the menu. Picked so each option
// reads instantly even before the visitor has interacted with prices.
const SYMBOL: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  CZK: 'Kč',
}
const LABEL: Record<SupportedCurrency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  CZK: 'Česká koruna',
}

// 円 = "yen / round" → most-readable kanji shorthand for "money". We use it
// the same way the language switcher uses 言, so the two chips read as
// siblings rather than mismatched affordances.
function CurGlyph({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`font-jp text-hinomaru-ink/85 leading-none ${className}`}>
      円
    </span>
  )
}

type Variant = 'chip' | 'inline'

// Keep in lockstep with the `lang-pop-out` keyframe in styles.css — we
// share the same popover animation classes as `LanguageSwitcher` so the
// two chips feel identical to operate.
const CLOSE_MS = 180

export function CurrencySwitcher({
  className = '',
  variant = 'chip',
  align = 'end',
}: {
  className?: string
  variant?: Variant
  align?: 'start' | 'end'
}) {
  const { t } = useTranslation()
  const stored = useCurrencyPreference()
  const { currency: detectedCode } = usePremiumPrice()
  const resolved = asSupportedCurrency(detectedCode)
  const display = stored ?? resolved

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [rect, setRect] = useState<{ top: number; left: number; right: number } | null>(null)

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

  const handlePick = (choice: SupportedCurrency) => {
    if (stored === choice) {
      setOpen(false)
      return
    }
    setCurrencyPreference(choice)
    setOpen(false)
  }

  const isChoiceActive = (choice: SupportedCurrency) =>
    stored ? stored === choice : resolved === choice

  // Inline variant: mirror LanguageSwitcher's mobile drawer layout — list
  // of buttons in a two-column grid.
  if (variant === 'inline') {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center gap-3">
          <CurGlyph className="text-xl" />
          <span className="display-title text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
            {t('common.currency', { defaultValue: 'Currency' })}
          </span>
          <span
            aria-hidden
            className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
          />
        </div>
        <ul className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('common.currency', { defaultValue: 'Currency' })}>
          {SUPPORTED_CURRENCIES.map((choice) => {
            const isActive = isChoiceActive(choice)
            return (
              <li key={choice}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handlePick(choice)}
                  className={[
                    'group relative flex w-full items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left transition-[colors,transform] duration-200 active:scale-[0.98]',
                    isActive
                      ? 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,var(--paper-lift))]'
                      : 'border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_72%,var(--paper-lift))] hover:border-[var(--line-strong)]',
                  ].join(' ')}
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="font-jp text-base leading-none text-hinomaru-ink/80 w-7 text-center">
                      {SYMBOL[choice]}
                    </span>
                    <span className="display-title text-[0.9375rem] font-medium text-sumi truncate">
                      {LABEL[choice]}
                    </span>
                  </span>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-hinomaru-ink" strokeWidth={2.2} aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
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
        aria-label={t('common.currency', { defaultValue: 'Currency' })}
        className={[
          'lang-trigger group inline-flex h-9 items-center gap-2 rounded-md border bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] px-2.5 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40',
          open
            ? 'border-[var(--line-strong)] text-sumi'
            : 'border-[var(--line)] text-sumi-soft hover:text-sumi hover:border-[var(--line-strong)]',
        ].join(' ')}
      >
        <CurGlyph className="text-[15px]" />
        <span
          aria-hidden
          className="h-3 w-px bg-[var(--line)] group-hover:bg-[var(--line-strong)] transition-colors"
        />
        <span className="tabular-nums">{display}</span>
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
            ...(align === 'end' ? { right: rect.right } : { left: rect.left }),
          }}
          className="lang-pop z-[1000] w-56 overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]"
        >
          <div className="lang-pop-header flex items-center gap-2.5 px-3 pt-2.5 pb-2">
            <CurGlyph className="text-base" />
            <span className="font-jp text-[10px] tracking-[0.34em] text-nezumi uppercase">
              通 貨
            </span>
            <span
              aria-hidden
              className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] via-[var(--line)] to-transparent"
            />
          </div>

          <ul role="listbox" aria-label={t('common.currency', { defaultValue: 'Currency' })}>
            {SUPPORTED_CURRENCIES.map((choice, i) => {
              const isActive = isChoiceActive(choice)
              return (
                <li
                  key={choice}
                  role="option"
                  aria-selected={isActive}
                  className="lang-item relative"
                  style={{ ['--i' as string]: i }}
                >
                  <button
                    type="button"
                    onClick={() => handlePick(choice)}
                    className={[
                      'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-colors duration-[200ms]',
                      isActive
                        ? 'bg-[color-mix(in_oklab,var(--hinomaru)_8%,transparent)] text-sumi'
                        : 'text-sumi-soft hover:bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] hover:text-sumi',
                    ].join(' ')}
                  >
                    <span className="flex items-baseline gap-2.5 min-w-0">
                      <span className="font-jp text-base leading-none text-hinomaru-ink/80 w-7 text-center shrink-0">
                        {SYMBOL[choice]}
                      </span>
                      <span className="display-title text-[13px] text-sumi truncate">
                        {LABEL[choice]}
                      </span>
                    </span>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-hinomaru-ink" strokeWidth={2.2} aria-hidden />
                    )}
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
