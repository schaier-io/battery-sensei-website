import { Eye, Bell, BatteryCharging, Plane } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { InkLevelBar } from '#/components/zen/InkLevelBar'

const featured = {
  seal: '警',
  icon: Bell,
  title: 'Smart warnings.',
  italic: 'The heart of Sensei.',
  jp: '静かな警告',
  body: "Sensei watches your battery so you never miss a critical low. Three calm levels — Zen whispers, Alert insists, Critical overlays the screen. You set the thresholds; Sensei respects them.",
  pills: ['Zen mode', 'Alert mode', 'Critical overlay', 'Custom thresholds'],
}

const supporting = [
  {
    seal: '保',
    icon: BatteryCharging,
    title: 'Charge limits',
    titleSub: '+ Travel Mode',
    jp: '長く保つ・旅',
    body: 'Cap charging at 80% to extend cycle life. One click switches to Travel Mode and tops up to 100% before a trip.',
    chip: { icon: Plane, label: 'Travel Mode · charges to 100%' },
  },
  {
    seal: '見',
    icon: Eye,
    title: 'Menu-bar glance',
    jp: '一目で',
    body: 'Live charge, status, and power source — always one look away. No dock clutter, no notifications spam.',
  },
]

/**
 * Per-rule description row — matches the app's `SetupWizardRuleDescriptionRow`
 * (Surfaces/SetupWizard.swift): colored capsule with a battery glyph + %,
 * followed by the rule's display name and dismissal summary.
 */
function RuleRow({
  percent,
  title,
  detail,
  color,
  delay = 0,
}: {
  percent: number
  title: string
  detail: string
  color: string
  /** Milliseconds to delay this row's entry — staggers a group of rows. */
  delay?: number
}) {
  return (
    <li
      className="ink-rule-row flex items-center gap-3 rounded-xl border px-3 py-2 transition-transform duration-200 hover:-translate-y-px"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 10%, var(--card))`,
        borderColor: `color-mix(in oklab, ${color} 28%, transparent)`,
        ['--rule-delay' as string]: `${delay}ms`,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums"
        style={{
          color,
          backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
          borderColor: `color-mix(in oklab, ${color} 30%, transparent)`,
        }}
      >
        <BatteryGlyph fraction={percent / 100} />
        {percent}%
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold leading-tight" style={{ color }}>
          {title}
        </span>
        <span className="block text-[11px] text-sumi-soft leading-snug">
          {detail}
        </span>
      </span>
    </li>
  )
}

function BatteryGlyph({ fraction }: { fraction: number }) {
  // Mini battery icon — fill width tracks `fraction`. Mirrors the app's
  // `BatteryFillGlyph` (ZenComponents.swift).
  const fill = Math.max(1, Math.min(15, fraction * 15))
  return (
    <svg viewBox="0 0 20 10" width="18" height="9" aria-hidden>
      <rect
        x="0.5"
        y="1"
        width="17"
        height="8"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect x="18.2" y="3.5" width="1.4" height="3" rx="0.4" fill="currentColor" />
      <rect x="1.6" y="2.1" width={fill} height="5.8" rx="0.8" fill="currentColor" />
    </svg>
  )
}

export function Features() {
  return (
    <section id="features" className="zen-section mx-auto max-w-6xl px-6">
      <div className="mb-16 flex flex-col items-center text-center">
        <Hanko kanji="基" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          The basics, refined
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="display-title text-3xl font-semibold text-sumi md:text-5xl max-w-2xl"
        >
          Everything your battery needs.
          <span className="block mt-2 italic text-sumi-soft font-normal">
            Nothing it doesn't.
          </span>
        </Reveal>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Featured: Smart Warnings — spans both columns */}
        <Reveal delay={0} className="md:col-span-2">
          <TiltCard rotateAmplitude={3} scaleOnHover={1.005}>
            <article className="paper-card p-8 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                <div className="flex items-center gap-5 md:flex-col md:items-start md:gap-3">
                  <featured.icon
                    className="h-9 w-9 text-sumi"
                    strokeWidth={1.5}
                  />
                  <span className="kanji-accent font-jp text-5xl leading-none text-hinomaru/90">
                    {featured.seal}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-jp text-xs text-nezumi tracking-widest mb-2">
                    {featured.jp}
                  </p>
                  <h3 className="display-title text-2xl md:text-3xl font-semibold text-sumi">
                    {featured.title}
                    <span className="block italic text-sumi-soft font-normal">
                      {featured.italic}
                    </span>
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-sumi-soft">
                    {featured.body}
                  </p>

                  {/* Live ink meter — wet sumi stroke drains stepwise through
                      thresholds, pausing as each checkpoint flick pulses, then
                      sharply recharges. Mirrors `SetupWizardWarningPreview`
                      from the app — bar, flicks, and per-rule description rows. */}
                  <div className="mt-7 max-w-xl">
                    <div className="mb-3 flex items-baseline justify-between text-[10px] uppercase tracking-[0.28em] text-nezumi">
                      <span>Battery</span>
                      <span className="font-jp normal-case tracking-[0.3em] text-hinomaru/80">警 告</span>
                    </div>
                    <InkLevelBar
                      thresholds={[
                        { fraction: 0.35, level: 'info', label: 'Zen' },
                        { fraction: 0.15, level: 'warn', label: 'Alert' },
                        { fraction: 0.05, level: 'critical', label: 'Critical' },
                      ]}
                    />
                    <ul className="mt-4 space-y-2">
                      <RuleRow
                        percent={35}
                        title="Zen whisper"
                        detail="Auto-dismiss after 8s"
                        color="rgb(33, 125, 247)"
                        delay={120}
                      />
                      <RuleRow
                        percent={15}
                        title="Alert overlay"
                        detail="Auto-dismiss after 12s"
                        color="rgb(250, 133, 10)"
                        delay={240}
                      />
                      <RuleRow
                        percent={5}
                        title="Critical full-screen"
                        detail="Dismiss manually"
                        color="rgb(255, 56, 71)"
                        delay={360}
                      />
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {featured.pills.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-[var(--line-strong)] bg-[var(--washi-soft)] px-3 py-1 text-xs text-sumi-soft"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </TiltCard>
        </Reveal>

        {/* Supporting cards */}
        {supporting.map(({ seal, icon: Icon, title, titleSub, jp, body, chip }, i) => (
          <Reveal key={title} delay={140 + i * 100}>
            <TiltCard rotateAmplitude={6} scaleOnHover={1.015}>
              <article className="paper-card p-7 h-full flex flex-col">
                <div className="flex items-start justify-between">
                  <Icon className="h-6 w-6 text-sumi" strokeWidth={1.5} />
                  <span className="kanji-accent font-jp text-2xl text-hinomaru/80 leading-none">
                    {seal}
                  </span>
                </div>
                <h3 className="display-title mt-6 text-xl font-semibold text-sumi">
                  {title}
                  {titleSub && (
                    <span className="block italic text-sumi-soft font-normal text-base">
                      {titleSub}
                    </span>
                  )}
                </h3>
                <p className="mt-1 font-jp text-xs text-nezumi tracking-wider">{jp}</p>
                <p className="mt-4 text-sm leading-relaxed text-sumi-soft">{body}</p>
                {chip && (
                  <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-md bg-[var(--washi-deep)] px-3 py-1.5 text-xs text-sumi">
                    <chip.icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                    {chip.label}
                  </div>
                )}
              </article>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
