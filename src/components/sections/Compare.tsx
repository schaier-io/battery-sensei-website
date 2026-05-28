import { useState } from 'react'
import { Check, Minus, Info, ArrowUpRight, ChevronDown, Play } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type CellValue = 'yes' | 'no' | 'partial'

type Row = {
  label: string
  desc: string
  key?: string
  sensei: CellValue
  aldente: CellValue
  batfi: CellValue
  coconut: CellValue
  istat: CellValue
  macos: CellValue
}

const COMPETITORS = ['aldente', 'batfi', 'coconut', 'istat', 'macos'] as const
type CompetitorKey = (typeof COMPETITORS)[number]

const COMPETITOR_URLS: Record<CompetitorKey, string> = {
  aldente: 'https://apphousekitchen.com/aldente-overview/',
  batfi: 'https://micropixels.software/apps/batfi',
  coconut: 'https://coconut-flavour.com/coconutbattery/',
  istat: 'https://bjango.com/mac/istatmenus/',
  macos: 'https://support.apple.com/en-us/102338',
}

const FEATURE_PATHS = {
  'travel-mode': '/features/travel-mode',
  'energy-usage': '/features/energy-usage',
  'custom-thresholds': '/features/custom-thresholds',
  'alert-presets': '/features/alert-presets',
  'battery-journal': '/features/battery-journal',
  'meeting-battery-guard': '/features/meeting-battery-guard',
} as const

type FeatureKey = keyof typeof FEATURE_PATHS

/**
 * Stable row key the comparison table truncates AT (inclusive) when
 * collapsed. Keeping this here, not in i18n, because it's a code-side
 * structural choice — the user picks how much of the table to surface
 * up front, not what to call the cut row.
 *
 * Why this row: "Energy use per app" is the last of the
 * differentiator-light table rows everyone-mostly-has. Past it the
 * table starts showing Sensei-only deltas (custom thresholds, alert
 * presets, meeting guard, battery journal), which read as
 * "what makes Sensei special" once revealed.
 */
const CUTOFF_ROW_KEY = 'energy-usage'

function swapRowsByKey(rows: Row[], firstKey: string, secondKey: string): Row[] {
  const next = [...rows]
  const firstIdx = next.findIndex((row) => row.key === firstKey)
  const secondIdx = next.findIndex((row) => row.key === secondKey)
  if (firstIdx === -1 || secondIdx === -1) return next
  ;[next[firstIdx], next[secondIdx]] = [next[secondIdx], next[firstIdx]]
  return next
}

