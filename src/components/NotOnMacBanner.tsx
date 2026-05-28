import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Monitor, X } from 'lucide-react'
import { useIsMac } from '#/lib/use-is-mac'

/**
 * Non-blocking informational banner for the checkout page. Shows only
 * when the visitor is not on a Mac. They can still buy a license — the
 * common cases are buying ahead of a new Mac, or buying for a family
 * member — but they need to know the app won't run on the device
 * they're paying from. Dismissible per-session.
 *
 * Renders nothing during SSR + the first React paint, then mounts on
 * the client once the platform check resolves. The fade-in animation
 * (`zen-fade-in` if defined; falls back to a simple opacity transition)
 * keeps the appearance from feeling like a layout bump.
 */
export function NotOnMacBanner() {
  const { t } = useTranslation()
  const isMac = useIsMac()
  const [dismissed, setDismissed] = useState(false)

  if (isMac !== false || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex items-start gap-3 rounded-md border border-hinomaru/25 bg-hinomaru/[0.05] px-4 py-3 sm:px-5 sm:py-3.5"
    >
      <Monitor
        className="mt-0.5 h-4 w-4 shrink-0 text-hinomaru"
        strokeWidth={1.7}
        aria-hidden
      />
      <div className="flex-1 text-[0.875rem] leading-relaxed text-sumi md:text-[0.9375rem]">
        <p>
          <strong className="font-medium">{t('macOnly.bannerHeading')}</strong>{' '}
          {t('macOnly.bannerBody')}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('macOnly.dismiss')}
        className="shrink-0 rounded p-1 text-sumi-soft transition-colors hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  )
}
