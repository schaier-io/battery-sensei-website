import { Activity, Thermometer, Repeat, Zap, ShieldCheck, Languages } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { Sparkline } from '#/components/zen/Sparkline'

// 14 monthly capacity readings — typical Apple Silicon MacBook curve
const capacitySeries = [100, 99.6, 99.1, 98.5, 97.8, 97.0, 96.3, 95.6, 94.8, 94.1, 93.5, 93.0, 92.6, 92.3]

type Cell = {
  kanji: string
  icon: typeof Activity
  title: string
  body: string
  /** tailwind grid-area span on lg+ */
  span?: string
  feature?: boolean
}

const cells: Cell[] = [
  {
    kanji: '時',
    icon: Activity,
    title: 'How it ages, plotted',
    body: 'A quiet line you can read in a second. Plain English, no vendor jargon, no scary red dashboards.',
    span: 'lg:col-span-2 lg:row-span-2',
    feature: true,
  },
  {
    kanji: '輪',
    icon: Repeat,
    title: 'Cycle count, in context',
    body: '"217 cycles. Normal for 14 months." Numbers a human would say.',
  },
  {
    kanji: '熱',
    icon: Thermometer,
    title: 'Heat throttling, named',
    body: 'When macOS pauses charging to cool off, Sensei tells you why and what to do.',
  },
  {
    kanji: '電',
    icon: Zap,
    title: 'Live watts in, watts out',
    body: 'Spot a flaky cable in seconds. Catch a thirsty app before it eats your day.',
    span: 'lg:col-span-2',
  },
  {
    kanji: '守',
    icon: ShieldCheck,
    title: 'Stays on your Mac',
    body: 'No cloud. No account. No telemetry. Your battery story is yours alone.',
    span: 'lg:col-span-2',
  },
  {
    kanji: '言',
    icon: Languages,
    title: 'Speaks five languages',
    body: 'EN · DE · ES · FR · 日本語',
    span: 'lg:col-span-2',
  },
]

export function Health() {
  return (
    <section id="health" className="zen-section mx-auto max-w-6xl px-6">
      <div className="mb-16 flex flex-col items-center text-center">
        <Hanko kanji="健" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          MacBook battery health · 健康
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="display-title text-3xl font-semibold text-sumi md:text-5xl max-w-2xl"
        >
          Every metric that matters,
          <span className="block italic text-sumi-soft font-normal">
            in a sentence you'd actually say.
          </span>
        </Reveal>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(11rem,_1fr)]">
        {cells.map(({ kanji, icon: Icon, title, body, span, feature }, i) => (
          <Reveal
            key={title}
            delay={(i % 4) * 80}
            className={span ?? ''}
          >
            <TiltCard rotateAmplitude={feature ? 4 : 6} scaleOnHover={feature ? 1.01 : 1.02}>
              <div
                className={`paper-card h-full p-6 flex flex-col ${
                  feature ? 'gap-5' : 'gap-3'
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
                      <span>14 months ago</span>
                      <span className="text-sumi font-medium">92% today</span>
                    </div>
                  </div>
                )}
                <div className="mt-auto">
                  <h3
                    className={`display-title font-semibold text-sumi ${
                      feature ? 'text-2xl' : 'text-base'
                    }`}
                  >
                    {title}
                  </h3>
                  <p
                    className={`mt-2 leading-relaxed text-sumi-soft ${
                      feature ? 'text-base' : 'text-sm'
                    }`}
                  >
                    {body}
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