export function Compare() {
  const { t } = useTranslation()
  const rowsBase = t('compare.rows', { returnObjects: true }) as Row[]
  const rows = swapRowsByKey(rowsBase, 'energy-usage', 'travel-mode')
  const partialLabel = t('compare.labels.partial')
  const moreInfoLabel = t('compare.labels.moreInfo')
  const openFeatureLabel = t('compare.labels.openFeature')

  // Truncate the table after the cut-off row by default; the rest of
  // the rows reveal in-place when the visitor opens the toggle below
  // the table. `findIndex` is safe with a missing key (returns -1):
  // in that case `cutoffIdx + 1` is 0 and we render zero rows when
  // collapsed, which is loud enough to notice in dev.
  const [expanded, setExpanded] = useState(false)
  const cutoffIdx = rows.findIndex((r) => r.key === CUTOFF_ROW_KEY)
  const visibleRows = expanded ? rows : rows.slice(0, cutoffIdx + 1)
  const extraCount = rows.length - (cutoffIdx + 1)
  const hasExtras = extraCount > 0

  return (
    <section id="compare" className="zen-section mx-auto max-w-6xl px-6">
      <div className="mb-12 flex flex-col items-center text-center">
        <Hanko kanji="比" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          {t('compare.kicker')}
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="section-heading text-sumi max-w-2xl"
        >
          {t('compare.heading')}
          <span className="block italic text-sumi-soft font-normal">
            {t('compare.headingItalic')}
          </span>
        </Reveal>
        <Reveal
          as="p"
          delay={300}
          className="mt-5 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
        >
          {t('compare.intro')}
        </Reveal>
        <Reveal delay={360} className="mt-5">
          <Link
            to="/walkthrough"
            // Calm secondary chip — outlined washi base with sumi text.
            // Replaces the earlier hinomaru-tinted-everywhere version
            // that was fighting the section's hanko + table accents for
            // attention. Now only the play disc carries colour: a tiny
            // hinomaru circle with a washi triangle, reading as
            // "press play" without flooding the chip with red.
            className="group inline-flex items-center gap-2.5 rounded-full border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)] py-1.5 pl-1.5 pr-4 text-[13px] font-medium text-sumi transition-[background-color,transform,box-shadow] duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[color-mix(in_oklab,var(--washi)_35%,#fff)] hover:shadow-[0_6px_18px_-10px_rgba(28,26,23,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <span
              aria-hidden
              className="relative grid h-7 w-7 place-items-center rounded-full bg-hinomaru shadow-[0_1px_0_rgba(255,248,235,0.18)_inset,0_2px_4px_rgba(188,0,45,0.22)] transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08]"
            >
              <Play
                className="h-3 w-3 translate-x-px text-[#fff8eb]"
                strokeWidth={2}
                fill="currentColor"
              />
            </span>
            {t('compare.videoCta')}
          </Link>
        </Reveal>
      </div>

      <Reveal delay={400} className="relative">
        {/* `md:overflow-visible` lets the Info tooltip escape the
            table wrapper. Without it `overflow-x-auto` forces
            overflow-y to `auto` per spec and the tooltip gets clipped
            above the first row. The min-w-[720px] table fits within
            max-w-6xl past md, so we don't need scroll there anyway. */}
        <div className="overflow-x-auto md:overflow-visible rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_92%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_18px_40px_-22px_rgba(28,26,23,0.18)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="meta-label border-b border-[var(--line)] text-sumi-soft">
                <th className="w-[36%] px-5 py-4 font-semibold">
                  {t('compare.headers.feature')}
                </th>
                <th className="px-3 py-4 text-center font-semibold text-hinomaru bg-hinomaru/[0.045] border-x border-hinomaru/15">
                  {t('compare.headers.sensei')}
                </th>
                {COMPETITORS.map((c) => (
                  <th key={c} className="px-3 py-4 text-center font-medium text-sumi-soft">
                    <a
                      href={COMPETITOR_URLS[c]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/comp inline-flex items-center gap-1 text-sumi-soft underline-offset-[6px] decoration-nezumi/30 hover:text-sumi hover:underline transition-colors duration-[220ms]"
                    >
                      {t(`compare.headers.${c}`)}
                      <ArrowUpRight
                        className="h-3 w-3 text-nezumi/60 transition-all duration-[220ms] group-hover/comp:text-sumi group-hover/comp:translate-x-0.5 group-hover/comp:-translate-y-0.5"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleRows.map((r, i) => {
                const isExtra = i > cutoffIdx
                const extraIdx = i - cutoffIdx - 1
                return (
                <tr
                  key={r.label}
                  className={`align-middle group/row ${isExtra ? 'compare-row-extra' : ''}`}
                  style={isExtra ? ({ ['--compare-row-delay' as string]: `${extraIdx * 55}ms` }) : undefined}
                >
                  <td className="px-5 py-3.5 text-sumi leading-[1.5]">
                    <FeatureLabel
                      label={r.label}
                      desc={r.desc}
                      featureKey={r.key as FeatureKey | undefined}
                      moreInfoLabel={moreInfoLabel}
                      openFeatureLabel={openFeatureLabel}
                    />
                  </td>
                  <Cell value={r.sensei} accent partialLabel={partialLabel} />
                  {COMPETITORS.map((c) => (
                    <Cell
                      key={c}
                      value={r[c as CompetitorKey]}
                      partialLabel={partialLabel}
                    />
                  ))}
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Show-all toggle — anchored on the table's bottom border so
            the chip visually "breaks" the line, signalling that more
            rows live beneath it. Washi backdrop (matched to the page,
            not the table) eats the border behind the chip, producing
            the cut-line effect. Hidden when there's nothing more. */}
        {hasExtras && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center"
          >
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="pointer-events-auto group inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--washi)] px-4 py-1.5 text-[13px] font-medium text-sumi-soft transition-[background-color,transform,box-shadow,color] duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] hover:text-sumi hover:shadow-[0_6px_18px_-10px_rgba(28,26,23,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              {expanded
                ? t('compare.showFewer')
                : t('compare.showAll', { count: extraCount })}
              <ChevronDown
                className={`h-3.5 w-3.5 text-nezumi transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:text-sumi ${
                  expanded ? 'rotate-180' : ''
                }`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
        )}
      </Reveal>

      <Reveal
        as="p"
        delay={500}
        className={`${hasExtras ? 'mt-10' : 'mt-6'} max-w-2xl mx-auto text-center text-[12px] tracking-[0.06em] text-nezumi leading-relaxed`}
      >
        {t('compare.footnote')}
      </Reveal>
    </section>
  )
}

function FeatureLabel({
  label,
  desc,
  featureKey,
  moreInfoLabel,
  openFeatureLabel,
}: {
  label: string
  desc: string
  featureKey?: FeatureKey
  moreInfoLabel: string
  openFeatureLabel: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const path = featureKey ? FEATURE_PATHS[featureKey] : undefined
  const mobileDescId = `compare-desc-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const labelNode = (
    <span className="inline-flex items-center gap-1.5 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5">
      {label}
      {path ? (
        <ArrowUpRight
          className="h-3.5 w-3.5 text-hinomaru/55 transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/row:text-hinomaru group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
    </span>
  )
  const labelEl = path ? (
    <Link
      to={path}
      className="inline-flex items-center text-sumi underline-offset-[6px] decoration-hinomaru/30 transition-[color,text-decoration-color,transform] duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:underline hover:text-hinomaru"
      aria-label={`${label} — ${openFeatureLabel}`}
    >
      {labelNode}
    </Link>
  ) : (
    labelNode
  )
  return (
    <div className="space-y-1.5">
      <span className="inline-flex items-center gap-2">
        {labelEl}
        <span
          aria-label={`${moreInfoLabel}: ${desc}`}
          tabIndex={0}
          className="group/info relative hidden md:inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-nezumi/55 transition-colors duration-[220ms] hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--washi)]"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          {/* Real tooltip — native `title=` was effectively invisible
              (slow OS delay, no styling, eaten by table overflow). This
              floats above the icon, animates in, and stays in flow so
              it doesn't get clipped by the table's overflow-x-auto. */}
          {/* Anchor the tooltip's LEFT edge to the icon (not center)
              so it always extends rightward — first-column icons
              would otherwise overflow the page on narrow widths. */}
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-64 -translate-x-1 translate-y-1 rounded-md border border-[var(--line-strong)] bg-sumi px-3 py-2 text-left text-[12px] font-normal leading-snug text-[var(--washi)] shadow-[0_8px_24px_-10px_rgba(28,26,23,0.45)] opacity-0 transition-[opacity,transform] duration-[180ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/info:translate-y-0 group-hover/info:opacity-100 group-focus-visible/info:translate-y-0 group-focus-visible/info:opacity-100"
          >
            {desc}
            <span
              aria-hidden
              className="absolute left-3 top-full -translate-y-px h-2 w-2 rotate-45 bg-sumi border-r border-b border-[var(--line-strong)]"
            />
          </span>
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls={mobileDescId}
          className="meta-label inline-flex items-center gap-1 rounded-sm text-nezumi/95 transition-colors duration-[220ms] hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--washi)] md:hidden"
        >
          {moreInfoLabel}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
            aria-hidden
            strokeWidth={2}
          />
        </button>
      </span>
      {mobileOpen && (
        <p id={mobileDescId} className="text-[0.875rem] leading-snug text-sumi-soft md:hidden">
          {desc}
        </p>
      )}
    </div>
  )
}

function Cell({
  value,
  accent = false,
  partialLabel,
}: {
  value: CellValue
  accent?: boolean
  partialLabel: string
}) {
  const accentBg = accent ? 'bg-hinomaru/[0.045] border-x border-hinomaru/15' : ''
  const cls = `px-3 py-3.5 text-center align-middle ${accentBg}`
  if (value === 'yes') {
    return (
      <td className={cls}>
        <Check
          className={`inline h-4 w-4 ${accent ? 'text-hinomaru' : 'text-matcha'}`}
          strokeWidth={accent ? 2.4 : 2}
          aria-hidden
        />
      </td>
    )
  }
  if (value === 'partial') {
    return (
      <td className={`${cls} meta-label text-sumi-soft`}>
        {partialLabel}
      </td>
    )
  }
  return (
    <td className={cls}>
      <Minus className="inline h-4 w-4 text-nezumi/55" strokeWidth={2} aria-hidden />
    </td>
  )
}
