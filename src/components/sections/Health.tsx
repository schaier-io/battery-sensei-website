import { useEffect, useState } from 'react'
import { Activity, Thermometer, Repeat, Zap, ShieldCheck, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { Sparkline } from '#/components/zen/Sparkline'

/**
 * Build compact, range-aware start label for the aging sparkline.
 * Keeps quiet visual tone while making active window explicit:
 * "2:14 PM", "May 25", "May 21".
 *
 * Returns empty string during SSR + first client render so caller can
 * keep using its static i18n placeholder until hydration completes.
 */
function useAgingStartLabel(range: AgingRange, locale?: string): string {
  const [text, setText] = useState<string>('')
  useEffect(() => {
    const hours = agingRangeHoursAgo[range]
    const d = new Date(Date.now() - hours * 60 * 60 * 1000)
    try {
      const dateTimeOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      }
      const labelByRange: Record<AgingRange, string> = {
        '24h': new Intl.DateTimeFormat(locale || undefined, dateTimeOptions).format(d),
        '3d': new Intl.DateTimeFormat(locale || undefined, dateOptions).format(d),
        '7d': new Intl.DateTimeFormat(locale || undefined, dateOptions).format(d),
      }
      setText(labelByRange[range])
    } catch {
      // Fallback for environments where Intl can't resolve the locale
      // — the static i18n placeholder will continue to be used.
      const fallbackByRange: Record<AgingRange, string> = {
        '24h': d.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        '3d': d.toLocaleDateString(),
        '7d': d.toLocaleDateString(),
      }
      setText(fallbackByRange[range])
    }
  }, [range, locale])
  return text
}

/**
 * Build compact, range-aware end label for the aging sparkline footer.
 * - 24h: current date + time for precise current endpoint context.
 * - 3d/7d: date-style current endpoint for date context.
 *
 * Returns empty string during SSR + first client render so caller can
 * keep using its static i18n placeholder until hydration completes.
 */
function useAgingEndLabel(range: AgingRange, locale?: string): string {
  const [text, setText] = useState<string>('')
  useEffect(() => {
    const d = new Date()
    try {
      const dateTimeOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      }
      const labelByRange: Record<AgingRange, string> = {
        '24h': new Intl.DateTimeFormat(locale || undefined, dateTimeOptions).format(d),
        '3d': new Intl.DateTimeFormat(locale || undefined, dateOptions).format(d),
        '7d': new Intl.DateTimeFormat(locale || undefined, dateOptions).format(d),
      }
      setText(labelByRange[range])
    } catch {
      const fallbackByRange: Record<AgingRange, string> = {
        '24h': d.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        '3d': d.toLocaleDateString(),
        '7d': d.toLocaleDateString(),
      }
      setText(fallbackByRange[range])
    }
  }, [range, locale])
  return text
}

type AgingRange = '24h' | '3d' | '7d'

const clamp01To100 = (value: number): number => Math.max(0, Math.min(100, value))

// ── Battery history signal ─────────────────────────────────────────
// One generated curve, shown over three time frames. 24h, 3d and 7d
// are literal trailing slices of a single master series — the 24h view
// IS the last day of the 3d view, which IS the last three days of the
// 7d view. Same points, same vertical scale, so the shared right-hand
// region is pixel-identical across ranges: switching tab just slides
// more history in from the left while "now" stays put on the right.

// One ~24h "charged to full and held" plateau, pinned flat at 100%,
// centred ~4 days back (a 7-day-view feature). A raised-cosine mask
// gives it a dead-flat day with smooth ramps in/out.
const FULL_CHARGE = { center: 96, flatHalf: 12, ramp: 12 }

/** 0→1 weight for the full-charge hold: 1 across the flat day, cosine
 *  ramps on each side, 0 elsewhere. */
