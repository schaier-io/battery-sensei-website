import { Sparkline } from '#/components/zen/Sparkline'

/**
 * A "journal page" — Sensei's personal history of one MacBook's battery.
 * Multiple entries across months, capacity sparkline, gentle stats.
 * Replaces the single Rescue Receipt to reframe Saga as personal-history,
 * not a single shareable card.
 */
export function BatteryJournal({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex flex-col gap-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_85%,white)] p-5 shadow-[0_18px_50px_-20px_rgba(28,26,23,0.45)] ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent 0 23px, rgba(28,26,23,0.05) 23px 24px)',
      }}
      aria-label="Battery Sensei — personal history"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-dashed border-[var(--line-strong)] pb-2">
        <span className="font-jp text-[10px] tracking-[0.3em] text-sumi-soft uppercase">
          個 人 史
        </span>
        <span className="text-[9px] tracking-wider text-nezumi">
          Since 30 Jan 2024
        </span>
      </div>

      {/* Lifetime stats row */}
      <div className="grid grid-cols-3 gap-2 -mx-1">
        <Stat label="Days" value="247" />
        <Stat label="Cycles" value="217" />
        <Stat label="Capacity" value="92%" />
      </div>

      {/* Capacity timeline */}
      <div className="-mx-1 mt-1">
        <p className="text-[9px] uppercase tracking-wider text-nezumi mb-1 px-1">
          Capacity timeline
        </p>
        <div className="text-sumi">
          <Sparkline
            values={[100, 99.4, 98.8, 98.0, 97.2, 96.4, 95.6, 94.7, 93.9, 93.2, 92.6, 92.3]}
            height={36}
          />
        </div>
      </div>

      {/* Recent entries */}
      <ul className="mt-1 space-y-1.5 text-[11px] text-sumi-soft">
        <Entry date="Mar 04" body="Rescued at 12% — plugged in just in time." mark="救" />
        <Entry date="Feb 18" body="Reached 200 cycles. Aging on schedule." />
        <Entry date="Jan 30" body="Personal best: 11h 23m on a single charge." mark="星" />
      </ul>

      {/* Footer */}
      <div className="mt-1 flex items-center justify-between border-t border-dashed border-[var(--line-strong)] pt-3">
        <div className="flex flex-col">
          <span className="font-jp text-[9px] tracking-widest text-sumi-soft uppercase">
            Sensei
          </span>
          <span className="display-title text-xs font-semibold text-sumi">
            Quietly watching.
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
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="relative flex flex-col items-start gap-1.5 overflow-hidden rounded-md bg-[var(--washi-soft)] px-3 py-2.5"
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
      <span className="display-title relative text-xl font-semibold leading-none text-sumi tabular-nums tracking-tight">
        {value}
      </span>
      <span className="relative text-[9px] font-semibold uppercase tracking-[0.18em] text-sumi-soft">
        {label}
      </span>
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
        <span className="font-jp text-[11px] text-hinomaru/80 leading-none pt-0.5">
          {mark}
        </span>
      )}
    </li>
  )
}
