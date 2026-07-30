import { useRef } from 'react'
import { Calendar, RefreshCcw, HeartPulse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sparkline } from '#/components/zen/Sparkline'
import { useCountUp } from '#/lib/use-count-up'

/**
 * A "journal page" — Sensei's personal history of one MacBook's battery.
 * Multiple entries across months, charge sparkline, gentle stats.
 * Replaces the single Rescue Receipt to reframe Saga as personal-history,
 * not a single shareable card.
 */
export function BatteryJournal({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div
      className={`relative flex flex-col gap-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_85%,white)] p-5 shadow-[0_18px_50px_-20px_rgba(28,26,23,0.45)] ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent 0 23px, rgba(28,26,23,0.05) 23px 24px)',
      }}
      aria-label={t('mockups.batteryJournal.ariaLabel')}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-dashed border-[var(--line-strong)] pb-2">
        <span className="font-jp text-[10px] tracking-[0.3em] text-sumi-soft uppercase">
          個 人 史
        </span>
        <span className="text-[9px] tracking-wider text-nezumi">
          {t('mockups.batteryJournal.since', { date: t('mockups.batteryJournal.sinceDate') })}
        </span>
      </div>

      {/* Lifetime stats row */}
      <div className="grid grid-cols-3 gap-2 -mx-1">
        <Stat icon={Calendar} label={t('mockups.batteryJournal.days')} to={247} />
        <Stat icon={RefreshCcw} label={t('mockups.batteryJournal.cycles')} to={217} />
        <Stat icon={HeartPulse} label={t('mockups.batteryJournal.capacity')} to={92} suffix="%" />
      </div>

      {/* Battery charge timeline */}
      <div className="-mx-1 mt-1">
        <p className="text-[9px] uppercase tracking-wider text-nezumi mb-1 px-1">
          {t('mockups.batteryJournal.timelineLabel')}
        </p>
        <div className="text-sumi">
          <Sparkline
            values={[88, 84, 79, 74, 70, 67, 64, 66, 71, 76, 81, 85]}
            height={36}
          />
        </div>
      </div>

      {/* Recent entries */}
      <ul className="mt-1 space-y-1.5 text-[11px] text-sumi-soft">
        <Entry
          date={t('mockups.batteryJournal.entries.0.date')}
          body={t('mockups.batteryJournal.entries.0.body')}
          mark="救"
        />
        <Entry
          date={t('mockups.batteryJournal.entries.1.date')}
          body={t('mockups.batteryJournal.entries.1.body')}
        />
        <Entry
          date={t('mockups.batteryJournal.entries.2.date')}
          body={t('mockups.batteryJournal.entries.2.body')}
          mark="星"
        />
      </ul>

      {/* Footer */}
      <div className="mt-1 flex items-center justify-between border-t border-dashed border-[var(--line-strong)] pt-3">
        <div className="flex flex-col">
          <span className="font-jp text-[9px] tracking-widest text-sumi-soft uppercase">
            Sensei
          </span>
          <span className="display-title text-xs font-semibold text-sumi">
            {t('mockups.batteryJournal.footerTagline')}
          </span>
        </div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-hinomaru font-jp text-base font-bold text-[#fff8eb] -rotate-3 shadow-sm"
          style={{
            boxShadow:
              'inset 0 0 0 1.5px rgba(255,248,235,0.18), 0 1px 0 rgba(0,0,0,0.04)',
          }}
        >
          史
        </span>
      </div>
    </div>
  )
}

/**
 * Stat tile — matches the app's `WrappedStatTile` (SagaSurface.swift):
 * a large numeric glyph in Fraunces over a small kerned label, on a washi
 * surface with the InkStroke double-border + a fiber-texture overlay.
 * Counts up from 0 → `to` on the first time the tile scrolls into view
 * (see `useCountUp`), so the number reads as ink saturating into shape
 * rather than a static figure. `prefers-reduced-motion` lands the value
 * instantly.
 */
function Stat({
  icon: Icon,
  label,
  to,
  suffix = '',
}: {
  icon: LucideIcon
  label: string
  to: number
  suffix?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const value = useCountUp({ to, ref, durationMs: 1400 })
  const done = value === to
  return (
    <div
      ref={ref}
      data-done={done ? 'true' : 'false'}
      className="stat-tile group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-md bg-[var(--washi-soft)] px-3 py-2.5"
      style={{
        boxShadow:
          // InkStroke: offset secondary stroke beneath the primary border.
          '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.32] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='2.4' numOctaves='2' seed='9'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.28  0 0 0 0.12 0'/></filter><rect width='100%25' height='100%25' filter='url(%23c)'/></svg>\")",
        }}
      />
      <Icon
        className="relative h-3 w-3 text-hinomaru-ink/70 transition-colors duration-[260ms] group-data-[done=true]:text-hinomaru-ink"
        strokeWidth={1.8}
        aria-hidden
      />
      <span className="display-title relative text-xl font-semibold leading-none text-sumi tabular-nums tracking-tight">
        {value}
        {suffix}
      </span>
      <span className="relative text-[9px] font-semibold uppercase tracking-[0.18em] text-sumi-soft">
        {label}
      </span>
      {/* Hairline ink-stroke that draws across the bottom of the tile
          the moment the count-up lands. Quiet "ink set" beat that
          confirms the number is the final figure. */}
      <span
        aria-hidden
        className="stat-tile__rule pointer-events-none absolute left-0 right-0 bottom-0 h-px origin-left bg-gradient-to-r from-transparent via-hinomaru/60 to-transparent"
      />
    </div>
  )
}

function Entry({
  date,
  body,
  mark,
}: {
  date: string
  body: string
  mark?: string
}) {
  return (
    <li className="flex items-start gap-2.5 leading-snug">
      <span className="font-jp text-[9px] tracking-wider text-nezumi pt-0.5 shrink-0 w-12">
        {date}
      </span>
      <span className="flex-1 text-sumi-soft">{body}</span>
      {mark && (
        <span className="font-jp text-[11px] text-hinomaru-ink/80 leading-none pt-0.5">
          {mark}
        </span>
      )}
    </li>
  )
}
