import type { ReactElement } from 'react'

type Entry = {
  amount: number
  currency: string
  locale: string
}

type Props = {
  /** Price entry — needs amount + currency + locale. */
  entry: Entry
  /** Class applied to the outer wrapper (use the display-title styles here). */
  className?: string
  /** Class applied to the currency symbol. Override for unusual contexts;
   *  default makes the symbol smaller, sans-serif, and a touch quieter so
   *  it reads as a typographic mark next to the amount instead of fighting
   *  the headline glyphs (EB Garamond / Spectral $ is awkward at display
   *  sizes). */
  symbolClassName?: string
}

/**
 * Renders a localized price with the currency symbol split from the
 * digits so each can be styled separately. The display serif's `$`
 * glyph reads narrow and tinny next to large digits; rendering the
 * symbol in the sans family at ~60% size with a small baseline lift
 * gives the amount room to be the headline.
 *
 * Locale-aware: respects the natural symbol position (prefix in en-US,
 * suffix in fr-FR), the local literal gap between symbol and digits
 * (NBSP in many European locales), and locale-specific decimal /
 * grouping separators via `Intl.NumberFormat.formatToParts`.
 *
 * Whole-currency entries (JPY ¥590, NOK kr 39) drop decimals
 * automatically; mixed entries keep two-digit precision.
 */
export function PriceDisplay({ entry, className, symbolClassName }: Props): ReactElement {
  const wholeOnly = entry.amount % 1 === 0
  const parts = new Intl.NumberFormat(entry.locale, {
    style: 'currency',
    currency: entry.currency,
    minimumFractionDigits: wholeOnly ? 0 : 2,
    maximumFractionDigits: wholeOnly ? 0 : 2,
  }).formatToParts(entry.amount)

  const symbolIndex = parts.findIndex((p) => p.type === 'currency')
  const firstDigit = parts.findIndex((p) => p.type === 'integer')
  // If there's no digit segment (shouldn't happen for real prices) just
  // render the raw Intl output as a fallback so we don't lose the price.
  if (symbolIndex < 0 || firstDigit < 0) {
    return <span className={className}>{parts.map((p) => p.value).join('')}</span>
  }
  const symbolBefore = symbolIndex < firstDigit

  const symbol = parts[symbolIndex].value
  const amount = parts
    .filter((_, i) => i !== symbolIndex)
    .map((p) => (p.type === 'literal' ? '' : p.value))
    .join('')
    .trim()

  const symbolEl = (
    <span
      // Inline `vertical-align` lifts the symbol ~0.08em above the digit
      // baseline so it cap-aligns visually with the digits instead of
      // sitting low like a subscript. Without this the symbol reads as a
      // typographic afterthought; with it the price feels intentional.
      style={{ verticalAlign: '0.08em' }}
      className={
        symbolClassName ??
        // 0.6em keeps the symbol comfortably inside the cap-height of
        // the amount. Source Sans is the body family — its `$`, `€`,
        // `£` are clean and tabular. `font-normal` undoes the display
        // title's 500-weight cascade.
        'font-sans text-[0.6em] font-normal tracking-[0.02em] text-sumi-soft'
      }
    >
      {symbol}
    </span>
  )

  return (
    <span className={className}>
      {symbolBefore ? (
        <>
          {symbolEl}
          <span className="ml-[0.12em] tabular-nums">{amount}</span>
        </>
      ) : (
        <>
          <span className="mr-[0.16em] tabular-nums">{amount}</span>
          {symbolEl}
        </>
      )}
    </span>
  )
}
