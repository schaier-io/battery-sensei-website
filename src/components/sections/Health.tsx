import { Activity, Thermometer, Repeat, Zap, ShieldCheck, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { Sparkline } from '#/components/zen/Sparkline'

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
  { key: 'privacy',   kanji: '守', icon: ShieldCheck,  span: 'lg:col-span-2' },
  { key: 'languages', kanji: '言', icon: Languages,    span: 'lg:col-span-2' },
]

export function Health() {
  const { t } = useTranslation()
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
                className={`paper-card h-full p-6 flex flex-col ${
                  feature ? 'gap-5' : 'gap-4'
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
                      <span>{t('health.cells.aging.monthsAgo')}</span>
                      <span className="text-sumi font-medium">{t('health.cells.aging.today')}</span>
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
                    className={`mt-2 leading-[1.6] text-sumi-soft ${
                      feature ? 'text-[1rem]' : 'text-[0.9375rem]'
                    }`}
                  >
                    {t(`health.cells.${key}.body`)}
                  </p>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
