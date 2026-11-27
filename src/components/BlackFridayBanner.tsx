import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, X } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { BLACK_FRIDAY_CODE } from '../../lib/black-friday'
import { PromoCode } from '#/components/PromoCode'
import { useBlackFriday } from '#/lib/use-black-friday'
import { useLifetimePrice } from '#/lib/use-price'

/** Per-viewer dismissal. Scoped to this campaign so a later sale shows. */
const DISMISS_KEY = 'bs:black-friday-2026:dismissed'

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Site-wide Black Friday strip above the header. Renders nothing until
 * the client confirms the offer is live (window open AND Polar quotes
 * the half price), so prerendered HTML and the post-sale site never
 * carry it. No end date on purpose.
 */
export function BlackFridayBanner() {
  const { t } = useTranslation()
  const lifetime = useLifetimePrice()
  const active = useBlackFriday(lifetime)
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => setDismissed(readDismissed()), [])

  if (!active || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage blocked: the strip still hides for this page view.
    }
  }

  return (
    <aside
      aria-label={t('blackFriday.label')}
      className="relative z-50 bg-hinomaru text-[#fdf8ee]"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-12 py-2.5 text-[0.875rem] sm:py-2">
        <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-0.5 text-center">
          <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-[#fdf8ee]/80">
            {t('blackFriday.label')}
          </span>
          <span className="font-medium">{t('blackFriday.headline')}</span>
          <span className="hidden tabular-nums text-[#fdf8ee]/85 sm:inline">
            <Trans
              i18nKey="blackFriday.priceLine"
              values={{
                discounted: lifetime.discounted.formatted,
                original: lifetime.original.formatted,
              }}
              components={[
                <span className="font-semibold text-[#fdf8ee]" />,
                <s className="decoration-[#fdf8ee]/70" />,
              ]}
            />
          </span>
        </p>
        <div className="flex items-center gap-3">
          <PromoCode code={BLACK_FRIDAY_CODE} tone="onInk" />
          <Link
            to="/checkout"
            search={{ tier: 'lifetime', cur: undefined }}
            className="group inline-flex h-8 items-center gap-1.5 rounded-md bg-[#fdf8ee] px-3 text-[0.8125rem] font-medium text-[#8f0022] transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fdf8ee]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-hinomaru"
          >
            {t('blackFriday.cta')}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('blackFriday.dismiss')}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#fdf8ee]/75 transition-colors hover:bg-[#fdf8ee]/10 hover:text-[#fdf8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fdf8ee]/60 sm:top-1/2 sm:-translate-y-1/2"
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </aside>
  )
}
