import { useEffect, useRef, useState } from 'react'
import { MoonStar, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Web mockup of the macOS app's WarningOverlay (Surfaces/WarningOverlayManager.swift).
 * Mirrors the original layout — grab handle, hero glyph in a hinomaru-tinted disc,
 * title, drain bar, big percentage, message, snooze stepper, dismiss button.
 */
export function WarningOverlay({
  className = '',
  percent = 15,
  title,
}: {
  className?: string
  /** Current battery percentage shown — also drives the drain bar */
  percent?: number
  title?: string
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const resolvedTitle = title ?? t('mockups.warningOverlay.lowBattery')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true)
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const fraction = Math.max(0, Math.min(100, percent)) / 100

  return (
    <div
      ref={ref}
      data-revealed={revealed ? 'true' : 'false'}
      className={`warning-overlay relative isolate mx-auto w-full max-w-[460px] rounded-[28px] border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_92%,#fff)] px-7 pt-5 pb-6 text-center shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_28px_60px_-22px_rgba(28,26,23,0.30),0_8px_22px_-10px_rgba(28,26,23,0.18)] ${className}`}
    >
      {/* Grab handle — washi rule, like the Swift Capsule at the top */}
      <span
        aria-hidden
        className="mx-auto mb-5 block h-[3px] w-9 rounded-full bg-[color-mix(in_oklab,var(--sumi)_22%,transparent)]"
      />

      {/* Hero: battery glyph inside a soft hinomaru disc — washi-pink fill
          with a faint hinomaru aura and a hairline edge to read as a real
          inked disc rather than a flat circle. */}
      <div className="mb-4 flex justify-center">
        <div
          className="warning-overlay__disc relative grid h-[88px] w-[88px] place-items-center rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, #fbe3e0 0%, #f7d0cd 60%, #f1c1be 100%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -10px 18px -10px color-mix(in oklab, var(--hinomaru) 22%, transparent), 0 0 0 1px color-mix(in oklab, var(--hinomaru) 14%, transparent), 0 10px 24px -14px color-mix(in oklab, var(--hinomaru) 45%, transparent)',
          }}
        >
          {/* Soft outer aura */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--hinomaru) 14%, transparent) 0%, transparent 70%)',
              filter: 'blur(4px)',
              zIndex: -1,
            }}
          />
          <BatteryGlyph fraction={fraction} />
        </div>
      </div>

      <p className="display-title text-[1.625rem] font-semibold leading-tight tracking-[-0.01em] text-sumi">
        {resolvedTitle}
      </p>

      {/* Drain visualization — capsule track + hinomaru fill, eased on reveal */}
      <div className="mx-auto mt-5 h-[6px] w-[200px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--sumi)_10%,var(--washi-soft))]">
        <div
          className="h-full rounded-full bg-hinomaru transition-[width] duration-[1100ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: revealed ? `${fraction * 100}%` : '0%' }}
        />
      </div>

      <p className="display-title mt-5 text-[3.25rem] font-semibold leading-none tabular-nums tracking-[-0.02em] text-sumi">
        {percent}%
      </p>

      <p className="mx-auto mt-4 text-sm font-medium leading-relaxed text-sumi-soft">
        {t('mockups.warningOverlay.statusLine', { percent })}
      </p>

      {/* Action row */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] p-1 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]">
          <span className="px-1.5 text-sumi-soft" aria-hidden>
            <MoonStar className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
          <StepButton label={t('mockups.warningOverlay.snoozeDecrease')}>
            <Minus className="h-3.5 w-3.5" strokeWidth={2} />
          </StepButton>
          <button
            type="button"
            className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3 py-1.5 text-[13px] font-semibold text-sumi shadow-[0_1px_2px_rgba(28,26,23,0.06),0_1px_0_rgba(255,255,255,0.6)_inset] transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30"
          >
            <span className="text-sumi-soft">{t('mockups.warningOverlay.snooze')}</span>
            <span className="tabular-nums text-sumi">{t('mockups.warningOverlay.snoozeStep')}</span>
          </button>
          <StepButton label={t('mockups.warningOverlay.snoozeIncrease')}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </StepButton>
        </div>

        <button
          type="button"
          className="group/dismiss inline-flex items-center gap-2 rounded-xl bg-hinomaru px-4 py-2.5 text-sm font-semibold text-[#fff8eb] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_2px_4px_rgba(188,0,45,0.22),0_10px_22px_-10px_rgba(188,0,45,0.55)] transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
        >
          {t('mockups.warningOverlay.dismiss')}
          <kbd className="rounded-md bg-[color-mix(in_oklab,#fff8eb_24%,transparent)] px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-[#fff8eb]/95 ring-1 ring-inset ring-[#fff8eb]/30">
            Esc
          </kbd>
        </button>
      </div>
    </div>
  )
}

function StepButton({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-lg text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[color-mix(in_oklab,var(--sumi)_8%,transparent)] hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30"
    >
      {children}
    </button>
  )
}

function BatteryGlyph({ fraction }: { fraction: number }) {
  // Outlined horizontal battery — fill width tracks `fraction`. Tinted hinomaru.
  const inner = Math.max(2, fraction * 36)
  return (
    <svg
      viewBox="0 0 52 28"
      width="46"
      height="26"
      aria-hidden
      className="text-hinomaru"
    >
      <rect
        x="1.6"
        y="2.4"
        width="42.8"
        height="23.2"
        rx="5"
        ry="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <rect x="45.4" y="9.6" width="4.2" height="9" rx="1.4" fill="currentColor" />
      <rect
        x="4.2"
        y="5.4"
        width={inner}
        height="17.2"
        rx="3.2"
        fill="currentColor"
      />
    </svg>
  )
}
