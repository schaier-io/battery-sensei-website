import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BatteryCharging, Info, Sparkles } from 'lucide-react'

// The app's cap presets and its Sensei pick (ChargeLimitControl.presets /
// recommendedPreset; ChargingControlModel.defaultPreferredChargeLimit = 85).
const PRESETS = [80, 85, 90, 95, 100] as const
const RECOMMENDED = 85

/**
 * Charge limit card mockup: the app's Settings → Charging cap control (a row
 * of ZenPresetChip capsules, the recommended one carrying a sparkle badge)
 * and the Today tab's split Travel Mode button (action half + info half).
 * Static and aria-hidden: the card body already states the default cap.
 */
export function ChargeLimitMockup() {
  const { t } = useTranslation()
  return (
    <div className="mt-5 w-full" aria-hidden>
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-sumi-soft">
        {t('features.chargeLimit.scaleLabel')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <PresetChip key={preset} value={preset} selected={preset === RECOMMENDED}>
            {preset === RECOMMENDED && (
              <span className="inline-flex items-center gap-[3px] text-[10px] font-medium text-sumi/80">
                <Sparkles className="h-2.5 w-2.5" strokeWidth={2.2} />
                {t('features.chargeLimit.recommended')}
              </span>
            )}
          </PresetChip>
        ))}
      </div>

      {/* Split button: the action, then a hairline, then the info half. */}
      <div className="mt-3 inline-flex h-8 items-stretch overflow-hidden rounded-full border border-hinomaru/35 bg-hinomaru/[0.08] text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 pl-3 pr-2.5 font-semibold text-sumi">
          <BatteryCharging className="h-3.5 w-3.5 text-hinomaru-ink" strokeWidth={2} />
          {t('features.chargeLimit.travelLabel')}
        </span>
        <span className="w-px bg-hinomaru/25" />
        <span className="grid place-items-center px-2 text-hinomaru-ink">
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-sumi-soft">{t('features.chargeLimit.travelHint')}</p>
    </div>
  )
}

/** ZenPresetChip: capsule, 10 × 6 pt padding, accent-soft fill when selected. */
function PresetChip({
  value,
  selected,
  children,
}: {
  value: number
  selected: boolean
  children?: ReactNode
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold tabular-nums',
        selected
          ? 'border-hinomaru/35 bg-hinomaru/[0.14] text-sumi'
          : 'border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,var(--paper-lift))] text-sumi-soft',
      ].join(' ')}
    >
      {value}%{children}
    </span>
  )
}
