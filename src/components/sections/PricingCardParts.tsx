import { Laptop } from 'lucide-react'
import type { ReactNode } from 'react'

/** Shared primary CTA geometry — all three tiers lock to exactly 2.75rem tall. */
export const PRICING_CTA_BTN =
  'group box-border inline-flex h-11 min-h-11 max-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]'

/**
 * Prominent "how many Macs one license covers" chip. Pulls the Mac-count
 * scope out of the small period line into a Laptop-iconed pill directly
 * under the price so it reads at a glance on both paid cards.
 *   - `accent` (Lifetime) → hinomaru wash, matching the card's ring.
 *   - default (Yearly Patron) → quiet sumi container.
 */
export function MacScopeBadge({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span
      className={
        accent
          ? 'mt-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--hinomaru)_10%,var(--washi))] px-2.5 py-1 text-[0.75rem] font-medium tracking-wide text-hinomaru-ink'
          : 'mt-3 inline-flex items-center gap-1.5 rounded-full bg-sumi/[0.06] px-2.5 py-1 text-[0.75rem] font-medium tracking-wide text-sumi'
      }
    >
      <Laptop className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
      {label}
    </span>
  )
}

/**
 * Pins pre-CTA copy, the CTA, and the post-CTA row (content or spacer) to the
 * card bottom with a fixed footer height so all three primary buttons share
 * the same baseline across the pricing grid.
 */
export function PricingCardFooter({
  pre,
  cta,
  post,
}: {
  pre: ReactNode
  cta: ReactNode
  post?: ReactNode
}) {
  return (
    <div className="pricing-card-footer">
      <div className="pricing-card-footer__pre">{pre}</div>
      <div className="pricing-card-footer__cta">{cta}</div>
      <div className="pricing-card-footer__post">
        {post ?? <span className="block w-full" aria-hidden />}
      </div>
    </div>
  )
}
