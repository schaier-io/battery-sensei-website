import { useEffect, useState } from 'react'
import { Activity, Thermometer, Repeat, Zap, ShieldCheck, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { Sparkline } from '#/components/zen/Sparkline'

/**
 * Render the user's wall-clock time `hours` ago, formatted in the
 * active locale (e.g. "12:42" / "12:42 PM" / "12時42分"). Returns
 * an empty string during SSR + the first client render — the caller
 * is expected to fall back to a quiet i18n placeholder ("2h ago")
 * until the effect runs so the layout doesn't reflow.
 */
function useWallClockHoursAgo(hours: number, locale?: string): string {
  const [text, setText] = useState<string>('')
  useEffect(() => {
    const d = new Date(Date.now() - hours * 60 * 60 * 1000)
    try {
      const fmt = new Intl.DateTimeFormat(locale || undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
      setText(fmt.format(d))
    } catch {
      // Fallback for environments where Intl can't resolve the locale
      // — the static i18n placeholder will continue to be used.
      setText(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      )
    }
  }, [hours, locale])
  return text
}

const capacitySeries = [100, 99.6, 99.1, 98.5, 97.8, 97.0, 96.3, 95.6, 94.8, 94.1, 93.5, 93.0, 92.6, 92.3]

type Cell = {
  key: string
  kanji: string
  icon: typeof Activity
  span?: string
  feature?: boolean
}

const cells: Cell[] = [
  { key: 'aging',     kanji: '時', icon: Activity,     span: 'lg:col-span-2 lg:row-span-2', feature: true },
  { key: 'cycles',    kanji: '輪', icon: Repeat },
  { key: 'heat',      kanji: '熱', icon: Thermometer },
  { key: 'watts',     kanji: '電', icon: Zap,          span: 'lg:col-span-2' },
  // `languages` key kept for i18n stability; cell now surfaces the
  // per-app battery drain ledger (kanji 力 "power") — same surface,
  // sharper differentiator vs. competitors that only show a global %.
  { key: 'languages', kanji: '力', icon: BarChart3,    span: 'lg:col-span-2' },
  // Privacy beats the section closed. Placing it LAST gives the
  // section a clean closing line ("your data is yours") instead of
  // tucking the trust beat into the middle of the bento.
  { key: 'privacy',   kanji: '守', icon: ShieldCheck,  span: 'lg:col-span-2' },
]

/**
 * Compact mockup of how Sensei reports cycle count. Redesigned with a
 * tighter ledger feel: a tiny tracked kicker, the big figure paired
 * with a denominator + percent, a hairline track that carries a
 * `↑ today` pin at the current position, and a plateau callout. Sits
 * BELOW the title + body so it reads as visual proof of the body
 * quote ("Numbers a human would say") rather than chrome at the top.
 */
function CycleMockup() {
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
      className="cycle-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3"
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
function AppDrainMockup() {
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
      className="app-drain-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3"
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
 * Privacy / data-residency ledger. Mirrors `AppDrainMockup`'s row +
 * bar pattern so the privacy cell reads as a sibling of the per-app
 * drain cell, not a one-off.
 *
 * Four concrete data categories, each with a full hinomaru bar (the
 * data IS here, in full) and a "this Mac" tag on the right. The
 * uniform 100% bars are the point: four identical full bars in a
 * row form a visual "all of it, all the time" claim — marketing
 * psych anchor effect through repetition. Bars animate L→R on
 * reveal via the shared `app-drain-mockup__fill` keyframe.
 */
function PrivacyMockup() {
  const { t } = useTranslation()
  // Locale-aware row labels. Keys map directly to data categories so
  // the i18n surface stays stable even if visual ordering changes.
  const rows = [
    { labelKey: 'history' },
    { labelKey: 'cycles' },
    { labelKey: 'drain' },
    { labelKey: 'calendar' },
  ] as const
  return (
    <div
      className="app-drain-mockup mt-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-3"
      style={{
        boxShadow: '0.4px 0.4px 0 0 var(--line), 0 0 0 1px var(--line)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-nezumi">
          {t('health.mockups.privacy.kicker')}
        </span>
        <span className="text-[10px] font-medium text-sumi-soft tabular-nums">
          {t('health.mockups.privacy.localTag')}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={r.labelKey}
            className="grid grid-cols-[14px_1fr_auto] items-center gap-2.5"
            style={{ ['--app-row-delay' as string]: `${120 + i * 100}ms` }}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-[3px] bg-hinomaru/85"
              style={{ boxShadow: '0 0 0 1px rgba(28,26,23,0.08) inset' }}
            />
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] font-medium text-sumi truncate">
                {t(`health.mockups.privacy.rows.${r.labelKey}`)}
              </span>
              <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                <span
                  className="app-drain-mockup__fill absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: '100%',
                    background:
                      'linear-gradient(90deg, var(--hinomaru) 0%, color-mix(in oklab, var(--hinomaru) 60%, var(--nezumi)) 100%)',
                  }}
                />
              </span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-sumi-soft">
              {t('health.mockups.privacy.thisMac')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Health() {
  const { t, i18n } = useTranslation()
  // Wall-clock 2h before now, formatted in the active locale. Used as
  // the LEFT label under the aging sparkline so the visualization
  // reads as "from 2 hours ago to now" rather than "14 months ago to
  // today" — keeps the visible numbers honest while the body still
  // frames the line as a long-form battery history.
  const startTime = useWallClockHoursAgo(2, i18n.language)
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(11rem,_1fr)]">
        {cells.map(({ key, kanji, icon: Icon, span, feature }, i) => (
          <Reveal
            key={key}
            delay={(i % 4) * 80}
            className={span ?? ''}
          >
            <TiltCard rotateAmplitude={feature ? 4 : 6} scaleOnHover={feature ? 1.01 : 1.02}>
              <div
                className={`paper-card h-full flex flex-col ${
                  feature ? 'p-5 gap-3.5 sm:p-6 sm:gap-4' : 'p-4 gap-2.5'
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
                    <Sparkline values={capacitySeries} height={64} />
                    <div className="mt-1 flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-nezumi">
                      {/* Wall-clock 2h ago — fall back to the static
                          i18n placeholder during SSR + the first
                          client render so the layout doesn't reflow
                          when the effect lands. */}
                      <span className="tabular-nums">
                        {startTime || t('health.cells.aging.timeStart')}
                      </span>
                      <span className="text-sumi font-medium">{t('health.cells.aging.lifetime')}</span>
                    </div>
                  </div>
                )}
                <div className={feature ? 'mt-auto' : ''}>
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
                </div>
                {/* Per-cell mini-mockups — render BELOW the title +
                    body so they read as "here's what that looks like"
                    rather than chrome at the top of the card. Only the
                    cells with a data-shaped feature get one. */}
                {key === 'cycles' && <CycleMockup />}
                {key === 'languages' && <AppDrainMockup />}
                {key === 'privacy' && <PrivacyMockup />}
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
