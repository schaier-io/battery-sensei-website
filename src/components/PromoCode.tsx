import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** How long the "Copied" confirmation stays before the chip resets. */
const COPIED_RESET_MS = 1800

type PromoCodeProps = {
  code: string
  /** `onInk` for the red banner strip, `onPaper` for cards. */
  tone?: 'onInk' | 'onPaper'
  className?: string
}

const TONE: Record<NonNullable<PromoCodeProps['tone']>, string> = {
  onInk:
    'border-[#fdf8ee]/45 text-[#fdf8ee] hover:border-[#fdf8ee]/80 hover:bg-[#fdf8ee]/10 focus-visible:ring-[#fdf8ee]/60',
  onPaper:
    'border-hinomaru/40 text-hinomaru-ink hover:border-hinomaru/70 hover:bg-hinomaru/[0.06] focus-visible:ring-hinomaru/40',
}

/**
 * A coupon-style chip: dashed border, monospace code, one click copies
 * it. The label swaps to "Copied" for a moment and is announced to
 * screen readers through the polite live region.
 */
export function PromoCode({ code, tone = 'onPaper', className = '' }: PromoCodeProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (insecure context, permissions). Select
      // the code instead, so one Cmd+C / Ctrl+C still copies it.
      const node = codeRef.current
      const selection = window.getSelection()
      if (node && selection) selection.selectAllChildren(node)
    }
  }

  const Icon = copied ? Check : Copy
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('blackFriday.copyLabel', { code })}
      className={`group inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-dashed px-2.5 font-mono text-[0.8125rem] font-medium tracking-[0.08em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ${TONE[tone]} ${className}`}
    >
      <span ref={codeRef} className="select-all">
        {code}
      </span>
      <span aria-hidden className="h-3.5 w-px bg-current opacity-30" />
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      <span className="sr-only" aria-live="polite">
        {copied ? t('blackFriday.copied') : ''}
      </span>
    </button>
  )
}
