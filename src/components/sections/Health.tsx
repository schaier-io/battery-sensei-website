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

function shape24hSeries(values: number[]): number[] {
  if (values.length === 0) return values

  const floor = 14
  const ramped = values.map((value, index) => value + index * 1.15)
  const first = ramped[0]
  const last = ramped[ramped.length - 1]
  const targetRise = 14
  const additionalRise = Math.max(0, targetRise - (last - first))
  const withTrend = additionalRise > 0
    ? ramped.map((value, index) => {
      const t = ramped.length > 1 ? index / (ramped.length - 1) : 0
      // Front-load a little, then accelerate late to keep the line
      // organic while making the upward glance more obvious.
      const eased = 0.2 * t + 0.8 * (t ** 1.35)
      return value + additionalRise * eased
    })
    : ramped
  return withTrend.map((value) => clamp01To100(Number(Math.max(floor, value).toFixed(1))))
}

function shape7dSeries(values: number[]): number[] {
  if (values.length === 0) return values
  const next = [...values]

  // Keep one long "charged and stable" window in 7d.
  const start = Math.max(1, Math.floor(next.length * 0.58))
  const end = Math.min(next.length - 2, start + 4)
  const plateauBase = Math.max(78, next[start])

  for (let i = start; i <= end; i += 1) {
    const drift = (i - start) * 0.8
    next[i] = clamp01To100(Number((plateauBase - drift).toFixed(1)))
  }

  // Blend edges so plateau reads as held, not hard-cut.
  if (start - 1 >= 0) next[start - 1] = clamp01To100(Number((((next[start - 1] * 0.45) + (next[start] * 0.55))).toFixed(1)))
  if (end + 1 < next.length) next[end + 1] = clamp01To100(Number((((next[end + 1] * 0.4) + (next[end] * 0.6))).toFixed(1)))

  return next
}

function buildLayeredSeries(
  length: number,
  cfg: {
    base: number
    primaryAmp: number
    secondaryAmp: number
    tertiaryAmp: number
    primaryCycles: number
    secondaryCycles: number
    tertiaryCycles: number
    phaseOffset: number
    dips: number[]
    peaks: number[]
    wobbleAmp: number
  },
): number[] {
  const points = Array.from({ length }, (_, i) => {
    const t = length > 1 ? i / (length - 1) : 0
    const layeredWave =
      cfg.base +
      Math.sin((t * Math.PI * 2 * cfg.primaryCycles) + cfg.phaseOffset) * cfg.primaryAmp +
      Math.sin((t * Math.PI * 2 * cfg.secondaryCycles) - cfg.phaseOffset * 0.6) * cfg.secondaryAmp +
      Math.sin((t * Math.PI * 2 * cfg.tertiaryCycles) + cfg.phaseOffset * 1.7) * cfg.tertiaryAmp
    const wobble = Math.sin((t * Math.PI * 2 * (cfg.secondaryCycles + 2.1)) + i * 0.41) * cfg.wobbleAmp
    return layeredWave + wobble
  })

  for (const idx of cfg.dips) {
    if (idx >= 0 && idx < points.length) points[idx] = 2 + (idx % 3) * 2
  }
  for (const idx of cfg.peaks) {
    if (idx >= 0 && idx < points.length) points[idx] = 96 - (idx % 2) * 2
  }

  // Keep broad trend neutral by re-centering mean after local events.
  const mean = points.reduce((sum, v) => sum + v, 0) / points.length
  const centered = points.map((v) => v - mean + cfg.base)
  return centered.map((v) => clamp01To100(Number(v.toFixed(1))))
}

const agingSeriesByRange: Record<AgingRange, number[]> = {
  // Simple + coherent: one dominant rhythm, minor wobble.
  '24h': shape24hSeries(buildLayeredSeries(12, {
    base: 56,
    primaryAmp: 9,
    secondaryAmp: 2.4,
    tertiaryAmp: 1.2,
    primaryCycles: 1.05,
    secondaryCycles: 2.0,
    tertiaryCycles: 3.2,
    phaseOffset: 0.32,
    dips: [],
    peaks: [2],
    wobbleAmp: 0.8,
  })),
  // Richer composite wave with mixed amplitudes + occasional extremes.
  '3d': buildLayeredSeries(18, {
    base: 56,
    primaryAmp: 16,
    secondaryAmp: 10,
    tertiaryAmp: 6,
    primaryCycles: 1.8,
    secondaryCycles: 4.2,
    tertiaryCycles: 7.1,
    phaseOffset: 0.85,
    dips: [5, 13],
    peaks: [2, 10, 16],
    wobbleAmp: 2.4,
  }),
  // Most complex window: layered frequencies, irregular cadence, rare extremes.
  '7d': shape7dSeries(buildLayeredSeries(29, {
    base: 57,
    primaryAmp: 18,
    secondaryAmp: 12,
    tertiaryAmp: 7,
    primaryCycles: 2.2,
    secondaryCycles: 5.6,
    tertiaryCycles: 9.3,
    phaseOffset: 1.1,
    dips: [4, 11, 21, 27],
    peaks: [1, 8, 24],
    wobbleAmp: 2.8,
  })),
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
 * Tiny thermal timeline proof for the "Heat throttling" card.
 * Uses three compact metrics + a small load/thermal bar so the
 * panel reads as observable behavior, not decorative chrome.
 */
function HeatMockup({ className = '' }: { className?: string }) {
  const now = 39
  const peak = 43
  const threshold = 44
  const pct = Math.min(100, (now / threshold) * 100)
  return (
    <div
      className={`heat-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3 ${className}`}
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          Thermal now
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <div className="min-w-0 rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="truncate uppercase tracking-[0.12em] text-nezumi">CPU</p>
          <p className="mt-0.5 truncate tabular-nums font-semibold text-sumi">{now}C</p>
        </div>
        <div className="min-w-0 rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="truncate uppercase tracking-[0.12em] text-nezumi">Peak</p>
          <p className="mt-0.5 truncate tabular-nums font-semibold text-sumi">{peak}C</p>
        </div>
        <div className="min-w-0 rounded-[6px] border border-[var(--line)]/70 px-2 py-1.5">
          <p className="truncate uppercase tracking-[0.12em] text-nezumi">Throttle</p>
          <p className="mt-0.5 truncate tabular-nums font-semibold text-sumi">{threshold}C</p>
        </div>
      </div>
      <div className="mt-2.5">
        <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, var(--hinomaru) 0%, color-mix(in oklab, var(--hinomaru) 64%, var(--nezumi)) 100%)',
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-nezumi">
          <span>Load window</span>
          <span className="tabular-nums text-sumi-soft">{pct.toFixed(0)}%</span>
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
                  }`}
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
