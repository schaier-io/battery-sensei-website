import { Check, Minus, Info, ArrowUpRight, PlayCircle } from 'lucide-react'
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

export function Compare() {
  const { t } = useTranslation()
  const rows = t('compare.rows', { returnObjects: true }) as Row[]
  const partialLabel = t('compare.labels.partial')
  const moreInfoLabel = t('compare.labels.moreInfo')
  const openFeatureLabel = t('compare.labels.openFeature')
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
            className="group inline-flex items-center gap-2 rounded-full border border-hinomaru/25 bg-hinomaru/[0.04] px-4 py-2 text-[13px] font-medium text-sumi transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:border-hinomaru/45 hover:bg-hinomaru/[0.07] hover:text-hinomaru focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <PlayCircle
              className="h-4 w-4 text-hinomaru transition-transform duration-[280ms] group-hover:scale-110"
              strokeWidth={1.7}
              aria-hidden
            />
            {t('compare.videoCta')}
            <ArrowUpRight
              className="h-3 w-3 text-hinomaru/60 transition-all duration-[280ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-hinomaru"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </Reveal>
      </div>

      <Reveal delay={400}>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_92%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_18px_40px_-22px_rgba(28,26,23,0.18)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.18em] text-sumi-soft">
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
              {rows.map((r) => (
                <tr key={r.label} className="align-middle group/row">
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
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      <Reveal
        as="p"
        delay={500}
        className="mt-6 max-w-2xl mx-auto text-center text-[12px] tracking-[0.06em] text-nezumi leading-relaxed"
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
  const path = featureKey ? FEATURE_PATHS[featureKey] : undefined
  const labelNode = (
    <span className="inline-flex items-center gap-1.5">
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
      className="inline-flex items-center text-sumi underline-offset-[6px] decoration-hinomaru/30 hover:underline hover:text-hinomaru transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]"
      aria-label={`${label} — ${openFeatureLabel}`}
    >
      {labelNode}
    </Link>
  ) : (
    labelNode
  )
  return (
    <span className="inline-flex items-center gap-2">
      {labelEl}
      <span
        title={desc}
        aria-label={`${moreInfoLabel}: ${desc}`}
        tabIndex={0}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-nezumi/55 transition-colors duration-[220ms] hover:text-sumi-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--washi)]"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
      </span>
    </span>
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
      <td className={`${cls} text-[10px] uppercase tracking-[0.16em] text-sumi-soft`}>
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
