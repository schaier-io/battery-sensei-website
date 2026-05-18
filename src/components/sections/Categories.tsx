/**
 * A horizontal strip of in-page links labelling Sensei's core categories.
 * Doubles as cheap navigation and gives crawlers a clean, keyword-rich
 * link structure to the relevant section anchors.
 */
const items: { href: string; label: string }[] = [
  { href: '#features', label: 'Smart battery warnings' },
  { href: '#features', label: 'Charge limits' },
  { href: '#features', label: 'Travel Mode' },
  { href: '#health', label: 'Battery health' },
  { href: '#health', label: 'Cycle count' },
  { href: '#saga', label: 'Personal history' },
  { href: '#features', label: 'Menu-bar app' },
]

export function Categories() {
  return (
    <section
      aria-label="Battery Sensei categories"
      className="border-y border-[var(--line)] bg-[color-mix(in_oklab,var(--washi-soft)_70%,transparent)] py-5 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-6 text-[11px] tracking-wider uppercase">
        <span className="font-jp normal-case tracking-[0.3em] text-hinomaru/90 text-xs">
          機能
        </span>
        {items.map(({ href, label }, i) => (
          <a
            key={`${label}-${i}`}
            href={href}
            className="text-sumi-soft hover:text-sumi transition-colors"
          >
            {label}
          </a>
        ))}
      </div>
    </section>
  )
}
