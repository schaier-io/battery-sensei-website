import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Wifi, Search, MoonStar, Minus, Plus, Info, X } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

// Formats in the site language, not the visitor's browser language. The
// rendered width drives the slot reservation in `MenuBar`, and browser locales
// the site does not ship run much wider (pl-PL "niedz., 27, 23:58" is 14.5ch
// against ja-JP's 13ch), which would either shift the layout or force a slot
// wide enough to leave a permanent gap.
const formatTime = (d: Date, locale: string) =>
  d.toLocaleTimeString(locale, {
    weekday: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const CHARGE = 0.15

/**
 * Hero mockup: a tiny macOS desktop with the app's low-battery alert card
 * (ZenAlertCard) floating on top. Mirrors how the alert actually appears in the wild —
 * translucent menu bar with the app's icon highlighted on the right, washi
 * desktop, then the warning card centered with its own scrim.
 */
export function MenuBarMockup({ className = '' }: { className?: string }) {
  // Starts null on purpose. `toLocaleTimeString` gives the server one value
  // and the browser another, so reading it during render broke hydration for
  // the whole page. The clock is set after mount instead, and `MenuBar`
  // reserves its width so the icons beside it do not move when it arrives.
  const { i18n } = useTranslation()
  const [now, setNow] = useState<Date | null>(null)
  const [revealed, setRevealed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    // Auto-fallback: even if the user never scrolls past the hero, the
    // mockup should still come alive shortly after page load.
    const autoTimer = window.setTimeout(() => setRevealed(true), 900)

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      window.clearTimeout(autoTimer)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            window.clearTimeout(autoTimer)
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(autoTimer)
    }
  }, [])

  const time = now ? formatTime(now, i18n.language) : ''
  const percent = Math.round(CHARGE * 100)

  return (
    <div
      ref={rootRef}
      data-revealed={revealed ? 'true' : 'false'}
      className={`menu-bar-mockup relative isolate overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--sumi)_24%,transparent)] shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_32px_70px_-26px_rgba(28,26,23,0.40),0_10px_22px_-12px_rgba(28,26,23,0.22)] ${className}`}
      style={{
        // Desktop "wallpaper" — soft warm washi wash with a high light source
        // for depth, like late-afternoon paper.
        background:
          'radial-gradient(140% 90% at 30% 8%, #f8f2e8 0%, #efe3cf 56%, #d8c5ab 100%)',
      }}
    >
      {/* macOS menu bar — translucent dark over the wallpaper */}
      <MenuBar time={time} percent={percent} />

      {/* Desktop area — kept proportionally large enough for the alert + a
          peek of the dock at the bottom. */}
      <div className="relative h-[360px] sm:h-[400px]">
        {/* Faint inked rule rows on the wallpaper, like a desktop with files */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          aria-hidden
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0 38px, color-mix(in oklab, var(--sumi) 8%, transparent) 38px 39px)',
          }}
        />

        {/* Window-shadow dimming behind the alert card */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(60% 50% at 50% 48%, color-mix(in oklab, var(--sumi) 18%, transparent) 0%, transparent 70%)',
          }}
        />

        {/* The alert card: the app's ZenAlertCard layout, miniaturized for
            the desktop stage so the whole scene fits inside the hero card. */}
        <AlertCard percent={percent} revealed={revealed} />

        {/* Dock — a hint at the bottom for desktop realism */}
        <Dock />
      </div>
    </div>
  )
}

function MenuBar({ time, percent }: { time: string; percent: number }) {
  return (
    <div className="relative z-20 flex h-7 items-center justify-between gap-3 border-b border-black/15 bg-[var(--os-chrome)] px-3.5 text-[11px] text-white backdrop-blur-md">
      <div className="flex items-center gap-3.5 min-w-0">
        <AppleGlyph />
        <span className="font-semibold">Finder</span>
        <span className="text-white/80 hidden sm:inline">File</span>
        <span className="text-white/80 hidden sm:inline">Edit</span>
        <span className="text-white/80 hidden sm:inline">View</span>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 text-white/85">
        <BatteryIcon level={percent / 100} highlighted />
        <Wifi className="h-3 w-3" strokeWidth={1.8} />
        <Search className="h-3 w-3" strokeWidth={1.8} />
        {/* Reserves the clock's real width while it is empty before mount.
            The clock is empty until then by design (see the note on `now`
            above), so with no reserve these three icons would jump left by the
            clock's whole rendered width on every hydration: up to 67 to 71px
            depending on language, less on single-digit days.

            Measured in Chrome at this font and tracking: ja is widest at
            12.93ch, then de 12.77, es 12.44, en 12.26, fr 12.10. 13.5ch is
            13ch plus slack, because the `日` in the ja string is outside the
            latin subsets this site loads (styles.css:29-37) and so comes from
            whichever CJK face the platform falls back to. Five macOS faces
            measured between 70.6 and 71.1px; Windows and Linux were not
            measured, and an overflow there would bring the shift back.

            `text-right` keeps the clock flush with the bar's padding edge:
            the span inherits `text-align: center`, which would otherwise split
            the reserve and float the clock ~7px inside. */}
        <span className="min-w-[13.5ch] text-right font-medium tabular-nums tracking-wide whitespace-nowrap">
          {time}
        </span>
      </div>
    </div>
  )
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 14 18" width="11" height="14" aria-hidden className="text-white">
      <path
        fill="currentColor"
        d="M11.8 13.8c-.6 1.4-1.3 2.7-2.4 2.7-1 0-1.4-.6-2.5-.6-1.2 0-1.6.6-2.5.6-1.1 0-1.9-1.2-2.5-2.5C.4 11 .5 7.5 2.2 6c.7-.7 1.7-1.1 2.6-1.1.9 0 1.5.5 2.5.5.9 0 1.5-.6 2.6-.6.7 0 1.5.2 2.1.7-1.8 1-1.5 3.6.3 4.5-.4.9-.7 1.7-1.5 3.8zM9.3 3.9c-.6.7-1.6 1.2-2.5 1.1-.1-1 .4-2 .9-2.6.6-.7 1.6-1.2 2.5-1.3.1 1 -.4 2-1 2.8z"
      />
    </svg>
  )
}

