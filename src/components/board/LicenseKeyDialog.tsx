import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

/**
 * Asks for the visitor's Battery Sensei license key and validates it via
 * the vote endpoint's `check` action. The key is masked by default,
 * travels only in the POST body, and on success is handed back to the
 * board (which persists it via board-license.ts and fires any pending
 * vote). Buyers arriving from checkout never see this — their key was
 * auto-stored on the thank-you page.
 */
export function LicenseKeyDialog({
  open,
  onOpenChange,
  onValidated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onValidated: (key: string, votedIds: string[]) => void
}) {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = key.trim()
    if (!trimmed || checking) return
    setChecking(true)
    setError('')
    try {
      const response = await fetch('/api/feature-requests/vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'check', licenseKey: trimmed }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        valid?: boolean
        votedIds?: string[]
        error?: string
      }
      if (response.status === 200 && data.ok && data.valid) {
        setKey('')
        onValidated(trimmed, data.votedIds ?? [])
      } else if (response.status === 200 && data.valid === false) {
        setError(t('board.license.invalid'))
      } else {
        setError(data.error ?? t('board.license.error'))
      }
    } catch {
      setError(t('board.license.error'))
    } finally {
      setChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--line)] bg-[var(--washi)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="display-title flex items-center gap-2 text-[1.125rem] font-medium text-sumi">
            <KeyRound className="h-4.5 w-4.5 text-hinomaru" strokeWidth={1.7} aria-hidden />
            {t('board.license.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-[0.875rem] leading-[1.55] text-sumi-soft">
            {t('board.license.dialogBody')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={revealed ? 'text' : 'password'}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder={t('board.license.placeholder')}
              autoComplete="off"
              spellCheck={false}
              maxLength={256}
              aria-label={t('board.license.placeholder')}
              className="block w-full rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-2.5 pr-11 font-mono text-[0.875rem] text-sumi placeholder:font-sans placeholder:text-nezumi/70 focus:border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-sumi/15"
            />
            <button
              type="button"
              onClick={() => setRevealed((prev) => !prev)}
              aria-label={revealed ? t('board.license.hide') : t('board.license.show')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nezumi transition-colors hover:text-sumi"
            >
              {revealed ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              )}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[0.8125rem] text-hinomaru">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={checking || key.trim().length === 0}
            className="btn-sumi inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? t('board.license.checking') : t('board.license.submit')}
          </button>

          <p className="flex items-start gap-1.5 text-[0.75rem] leading-[1.5] text-nezumi">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden />
            {t('board.license.privacyNote')}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