function fullChargeHold(hoursAgo: number): number {
  const d = Math.abs(hoursAgo - FULL_CHARGE.center)
  if (d <= FULL_CHARGE.flatHalf) return 1
  if (d <= FULL_CHARGE.flatHalf + FULL_CHARGE.ramp) {
    return 0.5 * (1 + Math.cos(((d - FULL_CHARGE.flatHalf) / FULL_CHARGE.ramp) * Math.PI))
  }
  return 0
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Asymmetric triangle in [-1, 1]: rises (charge) over `up` of the cycle,
 * falls (discharge) over the rest. Smaller `up` ⇒ a steep charge + gentle
 * discharge; larger `up` ⇒ the reverse. The straight ramps are what give
 * the line its "real telemetry" look once blended into the daily rhythm.
 */
function rampWave(phase01: number, up: number): number {
  const p = phase01 - Math.floor(phase01)
  const u = Math.min(0.82, Math.max(0.18, up))
  return p < u ? -1 + 2 * (p / u) : 1 - 2 * ((p - u) / (1 - u))
}

/**
 * Battery percentage `hoursAgo` in the past (0 = now). One pure,
 * deterministic generator (no Date/random) feeds every range, so the
 * series stay identical across SSR + hydration and the three tabs are
 * guaranteed to be the same curve at different zoom levels.
 *
 * Two layers. The organic curve — a daily charge/discharge rhythm
 * ("Tagesrhythmus") plus slower, incommensurate sines (incl. a
 * very-low-frequency swell) that make each day crest and dip differently
 * ("ungewöhnliche Einbrüche"). The daily term is a sine blended toward a
 * skewed triangle, so the line runs in fairly straight ramps; the skew
 * drifts over a few days, so some days charge steeply and discharge
 * gently while others do the reverse — a mix of steep and shallow
 * slopes. Amplitudes budget to under 100% so this layer never clamps.
 * Over it, one full-charge hold blends to exactly 100% for ~a day. The
 * daily phase keeps the most recent stretch on an upswing, so "now"
 * trends upward.
 */
function batteryAt(hoursAgo: number): number {
  const h = hoursAgo
  const dayPhase = (h / 24) * Math.PI * 2 + 2.3
  // Skew drifts over ~3.4 days → varies charge vs. discharge steepness.
  const skew = 0.5 + 0.3 * Math.sin((h / 82) * Math.PI * 2 + 0.6)
  // 70% straight ramp, 30% sine (the ramp's peak is realigned to the
  // sine's so the blend stays phase-coherent as the skew drifts).
  const daily = lerp(
    Math.sin(dayPhase),
    rampWave(dayPhase / (Math.PI * 2) - 0.25 + skew, skew),
    0.7,
  )
  const rhythm =
    41 +
    daily * 25.7 +                                  // dominant daily rhythm, rising into "now"
    Math.sin((h / 12) * Math.PI * 1.7 - 3.4) * 0.22 +  // 12h texture — morning + evening use
    Math.sin((h / 19) * Math.PI * 2 + 1.0) * 6.3 +  // slow multi-day swell
    Math.sin((h / 20) * Math.PI * 1.2 + 2.0) * 2.9   // ~1.7d beat — day-to-day irregularity
  // Lay the full-charge hold over the rhythm: blend to exactly 100%
  // across the ~1-day window (this also flattens the ripple there, so
  // the hold reads as a clean line rather than a clamped sawtooth).
  const hold = fullChargeHold(h)
  const value = rhythm * (1 - hold) + 92 * hold
  // Clamp to a real battery range — never below 0% or above 100%.
  return clamp01To100(Number(value.toFixed(1)))
}

// Master recording: 7 days at one sample per 2h, oldest (left) →
// newest (right). The shorter ranges are exact trailing slices of it.
const AGING_HOURS_PER_POINT = 2
const masterAgingSeries: number[] = Array.from(
  { length: 168 / AGING_HOURS_PER_POINT + 1 },
  (_, i) => batteryAt(168 - i * AGING_HOURS_PER_POINT),
)

const agingSeriesByRange: Record<AgingRange, number[]> = {
  '24h': masterAgingSeries.slice(-(24 / AGING_HOURS_PER_POINT + 1)), // last 13 pts
  '3d': masterAgingSeries.slice(-(72 / AGING_HOURS_PER_POINT + 1)),  // last 37 pts
  '7d': masterAgingSeries,                                           // all 85 pts
}

// Shared Y domain so the overlapping right-hand region renders at the
// same height in every range — the visual proof that it's one curve.
const agingDomain = {
  min: Math.min(...masterAgingSeries),
  max: Math.max(...masterAgingSeries),
}

const agingRangeHoursAgo: Record<AgingRange, number> = {
  '24h': 24,
  '3d': 72,
  '7d': 168,
}

const agingRanges: AgingRange[] = ['24h', '3d', '7d']

type Cell = {
  key: string
  kanji: string
  icon: typeof Activity
  span?: string
  feature?: boolean
}

const cells: Cell[] = [
  { key: 'aging',     kanji: '時', icon: Activity,     span: 'lg:col-span-2', feature: true },
  { key: 'heat',      kanji: '熱', icon: Thermometer },
  { key: 'languages', kanji: '力', icon: BarChart3 },
  { key: 'watts',     kanji: '電', icon: Zap,          span: 'lg:col-span-2' },
  // `languages` key kept for i18n stability; cell now surfaces the
  // per-app battery drain ledger (kanji 力 "power") — same surface,
  // sharper differentiator vs. competitors that only show a global %.
  { key: 'cycles',    kanji: '輪', icon: Repeat,       span: 'lg:col-span-2' },
  // Privacy beats the section closed. Placing it LAST gives the
  // section a clean closing line ("your data is yours") instead of
  // tucking the trust beat into the middle of the bento.
  { key: 'privacy',   kanji: '守', icon: ShieldCheck,  span: 'lg:col-span-4' },
]

/**
 * Compact mockup of how Sensei reports cycle count. Redesigned with a
 * tighter ledger feel: a tiny tracked kicker, the big figure paired
 * with a denominator + percent, a hairline track that carries a
 * `↑ today` pin at the current position, and a plateau callout. Sits
 * BELOW the title + body so it reads as visual proof of the body
 * quote ("Numbers a human would say") rather than chrome at the top.
 */
function CycleMockup({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const CYCLES = 217
  const DESIGN_LIFE = 1000
  const MONTHS = 14
  const pct = Math.min(100, (CYCLES / DESIGN_LIFE) * 100)
  // i18n unit string can start with a percent-sign + space (e.g. `% used`),
  // start with a non-breaking space, or be locale-specific. Render the
  // percent figure + unit as one piece via direct concatenation so the
  // tabular-nums + nezumi tint stay consistent across locales.
  const unit = t('health.mockups.cycles.unit')
  return (
    <div
      className={`cycle-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3 ${className}`}
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          {t('health.mockups.cycles.kicker')}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-sumi-soft">
          {pct.toFixed(1)}<span className="text-nezumi/70">{unit.replace(/^%\s*/, ' ')}</span>
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="display-title text-[1.625rem] font-semibold tabular-nums leading-none text-sumi tracking-tight">
          {CYCLES}
        </span>
        <span className="text-[11px] font-medium text-sumi-soft tabular-nums">
          / {DESIGN_LIFE.toLocaleString()}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-nezumi">
          {t('health.mockups.cycles.denomLabel')}
        </span>
      </div>
      <div className="mt-2.5 relative">
        <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="cycle-mockup__fill h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, var(--hinomaru) 0%, color-mix(in oklab, var(--hinomaru) 60%, var(--nezumi)) 100%)',
            }}
          />
        </div>
        {/* You-are-here pin — small hinomaru tick + dot that sits at
            the current position, anchored to the bar's right edge of
            its filled segment. */}
        <span
          aria-hidden
          className="cycle-mockup__pin absolute -top-[3px] flex flex-col items-center"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          <span className="block h-[9px] w-[1.5px] bg-hinomaru rounded-full" />
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] tracking-wider text-nezumi">
        <span className="tabular-nums">0</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-sumi-soft">
          <span className="h-1 w-1 rounded-full bg-hinomaru" aria-hidden />
          {t('health.mockups.cycles.footerLabel', { months: MONTHS })}
        </span>
        <span className="tabular-nums">1k</span>
      </div>
    </div>
  )
}

