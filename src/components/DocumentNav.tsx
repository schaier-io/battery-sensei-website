import { Reveal } from '#/components/zen/Reveal'

export type DocumentNavItem = {
  /** Must match the `id` of the section it points at. */
  anchor: string
  label: string
}

/**
 * Jump list for the long legal-register documents (/legal, /privacy).
 *
 * Both pages already gave every section a stable `id` + `scroll-mt-24`, but
 * nothing surfaced them: a reader who came for the refund contact or for
 * "who stores my data" had to scroll several thousand pixels past unrelated
 * sections to find it. This exposes the anchors that were always there.
 *
 * Deliberately not sticky. These are documents, not apps; a rail that
 * follows the reader would fight the calm the rest of the page is built on.
 */
export function DocumentNav({
  items,
  label,
  className = '',
}: {
  items: ReadonlyArray<DocumentNavItem>
  /** Accessible name for the nav landmark, e.g. "On this page". */
  label: string
  className?: string
}) {
  return (
    <Reveal
      as="nav"
      delay={420}
      aria-label={label}
      className={`rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,var(--paper-lift))] px-5 py-4 ${className}`}
    >
      <p className="meta-label mb-3 text-nezumi">{label}</p>
      <ol className="grid gap-x-6 gap-y-2 text-[0.9375rem] sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={item.anchor} className="flex gap-2.5">
            <span aria-hidden className="tabular-nums text-nezumi">
              {String(index + 1).padStart(2, '0')}
            </span>
            <a href={`#${item.anchor}`} className="zen-link text-sumi-soft hover:text-sumi">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </Reveal>
  )
}
