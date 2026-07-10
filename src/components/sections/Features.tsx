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
    // Was `mockup: null` — the card stood awkwardly empty next to its
    // siblings. The new ChargeLimitMockup is a compact horizontal
    // scale showing the 80% cap with the 80→100 region drawn as
    // dashed "Travel Mode" overlay. Same height envelope as the
    // other two mockups so the row aligns at the baseline.
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
        <MenuBarBatteryBadge percent={84} />
      </div>

      <div className="ml-auto mt-1 w-[244px] overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_30px_-14px_rgba(28,26,23,0.30),0_4px_10px_-6px_rgba(28,26,23,0.18)]">
        <div className="px-3 py-3">
          <div className="flex items-end justify-between gap-3">
            <p className="display-title tabular-nums text-[20px] font-semibold leading-none text-sumi">
              84%
            </p>
            <p className="text-[12px] tabular-nums text-sumi-soft leading-none">
              {t('features.glance.timeLeft')}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-sumi-soft">
            <Zap className="h-3 w-3 shrink-0 text-hinomaru/85" strokeWidth={1.8} aria-hidden />
            <span className="truncate">
              {t('features.glance.source')}: {t('features.glance.powerAdapter')} · 29.7 W
            </span>
          </div>
          <p className="mt-1 text-[10px] text-sumi">
            {t('features.glance.chargingTo')} 80%
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Charge Limit + Travel Mode mockup. A compact horizontal capacity
 * scale: the 0–80% range is filled solid ink (the cap Sensei holds
 * in the background), the 80–100% range is drawn as a dashed "Travel
 * Mode" overlay (the one-tap full charge for flights). A pill below
 * names the action. Same vertical envelope as the other two
 * supporting mockups so the row of three cards aligns at the
 * baseline rather than two having visuals and one being empty.
 */
function ChargeLimitMockup() {
  const { t } = useTranslation()
  return (
    <div className="mt-5 w-full">
      <div className="mb-2 flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-sumi-soft">
        <span>{t('features.chargeLimit.scaleLabel')}</span>
        <span className="tabular-nums font-semibold text-sumi">80%</span>
      </div>
      {/* Cap bar — solid ink 0→80, dashed pattern 80→100. The vertical
          tick at the cap line draws the eye to where Sensei actually
          stops the charge. h-2.5 keeps it visually quiet beside the
          other mockups which already carry text content. */}
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_45%,#fff)]"
        role="presentation"
        aria-hidden
      >
        {/* Travel-mode stripe texture sits fully in the background.
            The solid fill overlays it up to 80%, so the stripe region
            appears only in the tail without a hard left marker line. */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'repeating-linear-gradient(135deg, color-mix(in oklab, var(--hinomaru) 72%, var(--washi)) 0 2px, color-mix(in oklab, var(--hinomaru) 10%, transparent) 2px 5px)',
          }}
        />
        {/* Solid fill to the cap. */}
        <div
          className="absolute inset-y-0 left-0 z-10 rounded-l-full bg-gradient-to-r from-sumi to-[color-mix(in_oklab,var(--sumi)_72%,transparent)]"
          style={{ width: '80%' }}
        />
      </div>
      {/* 0 / 80 / 100 ticks. Each label is absolutely positioned so
          the "80" sits exactly under the cap marker above (left:80%
          + translateX(-50%) centers the digits on the tick line)
          regardless of card width. The previous flex+margin-auto
          hack collapsed at narrow widths and let "80" drift off
          the cap line. */}
      <div className="relative mt-1.5 h-3 text-[9px] tabular-nums uppercase tracking-[0.18em] text-nezumi">
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-1/2 font-semibold text-sumi-soft"
          style={{ left: '80%' }}
        >
          80
        </span>
        <span className="absolute right-0">100</span>
      </div>
      {/* Travel Mode action row — one line, plane glyph, the verb. */}
      <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-2.5 py-1.5 text-[11px] text-sumi-soft">
        <Plane className="h-3 w-3 text-hinomaru" strokeWidth={1.8} aria-hidden />
        <span>
          <span className="font-medium text-sumi">
            {t('features.chargeLimit.travelLabel')}
          </span>{' '}
          {t('features.chargeLimit.travelHint')}
        </span>
      </div>
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
              <span className="font-semibold text-hinomaru">
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

function MenuBarBatteryBadge({
  percent,
}: {
  percent: number
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
                    aria-label={`${t('common.learnMore')} — ${t('features.featured.title')}`}
                    className="group/learn mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-hinomaru/85 hover:text-hinomaru transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
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
                  <span className="kanji-accent font-jp text-2xl text-hinomaru/80 leading-none">
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
                      className="group/learn inline-flex items-center gap-1.5 text-[12px] font-medium text-hinomaru/85 hover:text-hinomaru transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hinomaru/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] rounded-sm"
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
