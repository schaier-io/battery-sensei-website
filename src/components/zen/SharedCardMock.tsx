import { useTranslation } from 'react-i18next'
import { Sparkline } from '#/components/zen/Sparkline'

/** Card moods the app stamps a QR onto, minus `rescue` — that one already
 * has its own purpose-built mock in `RescueReceipt`. `default` covers a
 * scan that arrived without a readable `?card=`. */
export type MockCardVariant = 'wrapped' | 'health' | 'honors' | 'default'

/** Mini hanko per mood. Mirrors `CARD_KANJI` in FromSenseiPage so the seal
 * on the mock matches the big stamp at the top of the page. */
const KANJI: Record<MockCardVariant, string> = {
  wrapped: '暦',
  health: '健',
  honors: '誉',
  default: '縁',
}

/** Illustrative charge curve for the recap card: an ordinary week of
 * discharge-and-refill. Shape only — it is never anyone's real history. */
const RECAP_CURVE = [64, 95, 72, 39, 86, 55, 47, 92, 61, 84]

/** Checkup rails, strong to faint. Deliberately unlabelled and unnumbered:
 * the visitor's own readings are the reason to install, not ours to fake. */
const HEALTH_RAILS = [0.86, 0.62, 0.34]

/** Honors row: some seals earned, some still open. */
const HONORS_TOTAL = 5
const HONORS_EARNED = 3

/**
 * Generic mock of a Battery Sensei share card, for the QR landing at
 * `/from/$id`. Someone just scanned a card and arrived here; showing the
 * shape of that card is what makes the page's promise legible.
 *
 * Structure deliberately echoes `RescueReceipt` (same paper, same dashed
 * colophon, same mini hanko) so the `rescue` path and the other moods read
 * as siblings. Everything is illustrative: no figure on this card is a
 * claim about the sharer's Mac, and the figcaption above it says so.
 */
export function SharedCardMock({
  variant,
  className = '',
}: {
  variant: MockCardVariant
  className?: string
}) {
  const { t } = useTranslation()
  const key = `from.cardMock.${variant}`
  return (
    <div
      className={`relative flex flex-col gap-3.5 rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_85%,var(--paper-lift))] p-5 shadow-[0_18px_50px_-20px_rgba(28,26,23,0.45)] ${className}`}
    >
      {/* Colophon row */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-jp text-[10px] tracking-[0.3em] text-sumi-soft uppercase">
          電 池 先 生
        </span>
        <span className="text-[10px] uppercase tracking-wider text-nezumi">
          {t(`${key}.label`)}
        </span>
      </div>

      {/* Headline */}
      <h3 className="display-title text-[1.05rem] font-semibold leading-tight text-sumi">
        {t(`${key}.headline`)}
        <span className="block italic text-sumi-soft font-normal">
          {t(`${key}.headlineItalic`)}
        </span>
      </h3>

      {/* Variant mark — the one bit of ink that differs per mood. */}
      <div className="flex min-h-[52px] items-center justify-center">
        <CardMark variant={variant} />
      </div>

      <p className="text-[11px] leading-snug text-sumi-soft">
        {t(`${key}.note`)}
      </p>

      {/* Footer with hanko */}
      <div className="mt-1 flex items-center justify-between border-t border-dashed border-[var(--line-strong)] pt-3">
        <span className="text-[10px] uppercase tracking-wider text-sumi-soft">
          battery-sensei.app
        </span>
        {/* mini hanko */}
        <span
          className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-hinomaru font-jp text-base font-bold text-[#fff8eb] -rotate-3 shadow-sm"
          style={{
            boxShadow:
              'inset 0 0 0 1.5px rgba(255,248,235,0.18), 0 1px 0 rgba(0,0,0,0.04)',
          }}
        >
          {KANJI[variant]}
        </span>
      </div>
    </div>
  )
}

function CardMark({ variant }: { variant: MockCardVariant }) {
  if (variant === 'wrapped') {
    return <Sparkline values={RECAP_CURVE} height={48} min={0} max={100} />
  }

  if (variant === 'health') {
    return (
      <svg viewBox="0 0 240 44" className="w-full" aria-hidden>
        {HEALTH_RAILS.map((fill, i) => {
          const y = 8 + i * 14
          return (
            <g key={y}>
              <line
                x1="5"
                y1={y}
                x2="235"
                y2={y}
                stroke="var(--line)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="5"
                y1={y}
                x2={5 + 230 * fill}
                y2={y}
                stroke="var(--hinomaru)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity={0.72 - i * 0.16}
              />
            </g>
          )
        })}
      </svg>
    )
  }

  if (variant === 'honors') {
    return (
      <div className="flex items-center justify-center gap-2.5" aria-hidden>
        {Array.from({ length: HONORS_TOTAL }, (_, i) =>
          i < HONORS_EARNED ? (
            <span
              key={i}
              className="h-6 w-6 -rotate-3 rounded-[3px] bg-hinomaru shadow-[inset_0_0_0_1.5px_rgba(255,248,235,0.22)]"
            />
          ) : (
            <span
              key={i}
              className="h-6 w-6 rounded-[3px] border border-dashed border-[var(--line-strong)]"
            />
          ),
        )}
      </div>
    )
  }

  // default (縁) — two linked rings for the bond that brought them here.
  return (
    <svg viewBox="0 0 64 32" className="h-10 text-sumi-soft" aria-hidden>
      <circle
        cx="24"
        cy="16"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.75"
      />
      <circle
        cx="40"
        cy="16"
        r="11"
        fill="none"
        stroke="var(--hinomaru)"
        strokeWidth="1.6"
        opacity="0.85"
      />
    </svg>
  )
}