function AlertCard({ percent, revealed }: { percent: number; revealed: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      className="alert-card absolute left-1/2 top-[calc(50%-20px)] z-10 w-[86%] max-w-[360px] sm:w-[80%] rounded-[16px] border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] p-5 text-left shadow-[0_4px_10px_rgba(28,26,23,0.12)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.42)]"
      data-revealed={revealed ? 'true' : 'false'}
      style={{
        transform: `translate(-50%, calc(-50% + ${revealed ? '0px' : '12px'}))`,
        opacity: revealed ? 1 : 0,
        transition:
          'transform 680ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 680ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      {/* 電 marks power (WarningOverlayBanner.swift:76). Top on the golden
          cut of the padding, trailing on the content edge, so it ends
          where Dismiss ends (ZenAlertCard.swift:98-107). */}
      <span
        aria-hidden
        className="font-jp pointer-events-none absolute right-5 top-3 text-[22px] leading-none text-sumi opacity-10"
      >
        電
      </span>

      {/* Kicker: spaced caps in the alert tint, then the ⓘ. The ⓘ is
          decorative here: the popover it opens in the app does not exist on
          the page. */}
      <AlertRow index={0} revealed={revealed}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-hinomaru-ink">
            {t('mockups.menuBar.lowBattery')}
          </span>
          <Info aria-hidden className="h-[11px] w-[11px] text-sumi-soft opacity-65" strokeWidth={2} />
        </div>
      </AlertRow>

      {/* Glyph + reading. The glyph centres on the digits: `leading-none`
          on the title makes its line box hug the figures. */}
      <AlertRow index={1} revealed={revealed} className="mt-2">
        <div className="flex items-center gap-2">
          <SmallBatteryGlyph fraction={percent / 100} />
          <p className="display-title text-[24px] font-semibold leading-none tabular-nums text-sumi">
            {percent}%
          </p>
        </div>
      </AlertRow>

      {/* Forecast line, NOT a restatement: the runtime, number in bold, as
          the app's `bannerDetail` renders it (WarningOverlayBanner.swift:149). */}
      <AlertRow index={2} revealed={revealed} className="mt-[5px]">
        <p className="text-[12px] leading-[1.45] text-sumi-soft">
          <Trans
            i18nKey="mockups.menuBar.timeLeft"
            values={{ time: '1h 12m' }}
            components={[<span className="font-semibold text-sumi tabular-nums" />]}
          />
        </p>
      </AlertRow>

      {/* Action row: one snooze field with −/+ inside it, then the red
          Dismiss. No keycaps (WarningOverlayAlertControls.swift:4-8). The
          field hangs by its inset so its keys start on the text edge. */}
      <AlertRow index={3} revealed={revealed} className="mt-[13px]">
        <div className="-ml-1 flex items-center justify-between gap-2">
          <div className="flex h-[30px] shrink-0 items-center gap-1 rounded-lg border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_30%,var(--paper-lift))] px-1 transition-[border-color] duration-[240ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:border-[color-mix(in_oklab,var(--sumi)_30%,transparent)]">
            <StepGlyph>
              <Minus className="h-3 w-3" strokeWidth={2.4} />
            </StepGlyph>
            {/* `nowrap` holds the label on one line; the word "Snooze" drops
                below `sm` (the moon says it) so de fits a 375px phone. */}
            <span className="flex items-center gap-1.5 whitespace-nowrap px-0.5 text-[11px] font-medium text-sumi">
              <MoonStar aria-hidden className="h-3 w-3" fill="currentColor" strokeWidth={1.6} />
              <span className="hidden sm:inline">{t('mockups.menuBar.snooze')} </span>
              <span className="tabular-nums">{t('mockups.menuBar.snoozeStep')}</span>
            </span>
            <StepGlyph>
              <Plus className="h-3 w-3" strokeWidth={2.4} />
            </StepGlyph>
          </div>
          <span className="inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-hinomaru/95 px-3 text-[11px] font-semibold text-white transition-colors duration-[200ms] hover:bg-hinomaru">
            <X aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
            {t('mockups.menuBar.dismiss')}
          </span>
        </div>
      </AlertRow>
    </div>
  )
}

/**
 * Row entrance from `ZenAlertRowEntrance` (ZenAlertCard.swift:315-331):
 * each row fades and drops 6px, 60 ms after the one above, once the card
 * has started to land.
 */
function AlertRow({
  index,
  revealed,
  className = '',
  children,
}: {
  index: number
  revealed: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`transition-[opacity,translate] duration-[320ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${revealed ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'} ${className}`}
      style={{ transitionDelay: `${ROW_ENTRANCE_START_MS + index * ROW_ENTRANCE_STEP_MS}ms` }}
    >
      {children}
    </div>
  )
}

