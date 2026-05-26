import type { JSX } from 'react'
import { Eye, Bell, BatteryCharging, Plane, Wifi, Search, Zap, CalendarClock, Lock, ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { InkLevelBar } from '#/components/zen/InkLevelBar'

const featuredMeta = { seal: '警', icon: Bell }

const supportingMeta: Array<{
  key: string
  seal: string
  icon: typeof BatteryCharging
  chip: typeof Plane | null
  mockup: null | (() => JSX.Element)
  href: string | null
}> = [
  {
    key: 'chargeLimit',
    seal: '保',
    icon: BatteryCharging,
    chip: Plane,
    mockup: null,
    href: '/features/travel-mode',
  },
  {
    key: 'glance',
    seal: '見',
    icon: Eye,
    chip: null,
    mockup: MenuBarGlanceMockup,
    href: null,
  },
  {
    key: 'meetings',
    seal: '会',
    icon: CalendarClock,
    chip: Lock,
    mockup: MeetingGuardMockup,
    href: '/features/meeting-battery-guard',
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
  const { t } = useTranslation()
  return (
    <div className="relative mt-5 mx-auto w-fit max-w-full">
      <div className="flex h-6 items-center justify-end gap-2.5 rounded-t-md bg-[color-mix(in_oklab,var(--sumi)_74%,transparent)] px-2.5 text-white/85">
        <Wifi className="h-2.5 w-2.5" strokeWidth={1.8} aria-hidden />
        <Search className="h-2.5 w-2.5" strokeWidth={1.8} aria-hidden />
        <span className="tabular-nums font-medium text-[10px]">13:42</span>
        <MenuBarBatteryBadge percent={84} charging />
      </div>

      <div className="ml-auto mt-1 w-[244px] overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]">
        <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
          <img
            src="/logo-256.webp"
            srcSet="/logo-256.webp 1x, /logo-512.webp 2x"
            width="32"
            height="32"
            alt=""
            aria-hidden
            decoding="async"
            loading="lazy"
            className="h-8 w-8 drop-shadow-[0_2px_4px_rgba(28,26,23,0.15)]"
          />
          <div className="min-w-0 leading-tight">
            <p className="display-title text-[18px] font-semibold tabular-nums text-sumi leading-none">
              84%
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-sumi-soft">
              {t('features.glance.timeLeft')}
            </p>
          </div>
        </div>

        <MenuSep />

        <MenuRow
          icon={<Zap className="h-3 w-3 text-hinomaru" strokeWidth={2} />}
          label={t('features.glance.chargingTo')}
          value="29.7 W"
        />
        <MenuRow label={t('features.glance.source')} value={t('features.glance.powerAdapter')} />
        <MenuRow label={t('features.glance.cycles')} value="217" />

        <MenuSep />

        <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-sumi">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-hinomaru" />
            {t('features.glance.chargeLimitOn')}
          </span>
          <span className="rounded-sm bg-sumi px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-washi">
            {t('features.glance.on')}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact mockup for the Meeting Battery Guard feature card. Mirrors the
 * loss-aversion-forward warning the macOS app surfaces 30/15/5 min before
 * a critical meeting: a small calendar entry strip + the warning copy
 * Sensei would actually show. Kept deliberately quiet — the privacy chip
 * does the heavy lifting, the mockup just shows the shape of the alert.
 */
function MeetingGuardMockup() {
  const { t } = useTranslation()
  return (
    <div className="mt-5 mx-auto w-full max-w-[320px]">
      <div className="rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_8px_18px_-12px_rgba(28,26,23,0.22)]">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="h-3.5 w-3.5 text-sumi-soft" strokeWidth={1.8} aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.18em] text-sumi-soft">
            {t('features.meetings.nextOnCalendar')}
          </span>
          <span className="ml-auto rounded-sm bg-sumi/8 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-sumi-soft">
            {t('features.meetings.duration')}
          </span>
        </div>
        <p className="display-title mt-1.5 text-[15px] font-semibold text-sumi leading-tight">
          {t('features.meetings.meetingTitle')}
        </p>
      </div>

      <div className="mt-2 rounded-md border border-hinomaru/30 bg-[color-mix(in_oklab,var(--hinomaru)_6%,var(--washi))] px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-hinomaru">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-hinomaru" />
          {t('features.meetings.warnHeading')}
        </div>
        <p
          className="mt-1.5 text-[13px] font-medium leading-snug text-sumi [&_strong]:font-semibold [&_strong]:text-hinomaru"
          dangerouslySetInnerHTML={{
            __html: t('features.meetings.warnBody', { interpolation: { escapeValue: false } }).replace(
              /<0>([\s\S]*?)<\/0>/,
              '<strong>$1</strong>',
            ),
          }}
        />
        <p className="mt-1 text-[11px] text-sumi-soft leading-snug">
          {t('features.meetings.warnFix')}
        </p>
      </div>

      <div className="mt-2.5 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] px-3 py-2">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-sumi-soft">
          <span className="font-jp normal-case tracking-[0.3em] text-sumi-soft/80">
            予 告
          </span>
          <span>{t('features.meetings.remindsYou')}</span>
        </div>
        <ol
          aria-label={t('features.meetings.remindsYou')}
          className="mt-1.5 grid grid-cols-4 items-end gap-1 text-center"
        >
          {[
            { v: '30', tone: 'sumi-soft' },
            { v: '15', tone: 'sumi-soft' },
            { v: '5', tone: 'hinomaru' },
            { v: '0', tone: 'hinomaru' },
          ].map(({ v, tone }, i) => (
            <li key={v} className="flex flex-col items-center gap-1">
              <span
                aria-hidden
                className={`h-1 w-full rounded-full ${
                  tone === 'hinomaru'
                    ? 'bg-hinomaru/70'
                    : 'bg-sumi-soft/35'
                }`}
                style={{ opacity: 0.55 + i * 0.12 }}
              />
              <span
                className={`tabular-nums text-[10px] font-semibold ${
                  tone === 'hinomaru' ? 'text-hinomaru' : 'text-sumi'
                }`}
              >
                {v === '0' ? t('features.meetings.now') : t('features.meetings.minBefore', { min: v })}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-2 flex items-center justify-between text-[9px] text-sumi-soft">
        <span className="inline-flex items-center gap-1">
          <Lock className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
          {t('features.meetings.onDevice')}
        </span>
        <span className="font-jp tracking-[0.3em] text-hinomaru/70">
          会 議
        </span>
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
  const { t } = useTranslation()
  return (
    <section id="features" className="zen-section mx-auto max-w-6xl px-6">
      <div className="mb-16 flex flex-col items-center text-center">
        <Hanko kanji="基" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          {t('features.kicker')}
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="section-heading text-sumi max-w-2xl"
        >
          {t('features.heading')}
          <span className="block mt-2 italic text-sumi-soft font-normal">
            {t('features.headingItalic')}
          </span>
        </Reveal>
      </div>

      {/* TiltCard removed from this row in 2026-05: the 3D rotation +
          `transform-style: preserve-3d` was creating a stacking context
          that made the inline `Link` to /features/alert-presets feel
          unclickable (cursor lost the hit target as the spring tilt
          repositioned it) and caused the embedded RuleRow / InkLevelBar
          to flicker in Safari during the rotation. Plain article + the
          paper-card hover styles read just as deliberate without
          fighting interactive children. */}
      <Reveal delay={0}>
        <article className="paper-card p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
              <div className="flex items-center gap-5 md:flex-col md:items-start md:gap-3">
                <featuredMeta.icon
                  className="h-9 w-9 text-sumi"
                  strokeWidth={1.5}
                />
                <span className="kanji-accent font-jp text-5xl leading-none text-hinomaru/90">
                  {featuredMeta.seal}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-jp text-xs text-nezumi tracking-widest mb-2">
                  {t('features.featured.jp')}
                </p>
                <h3 className="display-title text-[1.625rem] md:text-[1.875rem] font-medium text-sumi">
                  {t('features.featured.title')}
                  <span className="block italic text-sumi-soft font-normal">
                    {t('features.featured.italic')}
                  </span>
                </h3>
                <p className="prose-readable mt-4 text-[1rem] text-sumi-soft">
                  {t('features.featured.body')}
                </p>

                <div className="mt-7 max-w-xl">
                  <div className="mb-3 flex items-baseline justify-between text-[10px] uppercase tracking-[0.28em] text-nezumi">
                    <span>{t('features.featured.battery')}</span>
                    <span className="font-jp normal-case tracking-[0.3em] text-hinomaru/80">
                      警 告
                    </span>
                  </div>
                  <InkLevelBar
                    thresholds={[
                      { fraction: 0.15, displayFraction: 0.32, level: 'info', label: t('features.featured.rules.info') },
                      { fraction: 0.05, displayFraction: 0.16, level: 'warn', label: t('features.featured.rules.warning') },
                      { fraction: 0.02, displayFraction: 0.07, level: 'critical', label: t('features.featured.rules.alert') },
                    ]}
                  />
                  <ul className="mt-4 space-y-2">
                    <RuleRow
                      percent={15}
                      title={t('features.featured.rules.info')}
                      detail={t('features.featured.rules.infoDetail')}
                      color="rgb(33, 125, 247)"
                      delay={120}
                    />
                    <RuleRow
                      percent={5}
                      title={t('features.featured.rules.warning')}
                      detail={t('features.featured.rules.warningDetail')}
                      color="rgb(250, 133, 10)"
                      delay={240}
                    />
                    <RuleRow
                      percent={2}
                      title={t('features.featured.rules.alert')}
                      detail={t('features.featured.rules.alertDetail')}
                      color="rgb(255, 56, 71)"
                      delay={360}
                    />
                  </ul>
                  <Link
                    to="/features/alert-presets"
                    className="group/learn mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-hinomaru/85 hover:text-hinomaru transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
                  >
                    {t('common.learnMore')}
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/learn:translate-x-0.5 group-hover/learn:-translate-y-0.5"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                </div>
              </div>
            </div>
        </article>
      </Reveal>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {supportingMeta.map(({ key, seal, icon: Icon, chip: ChipIcon, mockup: Mockup, href }, i) => {
          const titleSub = t(`features.${key}.titleSub`, { defaultValue: '' })
          const chipLabel = t(`features.${key}.chip`, { defaultValue: '' })
          // At the 2-col breakpoint we have 3 cards: rows 1 (cards 1+2) and
          // row 2 (card 3 alone). Spanning the third card across both columns
          // there closes the dead space under card 2. At 3-col (lg+) the
          // orphan disappears and each card stays in its own column.
          const isOrphan = supportingMeta.length === 3 && i === 2
          return (
            <Reveal
              key={key}
              delay={140 + i * 100}
              className={isOrphan ? 'h-full sm:col-span-2 lg:col-span-1' : 'h-full'}
            >
              {/* No TiltCard — same reasoning as the featured card above.
                  The 3D rotation was clipping the Mockup behind a fresh
                  stacking context and intercepting the Learn-more click
                  on the Meetings card. Subtle hover still comes from
                  the paper-card class. */}
              <article className="paper-card p-7 h-full flex flex-col">
                  <div className="flex items-start justify-between">
                    <Icon className="h-6 w-6 text-sumi" strokeWidth={1.5} />
                    <span className="kanji-accent font-jp text-2xl text-hinomaru/80 leading-none">
                      {seal}
                    </span>
                  </div>
                  <h3 className="display-title mt-6 text-[1.3125rem] font-medium text-sumi">
                    {t(`features.${key}.title`)}
                    {titleSub && (
                      <span className="block italic text-sumi-soft font-normal text-[0.95rem] mt-0.5 leading-snug">
                        {titleSub}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1.5 font-jp text-xs text-nezumi tracking-wider">
                    {t(`features.${key}.jp`)}
                  </p>
                  <p className="mt-4 text-[0.9375rem] leading-[1.6] text-sumi-soft">
                    {t(`features.${key}.body`)}
                  </p>
                  <div className="mt-auto pt-5 flex flex-col gap-4">
                    {ChipIcon && chipLabel && (
                      <div className="inline-flex w-fit items-center gap-2 rounded-md bg-[var(--washi-deep)] px-3 py-1.5 text-[0.7rem] text-sumi">
                        <ChipIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                        <span className="truncate">{chipLabel}</span>
                      </div>
                    )}
                    {Mockup && (
                      <div className="overflow-hidden">
                        <Mockup />
                      </div>
                    )}
                    {href && (
                      <Link
                        to={href}
                        className="group/learn mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-hinomaru/85 hover:text-hinomaru transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
                      >
                        {t('common.learnMore')}
                        <ArrowUpRight
                          className="h-3.5 w-3.5 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/learn:translate-x-0.5 group-hover/learn:-translate-y-0.5"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </Link>
                    )}
                  </div>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