/**
 * Per-app battery drain ledger — mirrors the energy panel in the
 * Saga surface but compressed to four rows so it fits the bento
 * cell. Each row: app icon-style glyph, app name, a hinomaru
 * hairline bar mapping the app's share of last-hour drain, and the
 * actual `% / hr` figure on the right. Bars animate on reveal.
 *
 * The rows are static demo data — chosen to look plausible and
 * narratively useful: a heavy browser + chat at the top, smaller
 * dev + media at the bottom. Replace with live data once the
 * marketing site is wired to the app's API.
 */
function AppDrainMockup({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const rows: { name: string; pct: number; dot: string }[] = [
    { name: 'Chrome',  pct: 14, dot: '#4a90e2' },
    { name: 'Slack',   pct:  8, dot: '#611f69' },
    { name: 'Xcode',   pct:  6, dot: '#1d6bd1' },
    { name: 'Spotify', pct:  3, dot: '#1db954' },
  ]
  // Bars scale to the largest row so the visual is comparative, not
  // raw 0-100. Reads "Chrome is the heaviest by this much" at a glance.
  const max = Math.max(...rows.map((r) => r.pct))
  return (
    <div
      className={`app-drain-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3 ${className}`}
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          {t('health.mockups.drain.kicker')}
        </span>
        <span className="text-[10px] font-medium text-sumi-soft tabular-nums">
          {t('health.mockups.drain.unit')}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className="grid grid-cols-[14px_1fr_auto] items-center gap-2.5"
            style={{ ['--app-row-delay' as string]: `${120 + i * 100}ms` }}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-[3px]"
              style={{ background: r.dot, boxShadow: '0 0 0 1px rgba(28,26,23,0.08) inset' }}
            />
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] font-medium text-sumi truncate">{r.name}</span>
              <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                <span
                  className="app-drain-mockup__fill absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${(r.pct / max) * 100}%`,
                    background:
                      'linear-gradient(90deg, var(--hinomaru) 0%, color-mix(in oklab, var(--hinomaru) 60%, var(--nezumi)) 100%)',
                  }}
                />
              </span>
            </span>
            <span className="text-[11px] font-medium tabular-nums text-sumi-soft">
              {r.pct}<span className="text-nezumi/70">%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Charge-pause proof for the "Charging that yields to heat" card.
 * Mirrors the app's "Pause charging when hot" control: the user picks
 * a threshold (Off / 35 / 40 / 45°C), and once the battery crosses it
 * Sensei holds charging until it cools to threshold − 3°C (hysteresis).
 * Numbers below use the default 40°C limit, hot at 42°C → paused.
 */