/** The card lands in 680 ms; rows start partway in, then step 60 ms apart. */
const ROW_ENTRANCE_START_MS = 240
const ROW_ENTRANCE_STEP_MS = 60

function StepGlyph({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid h-5 w-5 place-items-center rounded-[4px] text-sumi transition-colors duration-[140ms] ease-out hover:bg-[color-mix(in_oklab,var(--sumi)_8%,transparent)]"
    >
      {children}
    </span>
  )
}

function Dock() {
  return (
    <div
      className="absolute inset-x-0 bottom-1 z-0 mx-auto flex h-9 w-fit max-w-[88%] items-center gap-1.5 rounded-2xl border border-white/40 bg-white/35 px-2 backdrop-blur-md"
      aria-hidden
    >
      {/* Tiny app tiles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="block h-6 w-6 rounded-md"
          style={{
            background:
              i === 4
                ? 'linear-gradient(180deg, var(--hinomaru), color-mix(in oklab, var(--hinomaru) 78%, var(--sumi)))'
                : `color-mix(in oklab, var(--sumi) ${10 + (i % 3) * 8}%, var(--washi))`,
            boxShadow:
              '0 1px 1px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </div>
  )
}

/** Title size the glyph scales against (`batteryToTitle`, ZenAlertCard.swift:197). */
const GLYPH_SIZE = 24 * 0.95

/**
 * `BatteryFillGlyph` (ZenComponents.swift:20-60): outline, inner fill that
 * tracks the charge (never thinner than a rounded square), and a nub.
 */
function SmallBatteryGlyph({ fraction }: { fraction: number }) {
  const f = Math.max(0, Math.min(1, fraction))
  const bodyW = GLYPH_SIZE
  const bodyH = Math.max(10, GLYPH_SIZE * 0.46)
  const stroke = Math.max(1.2, bodyH * 0.1)
  const cornerR = bodyH * 0.32
  const pad = stroke + Math.max(1.5, bodyH * 0.08)
  const innerH = bodyH - pad * 2
  const innerMaxW = bodyW - pad * 2
  const fillW = f > 0 ? Math.min(innerMaxW, Math.max(innerMaxW * f, innerH)) : 0
  const nubH = bodyH * 0.46
  const nubW = Math.max(1.5, bodyH * 0.16)
  const nubGap = Math.max(1, nubW * 0.4)
  const width = bodyW + nubGap + nubW
  return (
    <svg
      viewBox={`0 0 ${width} ${bodyH}`}
      width={width}
      height={bodyH}
      aria-hidden
      className="shrink-0 text-hinomaru-ink"
    >
      <rect
        x={stroke / 2}
        y={stroke / 2}
        width={bodyW - stroke}
        height={bodyH - stroke}
        rx={cornerR}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <rect
        x={pad}
        y={pad}
        width={fillW}
        height={innerH}
        rx={Math.max(1, cornerR - pad * 0.6)}
        fill="currentColor"
      />
      <rect
        x={bodyW + nubGap}
        y={(bodyH - nubH) / 2}
        width={nubW}
        height={nubH}
        rx={nubW * 0.4}
        fill="currentColor"
      />
    </svg>
  )
}

function BatteryIcon({
  level,
  highlighted = false,
}: {
  level: number
  highlighted?: boolean
}) {
  return (
    <span className="relative inline-flex items-center" aria-hidden>
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
          width={Math.max(1, level * 17)}
          height="7"
          rx="1"
          fill={highlighted ? 'var(--hinomaru)' : 'currentColor'}
        />
      </svg>
      {highlighted && (
        <span
          className="absolute -inset-0.5 rounded-sm ring-1 ring-hinomaru/45"
          aria-hidden
        />
      )}
    </span>
  )
}
