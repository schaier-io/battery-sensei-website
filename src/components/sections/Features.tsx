import { Eye, Bell, BatteryCharging, Plane, Wifi, Search, Zap } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { InkLevelBar } from '#/components/zen/InkLevelBar'

const featured = {
  seal: '警',
  icon: Bell,
  title: 'Three levels. You pick.',
  italic: 'Sensei whispers, insists, or stays.',
  jp: '静かな警告',
  body: "macOS shows you a percent. Sensei shows you the right nudge at the right moment. Pick a preset, or set your own thresholds. Fewer surprise shutdowns. Quieter days.",
}

const supporting = [
  {
    seal: '保',
    icon: BatteryCharging,
    title: 'Charge limit',
    titleSub: 'with Travel Mode',
    jp: '長く保つ・旅',
    body: 'Apple recommends keeping charge below 100% to slow chemical aging. Sensei holds your cap. Heading on a flight? One click for a full charge, then it returns when you are home.',
    chip: { icon: Plane, label: 'Travel Mode · full charge on demand' },
    mockup: null as null | (() => JSX.Element),
  },
  {
    seal: '見',
    icon: Eye,
    title: 'One glance, the whole story',
    jp: '一目で',
    body: 'Charge, source, watts in or out, time left. All from your menu bar. No dock icon. No notification noise.',
    chip: null as null | { icon: typeof Plane; label: string },
    mockup: MenuBarGlanceMockup as () => JSX.Element,
  },
]

/**
 * Compact macOS dropdown mockup — mirrors how Battery Sensei reads when
 * its menu-bar status item is clicked open. A thin translucent menu bar
 * with the BatterySensei badge highlighted, then a small context-menu
 * card below with the live numbers (port of the menuStatusItem + items
 * built in BatteryStatusItemController.swift).
 */
function MenuBarGlanceMockup() {
  return (
    <div className="relative mt-5 mx-auto w-fit max-w-full">
      {/* Menu bar — only the right-edge cluster (system icons + Sensei badge),
          rendered above the dropdown so it reads as "this is the icon you'd
          click". Width is narrow on purpose; this is a context, not a chrome. */}
      <div className="flex h-6 items-center justify-end gap-2.5 rounded-t-md bg-[color-mix(in_oklab,var(--sumi)_74%,transparent)] px-2.5 text-white/85">
        <Wifi className="h-2.5 w-2.5" strokeWidth={1.8} aria-hidden />
        <Search className="h-2.5 w-2.5" strokeWidth={1.8} aria-hidden />
        <span className="tabular-nums font-medium text-[10px]">13:42</span>
        <MenuBarBatteryBadge percent={84} charging />
      </div>

      {/* Dropdown — context menu under the badge, right-aligned. */}
      <div className="ml-auto mt-1 w-[244px] overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]">
        {/* Hero row: app icon + big % + time-left */}
        <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
          <img
            src="/app-icon.png"
            srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
            alt=""
            aria-hidden
            className="h-8 w-8 drop-shadow-[0_2px_4px_rgba(28,26,23,0.15)]"
          />
          <div className="min-w-0 leading-tight">
            <p className="display-title text-[18px] font-bold tabular-nums text-sumi leading-none">
              84%
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-sumi-soft">
              1h 52m left
            </p>
          </div>
        </div>

        <MenuSep />

        {/* Live status rows — like NSMenuItems built in BatteryStatusItemController */}
        <MenuRow
          icon={<Zap className="h-3 w-3 text-hinomaru" strokeWidth={2} />}
          label="Charging to 85%"
          value="29.7 W"
        />
        <MenuRow label="Source" value="Power adapter" />
        <MenuRow label="Cycles" value="217" />

        <MenuSep />

        {/* Toggle-row: Charge Limit */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-sumi">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-hinomaru" />
            Charge limit · 85%
          </span>
          <span className="rounded-sm bg-sumi px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-washi">
            ON
          </span>
        </div>
      </div>
    </div>
  )
}

function MenuRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-sumi">
      <span className="flex items-center gap-1.5 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular-nums text-sumi-soft">{value}</span>
    </div>
  )
}

function MenuSep() {
  return <span aria-hidden className="block h-px w-full bg-[var(--line)]" />
}

function MenuBarBatteryBadge({
  percent,
  charging = false,
}: {
  percent: number
  charging?: boolean
}) {
  return (
    <span
      className="relative inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 bg-white/10 ring-1 ring-white/25"
      aria-hidden
    >
      {charging && <Zap className="h-2.5 w-2.5 text-hinomaru" strokeWidth={2.2} />}
      <svg viewBox="0 0 24 12" width="20" height="10">
        <rect
          x="0.5"
          y="1"
          width="20"
          height="10"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect x="21.5" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
        <rect
          x="2"
          y="2.5"
          width={Math.max(1, (percent / 100) * 17)}
          height="7"
          rx="1"
          fill="var(--hinomaru)"
        />
      </svg>
      <span className="tabular-nums text-[9px] font-semibold text-white">{percent}%</span>
    </span>
  )
}

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
          What it does
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
                      the three thresholds, pausing as each checkpoint flick
                      pulses, then sharply recharges. Mirrors the app's
                      Regular Mode preview in SetupWizardWarningPreview. */}
                  <div className="mt-7 max-w-xl">
                    <div className="mb-3 flex items-baseline justify-between text-[10px] uppercase tracking-[0.28em] text-nezumi">
                      <span>Battery</span>
                      <span className="font-jp normal-case tracking-[0.3em] text-hinomaru/80">
                        警 告
                      </span>
                    </div>
                    <InkLevelBar
                      thresholds={[
                        // displayFraction is what we render on the bar — picked
                        // to match the drain keyframes in styles.css so the
                        // wet brush head lands exactly on each flick.
                        // The real fractions stay 15/5/2 (shown in the rule rows).
                        { fraction: 0.15, displayFraction: 0.32, level: 'info', label: 'Info' },
                        { fraction: 0.05, displayFraction: 0.16, level: 'warn', label: 'Warning' },
                        { fraction: 0.02, displayFraction: 0.07, level: 'critical', label: 'Alert' },
                      ]}
                    />
                    <ul className="mt-4 space-y-2">
                      <RuleRow
                        percent={15}
                        title="Info"
                        detail="Quiet nudge. Closes itself in 5 s."
                        color="rgb(33, 125, 247)"
                        delay={120}
                      />
                      <RuleRow
                        percent={5}
                        title="Warning"
                        detail="Card on screen for 10 s."
                        color="rgb(250, 133, 10)"
                        delay={240}
                      />
                      <RuleRow
                        percent={2}
                        title="Alert"
                        detail="Stays until you dismiss it."
                        color="rgb(255, 56, 71)"
                        delay={360}
                      />
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          </TiltCard>
        </Reveal>

        {/* Supporting cards */}
        {supporting.map(({ seal, icon: Icon, title, titleSub, jp, body, chip, mockup: Mockup }, i) => (
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
                <p className="mt-1 font-jp text-xs text-nezumi tracking-wider">
                  {jp}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-sumi-soft">{body}</p>
                {chip && (
                  <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-md bg-[var(--washi-deep)] px-3 py-1.5 text-xs text-sumi">
                    <chip.icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                    {chip.label}
                  </div>
                )}
                {Mockup && <Mockup />}
              </article>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
