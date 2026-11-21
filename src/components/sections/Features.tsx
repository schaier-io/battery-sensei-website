import type { JSX } from 'react'
import {
  Smartphone,
  Headphones, Eye, Bell, BatteryCharging, Wifi, Search, CalendarClock, Lock, ArrowUpRight, PlugZap,
  AppWindow, BatteryFull, BatteryLow, BatteryMedium, CirclePause, Info, Turtle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { InkLevelBar, inkCheckpointDelay } from '#/components/zen/InkLevelBar'
import { ChargeInkMeter } from '#/components/zen/ChargeInkMeter'
import { WashiFibers } from '#/components/zen/WashiFibers'
import { ChargeLimitMockup } from '#/components/zen/ChargeLimitMockup'
import { useMounted } from '#/lib/use-mounted'

const featuredMeta = { seal: '警', icon: Bell }

const supportingMeta: Array<{
  key: string
  seal: string
  icon: typeof BatteryCharging
  mockup: () => JSX.Element
  href: string | null
}> = [
  {
    key: 'meetings',
    seal: '会',
    icon: CalendarClock,
    mockup: MeetingGuardMockup,
    href: '/features/meeting-battery-guard',
  },
  {
    key: 'chargeLimit',
    seal: '保',
    icon: BatteryCharging,
    // The app's cap presets (85% recommended) and its Travel Mode button.
    mockup: ChargeLimitMockup,
    href: '/features/travel-mode',
  },
  {
    key: 'glance',
    seal: '見',
    icon: Eye,
    mockup: MenuBarGlanceMockup,
    href: null,
  },
]

/**
 * Compact macOS dropdown mockup — mirrors Battery Sensei's open status-item
 * menu (BatteryStatusItemController.swift item order + ...ControllerMenu.swift):
 * the app-name header, a grey status row (11pt medium, `•` separators, a
 * leading battery glyph on the text baseline, text at x=38), then the action
 * rows. Toggle rows say what a click does (title + icon swap), no checkmark.
 */
function MenuBarGlanceMockup() {
  const { t } = useTranslation()
  const separator = <div className="mx-2.5 my-1 h-px bg-[var(--line)]" />
  return (
    // Not aria-hidden: the status line and menu items are real text that
    // screen readers should reach, as they did before the redesign.
    <div className="relative mt-5 mx-auto w-fit max-w-full">
      <div className="flex h-6 items-center justify-end gap-2.5 rounded-t-md bg-[color-mix(in_oklab,var(--sumi)_74%,transparent)] px-2.5 text-white/85">
        <Wifi className="h-2.5 w-2.5" strokeWidth={1.8} />
        <Search className="h-2.5 w-2.5" strokeWidth={1.8} />
        <span className="tabular-nums font-medium text-[10px]">13:42</span>
        <MenuBarBatteryBadge percent={72} />
      </div>

      <div className="ml-auto mt-1 w-[256px] max-w-full overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] py-1 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]">
        {/* Header: app icon + name, 13pt semibold, 28pt row. */}
        <div className="flex h-7 items-center">
          <span className="grid w-[38px] shrink-0 place-items-center">
            <img src="/favicon-32.png" alt="" width={16} height={16} loading="lazy" decoding="async" className="h-4 w-4" />
          </span>
          <span className="text-[12px] font-semibold text-sumi">Battery Sensei</span>
        </div>
        {/* Status row: icon omits the % already shown in the menu bar. */}
        <div className="flex h-6 items-baseline whitespace-nowrap text-[10.5px] font-medium leading-6 text-sumi-soft">
          <span className="grid w-[38px] shrink-0 place-items-center self-center">
            <BatteryMedium className="h-3.5 w-3.5 text-nezumi" strokeWidth={2} />
          </span>
          <span className="truncate pr-3">
            {t('features.glance.chargingTo')}
            <span className="mx-1.5 font-normal text-nezumi/70">•</span>
            <span className="tabular-nums">29.7 W</span>
          </span>
        </div>
        {separator}
        <MenuActionRow icon={AppWindow} title={t('features.glance.menuOpen')} />
        {separator}
        <MenuActionRow icon={CirclePause} title={t('features.glance.menuPause')} />
        <MenuActionRow icon={Turtle} title={t('features.glance.menuLowPower')} />
        <MenuActionRow icon={BatteryCharging} title={t('features.glance.menuTravel')} />
      </div>
    </div>
  )
}

/** Native menu item: 13pt SF Symbol in the image column, title at x=38. */
function MenuActionRow({ icon: Icon, title }: { icon: typeof Wifi; title: string }) {
  return (
    <div className="flex h-[22px] items-center text-[12px] text-sumi">
      <span className="grid w-[38px] shrink-0 place-items-center">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span className="truncate pr-3">{title}</span>
    </div>
  )
}

/**
 * Meeting Guard mockup. Was four stacked blocks (calendar
 * entry, warning card, reminder buckets, footer chip) — too much
 * detail for a homepage card. Collapsed to a single combined
 * meeting+warning panel with an inline on-device chip below: the
 * shape of the warning is what matters, not enumerating every
 * reminder bucket. The dedicated /features/meeting-battery-guard
 * page still goes deep for visitors who click Learn more.
 */
function MeetingGuardMockup() {
  const { t } = useTranslation()
  return (
    <div className="mt-5 w-full">
      <div className="rounded-md border border-hinomaru/25 bg-[color-mix(in_oklab,var(--hinomaru)_5%,var(--washi))] p-3 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]">
        {/* Header row: kicker on the left, meeting time on the right.
            Reads "NEXT ON CALENDAR · 3:00 PM" as a single line of
            metadata, no border, no separator chip. */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-sumi-soft">
          <CalendarClock className="h-3 w-3" strokeWidth={1.8} aria-hidden />
          {t('features.meetings.nextOnCalendar')}
          <span className="ml-auto font-semibold normal-case tracking-[0.04em] text-sumi">
            {t('features.meetings.startsAt')}
          </span>
        </div>
        {/* Meeting title — display-serif so it stands out as the
            subject of the alert. */}
        <p className="display-title mt-1 text-[14px] font-semibold leading-tight text-sumi">
          {t('features.meetings.meetingTitle')}
        </p>
        {/* Warning + fix, separated from the meta by a thin hinomaru
            rule. The dot anchors the eye to the warning verb. */}
        <div className="mt-2 border-t border-hinomaru/20 pt-2">
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-sumi">
            <span
              aria-hidden
              className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-hinomaru"
            />
            <span>
              <span className="font-semibold text-hinomaru-ink">
                {t('features.meetings.warnShort')}
              </span>{' '}
              {t('features.meetings.warnFix')}
            </span>
          </p>
        </div>
      </div>
      {/* On-device privacy line — outside the panel, inline footer
          treatment so it reads as a static guarantee rather than part
          of the live alert. */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-nezumi">
        <Lock className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
        {t('features.meetings.onDevice')}
      </div>
    </div>
  )
}

/** iOS-style Low Power Mode yellow (MenuBarBatteryRendering.lowPowerModeFillColor). */
const LOW_POWER_FILL = 'rgb(255, 204, 0)'

function MenuBarBatteryBadge({
  percent,
  lowPower = false,
}: {
  percent: number
  /** Low Power Mode paints the fill yellow at every level, as iOS does. */
  lowPower?: boolean
}) {
  return (
    <span
      className="relative inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 bg-white/10 ring-1 ring-white/25"
      aria-hidden
    >
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
          fill={lowPower ? LOW_POWER_FILL : 'var(--hinomaru)'}
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
  // InkLevelBar renders after mount, so its brush cycle starts then. Start
  // the flash in the same commit, or the two drift by the hydration delay.
  const mounted = useMounted()
  return (
    <li
      className="ink-rule-row flex items-center gap-3 rounded-xl border px-3 py-2 transition-transform duration-200 hover:-translate-y-px"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 10%, var(--card))`,
        borderColor: `color-mix(in oklab, ${color} 28%, transparent)`,
        ['--rule-delay' as string]: `${delay}ms`,
      }}
    >
      {/* Flashes when the InkLevelBar brush head reaches this rule's flick:
          same 10 s CSS cycle, same checkpoint delay. */}
      <span
        className={`${mounted ? 'ink-rule-badge ' : ''}inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums`}
        style={{
          color,
          backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
          borderColor: `color-mix(in oklab, ${color} 30%, transparent)`,
          animationDelay: `${inkCheckpointDelay(percent / 100).toFixed(2)}s`,
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

/** At or below this level on battery, the popup warns (UnplugInfoAlertContent.lowLevelPercentage). */
const HANDOFF_LOW_LEVEL = 15
/** ZenAlertNotice.amber: rgb(0.66, 0.48, 0.13) light, rgb(0.88, 0.74, 0.42) dark. */
const HANDOFF_AMBER_CLASS = 'text-[#A87A21] dark:text-[#E0BD6B]'

/**
 * Power handoff popup — port of the app's UnplugInfoAlertView.swift: a
 * 352×148pt washi card with a header row (symbol, title, ⓘ, percentage),
 * the time estimate at 34pt display, a caption, and the ChargeInkMeter.
 */
function HandoffNotice({
  kind,
  percent = kind === 'unplug' ? 46 : 62,
  limit = 85,
}: {
  kind: 'unplug' | 'plug'
  percent?: number
  /** Charge limit while plugged in (the meter's reserve starts here). */
  limit?: number
}) {
  const { t } = useTranslation()
  const unplugged = kind === 'unplug'
  const low = unplugged && percent <= HANDOFF_LOW_LEVEL
  const headerTint = low ? 'text-hinomaru-ink' : HANDOFF_AMBER_CLASS
  const HeaderIcon = !unplugged ? BatteryCharging : percent < 38 ? BatteryLow : percent < 63 ? BatteryMedium : BatteryFull

  return (
    <div className="relative flex min-h-[148px] w-full max-w-[352px] flex-col overflow-hidden rounded-2xl border-[0.8px] border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] px-5 py-4 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_18px_35px_-24px_rgba(28,26,23,0.42)]">
      <WashiFibers seed={0xa17e} width={352} height={148} />

      <div className={`relative mb-1.5 flex h-4 items-center gap-2 ${headerTint}`}>
        <span className="grid w-[22px] shrink-0 place-items-center" aria-hidden>
          <HeaderIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <p className="truncate text-[12px] font-medium leading-4">
          {t(`features.handoffs.${unplugged ? 'unplugTitle' : 'plugTitle'}`)}
        </p>
        <Info className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        <span className="ml-auto shrink-0 pl-2 text-[12px] font-medium tabular-nums leading-4 text-sumi-soft">
          {percent}%
        </span>
      </div>

      <p className="display-title relative h-[42px] truncate text-[34px] font-semibold leading-[42px] tracking-[-0.55px] tabular-nums text-sumi">
        {t(`features.handoffs.${unplugged ? 'unplugTime' : 'plugTime'}`)}
      </p>
      <p className="relative mt-0.5 h-3.5 truncate text-[11.5px] leading-3.5 text-sumi-soft">
        {t(`features.handoffs.${unplugged ? 'refining' : 'untilTarget'}`)}
      </p>

      <div className="relative mt-3">
        <ChargeInkMeter
          level={percent / 100}
          target={unplugged ? 1 : limit / 100}
          levelLabel={`${percent}%`}
          targetLabel={unplugged ? undefined : `${limit}%`}
          tintClass={low ? 'text-hinomaru-ink' : undefined}
        />
      </div>
    </div>
  )
}

/** One nearby device in the strip below the handoff notices. */
function DeviceRow({
  icon,
  name,
  percent,
}: {
  icon: React.ReactNode
  name: string
  percent: number
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="text-sumi-soft">{icon}</span>
      <span className="text-[12px] font-medium text-sumi">{name}</span>
      <span className="relative h-[7px] w-12 overflow-hidden rounded-full bg-sumi/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-hinomaru/70"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="text-[11px] tabular-nums text-sumi-soft">{percent}%</span>
    </span>
  )
}

/** The same watchfulness extends past the Mac: iPhone, iPad, and Bluetooth
 * accessories get their own low-battery alerts. Spans the notice grid. */
function DeviceStrip() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-3 sm:col-span-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nezumi">
        {t('features.handoffs.devicesTitle')}
      </span>
      <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <DeviceRow
          icon={<Smartphone className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />}
          name="iPhone"
          percent={72}
        />
        <DeviceRow
          icon={<Headphones className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />}
          name="AirPods"
          percent={38}
        />
      </span>
      <span className="w-full text-[11px] leading-snug text-sumi-soft">
        {t('features.handoffs.devicesNote')}
      </span>
    </div>
  )
}

function PowerHandoffFeature() {
  const { t } = useTranslation()

  return (
    <Reveal delay={80}>
      <article id="power-handoffs" className="paper-card mt-6 scroll-mt-24 overflow-hidden p-8 md:p-10">
        <div className="grid items-center gap-9 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          <div>
            <div className="flex items-center gap-3.5">
              <PlugZap className="h-7 w-7 text-sumi" strokeWidth={1.5} aria-hidden />
              <span className="kanji-accent font-jp text-3xl leading-none text-hinomaru-ink/85" aria-hidden>
                継
              </span>
            </div>
            <h3 className="display-title mt-5 text-[1.5rem] font-medium leading-tight text-sumi md:text-[1.7rem]">
              {t('features.handoffs.title')}
              <span className="mt-1 block text-[1rem] font-normal italic leading-snug text-sumi-soft md:text-[1.05rem]">
                {t('features.handoffs.italic')}
              </span>
            </h3>
            <p className="prose-readable mt-4 text-[0.925rem] text-sumi-soft">
              {t('features.handoffs.body')}
            </p>
            <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-nezumi">
              <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
              {t('features.handoffs.onDevice')}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" aria-label={t('features.handoffs.previewLabel')}>
            <HandoffNotice kind="unplug" />
            <HandoffNotice kind="plug" />
            <DeviceStrip />
          </div>
        </div>
      </article>
    </Reveal>
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
                <span className="kanji-accent font-jp text-5xl leading-none text-hinomaru-ink/90">
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
                    <span className="font-jp normal-case tracking-[0.3em] text-hinomaru-ink/80">
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
                    aria-label={`${t('common.learnMore')} — ${t('features.featured.title')}`}
                    className="group/learn mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-hinomaru-ink/85 hover:text-hinomaru-ink transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
                  >
                    {t('common.learnMore')}
                    <span className="sr-only"> — {t('features.featured.title')}</span>
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

      <PowerHandoffFeature />

      {/* Supporting-card layout rules (revised in this pass):
            1. Mockup leads. Visual right after the title, body and
               learn-more underneath. Was: body-then-mockup-at-bottom
               which buried the explanation image and made glance's
               menu-bar mockup invisible above the fold.
            2. Per-card "chip" affordance removed. The mockups now
               carry that information directly (Travel-Mode pill in
               the charge-limit bar, on-device line under the meeting
               panel, the menu-bar mockup IS the glance demo) and
               having both was redundant typography weight.
            3. Padding tightened p-7 → p-6 and the kanji + icon row
               sits closer to the title (mt-6 → mt-4) so the three
               cards align at the baseline rather than having the
               chargeLimit card tower over the other two. */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {supportingMeta.map(({ key, seal, icon: Icon, mockup: Mockup, href }, i) => {
          const titleSub = t(`features.${key}.titleSub`, { defaultValue: '' })
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
              <article className="paper-card p-6 h-full flex flex-col">
                {/* Icon + seal grouped on the left (rather than spread to
                    opposite corners) so the supporting cards read with the
                    same composed header as the featured alerts card above. */}
                <div className="flex items-center gap-3.5">
                  <Icon className="h-6 w-6 text-sumi" strokeWidth={1.5} />
                  <span className="kanji-accent font-jp text-2xl text-hinomaru-ink/80 leading-none">
                    {seal}
                  </span>
                </div>
                <h3 className="display-title mt-4 text-[1.25rem] font-medium text-sumi leading-tight">
                  {t(`features.${key}.title`)}
                  {titleSub && (
                    <span className="block italic text-sumi-soft font-normal text-[0.9rem] mt-0.5 leading-snug">
                      {titleSub}
                    </span>
                  )}
                </h3>
                {/* Mockup placed directly under the title so it reads
                    as the visual claim, with the body underneath as
                    the explanation. Overflow guard for the menu-bar
                    glance which can hit the card edge on narrow
                    breakpoints. */}
                <div className="overflow-hidden">
                  <Mockup />
                </div>
                <p className="mt-4 text-[0.875rem] leading-[1.55] text-sumi-soft">
                  {t(`features.${key}.body`)}
                </p>
                {href && (
                  <div className="mt-auto pt-4">
                    <Link
                      to={href}
                      aria-label={`${t('common.learnMore')} — ${t(`features.${key}.title`)}`}
                      className="group/learn inline-flex items-center gap-1.5 text-[12px] font-medium text-hinomaru-ink/85 hover:text-hinomaru-ink transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
                    >
                      {t('common.learnMore')}
                      <span className="sr-only"> — {t(`features.${key}.title`)}</span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/learn:translate-x-0.5 group-hover/learn:-translate-y-0.5"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </Link>
                  </div>
                )}
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
