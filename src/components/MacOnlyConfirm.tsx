import { useState, type ReactNode } from 'react'
import { AlertDialog } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { Monitor, Download, ArrowRight } from 'lucide-react'
import { useIsMac } from '#/lib/use-is-mac'

/**
 * Controlled "Battery Sensei is macOS only" dialog. Pure UI — caller
 * owns the open state and the continue handler. Use this when the
 * decision to show the dialog comes from a non-click trigger (form
 * submit, programmatic navigation, post-payment redirect intercept).
 *
 * For anchor / button clicks, prefer the `<MacOnlyConfirm>` render-prop
 * wrapper below, which handles the `isMac` check + open state for you.
 */
export function MacOnlyConfirmDialog({
  open,
  onOpenChange,
  onContinue,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
}) {
  const { t } = useTranslation()
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="fixed inset-0 z-50 bg-sumi/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-[var(--line)] bg-[var(--washi)] p-6 shadow-[0_24px_60px_-20px_rgba(28,26,23,0.35)] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 sm:p-7"
        >
          <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-hinomaru/80">
            <Monitor className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            {t('macOnly.kicker')}
          </div>
          <AlertDialog.Title className="display-title text-[1.375rem] font-semibold leading-[1.18] tracking-[-0.01em] text-sumi md:text-[1.5rem]">
            {t('macOnly.title')}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-[0.9375rem] leading-relaxed text-sumi-soft md:text-[1rem]">
            {t('macOnly.body')}
          </AlertDialog.Description>
          <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-4 text-[0.875rem] font-medium text-sumi transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:bg-washi-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/30"
              >
                {t('macOnly.cancel')}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onContinue}
                className="btn-sumi group inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[0.875rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                {t('macOnly.continue')}
                <ArrowRight
                  className="h-3.5 w-3.5 -mr-0.5 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-0.5"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

type WrapperProps = {
  /** Render-prop trigger. Attach the supplied `onClick` to your anchor /
   * button so we can intercept it. The render prop pattern lets every
   * caller keep its own styling. */
  children: (props: { onClick: (event: React.MouseEvent) => void }) => ReactNode
  /** Called when the user confirms they want to continue, OR when the
   * isMac check resolves to true (no dialog shown). */
  onConfirm: () => void
}

/**
 * Wraps a download CTA with a "this app is macOS only" confirmation
 * dialog. Behavior by visitor:
 *
 *  - On Mac: never shows the dialog; calls `onConfirm()` straight away.
 *  - On Windows/Linux/iOS/Android: intercepts the click, opens the
 *    dialog, and only calls `onConfirm()` if the visitor presses
 *    "Continue anyway."
 *  - During SSR + the first React paint: behaves like "on Mac" (skips
 *    the dialog). This avoids a flash of the warning before
 *    `navigator` is read. The trade-off is that a non-Mac visitor who
 *    clicks within the first ~50 ms after page load won't see the
 *    warning. That's a vanishingly small window and the worst-case
 *    outcome is they read it on the next click.
 */
export function MacOnlyConfirm({ children, onConfirm }: WrapperProps) {
  const isMac = useIsMac()
  const [open, setOpen] = useState(false)

  const handleClick = (event: React.MouseEvent) => {
    // `null` (pre-hydration) and `true` (confirmed Mac) both pass through
    // without interception. Only `false` opens the dialog.
    if (isMac !== false) return
    event.preventDefault()
    setOpen(true)
  }

  const handleContinue = () => {
    setOpen(false)
    onConfirm()
  }

  return (
    <>
      {children({ onClick: handleClick })}
      <MacOnlyConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onContinue={handleContinue}
      />
    </>
  )
}
