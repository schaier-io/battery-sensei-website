import { useTranslation } from 'react-i18next'

const items: { href: string; key: string }[] = [
  { href: '#features', key: 'alerts' },
  { href: '#features', key: 'chargeLimit' },
  { href: '#features', key: 'travelMode' },
  { href: '#health', key: 'cycle' },
  { href: '#health', key: 'watts' },
  { href: '#saga', key: 'history' },
  // Comparison row now lives directly on the homepage Compare section,
  // not on a separate /vs-aldente subpage — link points to the anchor.
  { href: '#compare', key: 'aldenteAlt' },
]

export function Categories() {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('categories.ariaLabel')}
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
        {items.map(({ href, key }) => (
          <a
            key={key}
            href={href}
            className="shrink-0 whitespace-nowrap text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi focus-visible:outline-none focus-visible:text-sumi"
          >
            {t(`categories.items.${key}`)}
          </a>
        ))}
      </div>
    </section>
  )
}
