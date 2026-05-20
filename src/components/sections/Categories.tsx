/**
 * Slim category strip directly under the nav — quiet, scannable,
 * doubles as inline navigation + keyword-rich anchor links for crawlers.
 */
const items: { href: string; label: string }[] = [
  { href: '#features', label: 'Smart warnings' },
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
      aria-label="Battery Sensei capabilities"
      className="relative border-y border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi-soft)_70%,transparent)] backdrop-blur-[3px]"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-5 py-3.5 text-[11px] uppercase tracking-[0.18em] sm:px-8 sm:py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span
          aria-hidden
          className="font-jp normal-case tracking-[0.32em] text-hinomaru/80 text-xs shrink-0"
        >
          機能
        </span>
        <span aria-hidden className="h-3 w-px shrink-0 bg-[var(--line-strong)]" />
        {items.map(({ href, label }, i) => (
          <a
            key={`${label}-${i}`}
            href={href}
            className="shrink-0 whitespace-nowrap text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi focus-visible:outline-none focus-visible:text-sumi"
          >
            {label}
          </a>
        ))}
      </div>
    </section>
  )
}
