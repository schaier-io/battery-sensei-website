import { Trans, useTranslation } from 'react-i18next'
import { useDiscountAvailability } from '#/lib/use-discount-availability'

/**
 * Scarcity bar for the ZENMODE first-500 discount on the Lifetime card.
 *
 * Live counts come from `/api/discount-availability` (Polar). On any
 * failure the hook returns a static fallback (`used: 0`) so the bar
 * still renders an anchor (the 500-redemption cap) without making any
 * false scarcity claim.
 *
 * Three visual states:
 *   - Normal      → soft hinomaru fill, "X of 500 claimed"
 *   - Almost gone → ≤50 left, brighter hinomaru fill + warning copy
 *   - Sold out    → fully redeemed, neutral bar + "price returns to {full}"
 */
export function LimitedRedeemBar({ fullPriceFormatted }: { fullPriceFormatted: string }) {
  const { t } = useTranslation()
  const { max, remaining, live } = useDiscountAvailability()
  if (!live || max <= 0) return null
  // Fill = `remaining`, not `used`. Starts at 100% on day one with
  // the full 500 codes available; shrinks as buyers claim. The
  // visual matches the verbal copy ("X of 500 remaining") and reads
  // intuitively as scarcity: a wide bar today, a sliver tomorrow.
  const pct = Math.min(100, Math.max(0, (remaining / max) * 100))
  const soldOut = remaining === 0
  const almostGone = !soldOut && remaining <= 50

  const accentClass = soldOut
    ? 'bg-nezumi/45'
    : almostGone
      ? 'bg-hinomaru'
      : 'bg-hinomaru/70'

  return (
    <div className="mt-3.5 select-none" aria-live="polite">
      <div className="meta-label flex items-baseline justify-between gap-3">
        {soldOut ? (
          <span className="font-semibold text-nezumi">
            {t('pricing.lifetime.redeem.soldOut')}
          </span>
        ) : almostGone ? (
          <span className="font-semibold text-hinomaru-ink">
            {t('pricing.lifetime.redeem.almostGone', { remaining })}
          </span>
        ) : (
          <span className="text-sumi-soft">
            <Trans
              i18nKey="pricing.lifetime.redeem.label"
              values={{ remaining }}
              components={[<span className="font-semibold text-sumi tabular-nums" />]}
            />
          </span>
        )}
      </div>
      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className={`h-full ${accentClass} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
        {/* Quiet sheen that sweeps the bar every ~7s — replaces the old
            blinking live-dot. Only while the offer is still open. */}
        {!soldOut && <span aria-hidden className="redeem-bar-shimmer" />}
      </div>
      {soldOut && (
        <p className="mt-1.5 text-[0.75rem] text-sumi-soft">
          {t('pricing.lifetime.redeem.soldOutHint', { full: fullPriceFormatted })}
        </p>
      )}
    </div>
  )
}