function HeatMockup({ className = '' }: { className?: string }) {
  const temp = 42
  const limit = 40 // chosen threshold (Off / 35 / 40 / 45)
  const resumeAt = limit - 3 // hysteresis: resume once cooled this far
  // Map temp onto a fixed 30–48°C scale so the threshold tick and the
  // "over the line" fill stay proportional regardless of the reading.
  const scaleMin = 30
  const scaleMax = 48
  const toPct = (v: number) =>
    Math.min(100, Math.max(0, ((v - scaleMin) / (scaleMax - scaleMin)) * 100))
  const tempPct = toPct(temp)
  const limitPct = toPct(limit)
  const over = temp - limit
  return (
    <div
      className={`heat-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3 ${className}`}
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          Charge guard
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-hinomaru"
          style={{
            boxShadow: '0 0 0 1px color-mix(in oklab, var(--hinomaru) 38%, transparent)',
          }}
        >
          Holding
        </span>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2 text-[10px]">
        <div className="min-w-0 rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="truncate uppercase tracking-[0.12em] text-nezumi">Battery</p>
          <p className="mt-0.5 truncate tabular-nums font-semibold text-sumi">{temp}C</p>
        </div>
        <div className="min-w-0 rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="truncate uppercase tracking-[0.12em] text-nezumi">Limit</p>
          <p className="mt-0.5 truncate tabular-nums font-semibold text-sumi">{limit}C</p>
        </div>
        <div className="min-w-0 rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="truncate uppercase tracking-[0.12em] text-nezumi">Charge</p>
          <p className="mt-0.5 truncate font-semibold text-hinomaru">Paused</p>
        </div>
      </div>
      <div className="mt-2.5">
        <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${tempPct}%`,
              background:
                'linear-gradient(90deg, color-mix(in oklab, var(--hinomaru) 64%, var(--nezumi)) 0%, var(--hinomaru) 100%)',
            }}
          />
          {/* Threshold tick — where Sensei eases off the charge. */}
          <span
            className="absolute top-1/2 h-[7px] w-px -translate-y-1/2 bg-sumi"
            style={{ left: `${limitPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-nezumi">
          <span className="tabular-nums">Resumes at {resumeAt}C</span>
          <span className="tabular-nums text-hinomaru">+{over}C over</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact power-flow ledger for "Live watts in, watts out."
 * A quick two-side split (in/out) plus net indicator mirrors
 * the app's data-minded style while staying lightweight.
 */
function WattsMockup({ className = '' }: { className?: string }) {
  const wattsIn = 61.3
  const wattsOut = 28.7
  const net = wattsIn - wattsOut
  const total = wattsIn + wattsOut
  const inPct = total > 0 ? (wattsIn / total) * 100 : 0
  const outPct = total > 0 ? (wattsOut / total) * 100 : 0
  return (
    <div
      className={`watts-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3 ${className}`}
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          Power flow
        </span>
        <span className="text-[10px] font-medium tabular-nums text-sumi-soft">
          Real time
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-nezumi">In</p>
          <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-sumi">{wattsIn.toFixed(1)}W</p>
        </div>
        <div className="rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-nezumi">Out</p>
          <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-sumi">{wattsOut.toFixed(1)}W</p>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-7 text-[9px] uppercase tracking-[0.12em] text-nezumi">In</span>
          <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${inPct}%`,
                background:
                  'linear-gradient(90deg, var(--hinomaru) 0%, color-mix(in oklab, var(--hinomaru) 64%, var(--nezumi)) 100%)',
              }}
            />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-7 text-[9px] uppercase tracking-[0.12em] text-nezumi">Out</span>
          <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-sumi/55"
              style={{ width: `${outPct}%` }}
            />
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[10px] uppercase tracking-[0.12em]">
        <span className="text-nezumi">Net</span>
        <span className="tabular-nums font-semibold text-sumi">{net > 0 ? '+' : ''}{net.toFixed(1)}W</span>
      </div>
    </div>
  )
}

/**
 * Privacy / data-residency proof. Earlier rev used four identical
 * 100% bars per row — decorative, no information, and the "this Mac"
 * tag repeated four times diluted the claim. This version uses two
 * marketing-psych levers instead:
 *
 *  1. Containment metaphor: a single dashed boundary labelled "Stays
 *     on this Mac" wraps all four data categories, so the boundary
 *     IS the message and the label fires once instead of four times.
 *  2. Zero anchor + contrast: a counter row underneath shows three
 *     concrete zeros (uploads / accounts / trackers). Specific
 *     numbers beat abstract claims; zero beside the populated box
 *     makes the absence vivid.
 */
function PrivacyMockup() {
  const { t } = useTranslation()
  const rows = [
    { labelKey: 'history' },
    { labelKey: 'cycles' },
    { labelKey: 'drain' },
    { labelKey: 'calendar' },
  ] as const
  return (
    <div
      className="app-drain-mockup relative mt-2.5 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-2.5 lg:mt-2 lg:py-2"
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <span className="absolute -top-2 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--hinomaru)_24%,transparent)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-hinomaru">
        <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
        Stays 100% on your Mac
      </span>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          {t('health.mockups.privacy.kicker')}
        </span>
      </div>

      <div className="mt-2 rounded-[8px] px-2 py-1.5 lg:py-1">
        <ul className="mt-1.5 space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={r.labelKey}
              className="flex items-center justify-between gap-2 min-w-0"
              style={{ ['--app-row-delay' as string]: `${120 + i * 80}ms` }}
            >
              <span className="text-[11.5px] font-medium text-sumi truncate">
                {t(`health.mockups.privacy.rows.${r.labelKey}`)}
              </span>
              <span className="inline-flex items-center gap-1.5 shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-sumi-soft">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[color-mix(in_oklab,var(--hinomaru)_14%,#fff)] text-hinomaru">
                  <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.3} aria-hidden />
                </span>
                This Mac
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Health() {
  const { t, i18n } = useTranslation()
  const [agingRange, setAgingRange] = useState<AgingRange>('24h')
  const agingPanelId = 'health-aging-panel'
  // Range-aware wall-clock label for the left footer under sparkline.
  // It updates with the selected tab and keeps temporal context clear.
  const agingStartLabel = useAgingStartLabel(agingRange, i18n.language)
  const agingEndLabel = useAgingEndLabel(agingRange, i18n.language)
  return (
    <section id="health" className="zen-section mx-auto max-w-6xl px-6">
      <div className="mb-16 flex flex-col items-center text-center">
        <Hanko kanji="健" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          {t('health.kicker')}
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="section-heading text-sumi max-w-2xl"
        >
          {t('health.heading')}
          <span className="block italic text-sumi-soft font-normal">
            {t('health.headingItalic')}
          </span>
        </Reveal>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(11rem,_auto)]">
        {cells.map(({ key, kanji, icon: Icon, span, feature }, i) => {
          const stretchRowCard =
            key === 'heat' || key === 'languages' || key === 'watts' || key === 'cycles'
          const cardBody = (
            <div
              className={`paper-card ${key === 'privacy' ? 'lg:h-auto' : 'h-full'} flex flex-col ${
                feature ? 'p-5 gap-3.5 sm:p-6 sm:gap-4' : key === 'privacy' ? 'p-4 pt-3 lg:pt-2.5 gap-2' : 'p-4 gap-2.5'
              }`}
            >
              <div className="flex items-start justify-between">
                <Icon
                  className={`text-sumi ${feature ? 'h-7 w-7' : 'h-5 w-5'}`}
                  strokeWidth={1.5}
                />
                <span
                  className={`kanji-accent font-jp leading-none text-hinomaru/80 ${
                    feature ? 'text-4xl' : 'text-xl'
                  }`}
                >
                  {kanji}
                </span>
              </div>
              {feature && (
                <div className="-mx-1 mt-2 text-sumi">
                  <div className="mb-2 flex items-center justify-end px-2">
                    <div
                      className="relative z-[2] inline-flex items-center rounded-full border border-[var(--line)]/80 bg-[color-mix(in_oklab,var(--washi)_74%,#fff)] p-0.5 pointer-events-auto"
                      role="tablist"
                      aria-label="Battery trend range"
                    >
                      {agingRanges.map((range) => {
                        const selected = agingRange === range
                        return (
                          <button
                            key={range}
                            type="button"
                            role="tab"
                            id={`health-aging-tab-${range}`}
                            aria-selected={selected}
                            aria-controls={agingPanelId}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => setAgingRange(range)}
                            className={`touch-manipulation rounded-full px-2.5 py-1 text-[10px] font-medium tabular-nums tracking-wide transition-colors ${
                              selected
                                ? 'bg-sumi text-washi shadow-[0_1px_1px_rgba(0,0,0,0.12)]'
                                : 'text-sumi-soft hover:text-sumi'
                            }`}
                          >
                            {range}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div
                    id={agingPanelId}
                    role="tabpanel"
                    aria-labelledby={`health-aging-tab-${agingRange}`}
                    className="relative z-[1]"
                  >
                    <Sparkline
                      key={agingRange}
                      values={agingSeriesByRange[agingRange]}
                      min={agingDomain.min}
                      max={agingDomain.max}
                      height={124}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-nezumi">
                    {/* Wall-clock start of selected range — fall back to the static
                        i18n placeholder during SSR + the first
                        client render so the layout doesn't reflow
                        when the effect lands. */}
                    <span className="tabular-nums">
                      {agingStartLabel || t('health.cells.aging.timeStart')}
                    </span>
                    <span className="tabular-nums text-sumi font-medium">
                      {agingEndLabel || t('health.cells.aging.lifetime')}
                    </span>
                  </div>
                </div>
              )}
              <div
                className={
                  feature ? 'mt-auto' : stretchRowCard ? 'flex min-h-0 flex-1 flex-col' : ''
                }
              >
                <h3
                  className={`display-title font-medium text-sumi ${
                    feature ? 'text-[1.625rem]' : 'text-[1.0625rem]'
                  }`}
                >
                  {t(`health.cells.${key}.title`)}
                </h3>
                <p
                  className={`leading-[1.55] text-sumi-soft ${
                    feature ? 'mt-2 text-[1rem]' : 'mt-1.5 text-[0.9375rem]'
                  } ${key === 'heat' ? 'mb-3' : ''}`}
                >
                  {t(`health.cells.${key}.body`)}
                </p>
                {/* Per-cell mini-mockups — below title + body; paired-row
                    cards pin mockup to the bottom when the grid stretches. */}
                {stretchRowCard && key === 'cycles' && (
                  <div className="mt-3 mt-auto shrink-0">
                    <CycleMockup className="!mt-0" />
                  </div>
                )}
                {stretchRowCard && key === 'heat' && (
                  <div className="mt-3 mt-auto shrink-0">
                    <HeatMockup className="!mt-0 min-h-[10.75rem] lg:min-h-[10.25rem]" />
                  </div>
                )}
                {stretchRowCard && key === 'watts' && (
                  <div className="mt-3 mt-auto shrink-0">
                    <WattsMockup className="!mt-0" />
                  </div>
                )}
                {stretchRowCard && key === 'languages' && (
                  <div className="mt-3 mt-auto shrink-0">
                    <AppDrainMockup className="!mt-0 min-h-[10.75rem] lg:min-h-[10.25rem]" />
                  </div>
                )}
              </div>
              {key === 'privacy' && <PrivacyMockup />}
            </div>
          )
          return (
          <Reveal
            key={key}
            delay={(i % 4) * 80}
            className={`${span ?? ''} ${key === 'privacy' ? 'lg:self-start lg:-mt-2' : 'h-full'}`}
          >
            {feature ? (
              cardBody
            ) : (
              <TiltCard rotateAmplitude={6} scaleOnHover={1.02}>
                {cardBody}
              </TiltCard>
            )}
          </Reveal>
        )})}
      </div>
    </section>
  )
}
