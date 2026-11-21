import { Check, Download } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { MacOnlyConfirmDialog } from '#/components/MacOnlyConfirm'
import { detectIsMac } from '#/lib/use-is-mac'
import { PRICING_CTA_BTN, PricingCardFooter } from '#/components/sections/PricingCardParts'

/**
 * Download for the Free card, with an optional email field.
 *
 * Marketing-psychology design:
 *   - Default path is the email opt-in (Default Effect). The form is
 *     the visible action, and the field is marked optional.
 *   - Reciprocity: you give us an email, we hand you the download
 *     plus one quiet email per release. Honest trade, no clutter.
 *   - Self-determination: the email is labelled optional and an empty
 *     field downloads straight away. No gate, no second link to find.
 *   - Reduced friction (BJ Fogg): single email field, no name, no
 *     extra confirmation; submit fires the download immediately so
 *     the visitor never waits for an email-link round-trip.
 *
 * The API call is fire-and-forget — a network failure never blocks
 * the download. The visitor is always served the .pkg installer.
 */
export function FreeDownloadForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  // 'invalid' = bad email (client). 'success'/'error' = signup POST
  // outcome, surfaced after we fire the download so the visitor gets a
  // clear "check your inbox" / "didn't go through" confirmation.
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'invalid' | 'success' | 'error'
  >('idle')
  const [macConfirmOpen, setMacConfirmOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // `#free-download-email` belongs to the pricing-card grid, so Download CTAs
  // keep a useful, shareable anchor while landing on the tier prices. On this
  // page, intercept clicks to stop focus from triggering a competing native
  // input jump; focus first, then smoothly position the grid at its anchor
  // offset. Cross-page `/#free-download-email` links use the same hash-load
  // path below.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isTarget = () => window.location.hash === '#free-download-email'

    function scrollToCards() {
      const cards = document.getElementById('free-download-email')
      if (!cards) return
      cards.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }

    function focusAndPositionCards() {
      inputRef.current?.focus({ preventScroll: true })
      scrollToCards()
    }

    function landOnDownload() {
      if (!isTarget()) return
      window.requestAnimationFrame(focusAndPositionCards)
    }

    function onDownloadClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) return
      const link = event.target.closest<HTMLAnchorElement>(
        'a[href="#free-download-email"]',
      )
      if (!link) return

      event.preventDefault()
      if (!isTarget()) {
        window.history.pushState(null, '', '#free-download-email')
      }
      focusAndPositionCards()
    }

    landOnDownload()
    window.addEventListener('hashchange', landOnDownload)
    document.addEventListener('click', onDownloadClick)
    return () => {
      window.removeEventListener('hashchange', landOnDownload)
      document.removeEventListener('click', onDownloadClick)
    }
  }, [])

  const trimmedEmail = email.trim()
  const isEmpty = trimmedEmail.length === 0
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)

  function startDownload() {
    window.location.assign('/download/latest')
  }

  /** Mac visitors go straight to the file; everyone else gets the
      macOS-only confirm first. Shared by the with-email and the
      empty-field paths so both behave identically once the (optional)
      signup is out of the way. */
  function proceedToDownload() {
    if (detectIsMac()) {
      startDownload()
    } else {
      setMacConfirmOpen(true)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    // The address is OPTIONAL — the card offers release alerts, it doesn't
    // gate the download on them. An empty field therefore means "just give
    // me the app" and must not block the primary CTA; only a non-empty,
    // malformed address is an error worth stopping for.
    if (isEmpty) {
      proceedToDownload()
      return
    }
    if (!isValid) {
      setStatus('invalid')
      return
    }
    setStatus('sending')
    // Best-effort signup — a failure never blocks the download. We DO
    // surface the outcome though: the visitor stays on the page (the
    // download/dialog doesn't unload it), so a "check your inbox" /
    // "didn't go through" line is worth showing.
    let ok = false
    try {
      const res = await fetch('/api/free-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale: i18n.language,
          source: 'pricing-free',
        }),
        keepalive: true,
      })
      ok = res.ok
    } catch {
      // intentional: don't block download on network/api failure
    }
    setStatus(ok ? 'success' : 'error')
    // Platform check happens after the API ping so the email-capture
    // signup still lands even if the visitor cancels the download
    // (someone researching on Windows for a Mac at home is still a
    // qualified lead).
    proceedToDownload()
  }

  return (
    <>
      {/* The form is the Free card's bottom-anchored flex child. It wraps
          PricingCardFooter, whose own `margin-top:auto` can't fire inside a
          block <form>, so the form carries `mt-auto` instead — this lines the
          "Get download" CTA up with "Get Lifetime" / "Become a patron". */}
      <form onSubmit={handleSubmit} noValidate className="mt-auto">
        <PricingCardFooter
          pre={
            <>
              <label
                htmlFor="free-download-email-input"
                className="flex items-baseline justify-between gap-2 text-[0.74rem] font-medium uppercase tracking-[0.14em] text-sumi-soft/85"
              >
                {t('pricing.free.email.label')}
                <span className="shrink-0 normal-case tracking-normal text-nezumi">
                  {t('pricing.free.email.optional')}
                </span>
              </label>
              <input
                ref={inputRef}
                id="free-download-email-input"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status !== 'idle' && status !== 'sending') setStatus('idle')
                }}
                placeholder={t('pricing.free.email.placeholder')}
                aria-invalid={status === 'invalid'}
                className="mt-2 block h-11 w-full min-w-0 rounded-md border border-[color-mix(in_oklab,var(--sumi)_16%,transparent)] bg-[color-mix(in_oklab,var(--washi)_72%,var(--paper-lift))] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/25"
              />
              {/* One line occupies this slot in every state, so the fixed
                  footer height never shifts: footnote → invalid/success/error. */}
              {status === 'success' ? (
                <p className="mt-2 inline-flex items-start gap-1.5 text-[0.73rem] leading-[1.55] text-matcha">
                  <Check className="mt-[2px] h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                  {t('pricing.free.email.success')}
                </p>
              ) : status === 'error' ? (
                <p role="alert" className="mt-2 text-[0.73rem] leading-[1.55] text-hinomaru-ink">
                  {t('pricing.free.email.error')}
                </p>
              ) : status === 'invalid' ? (
                <p role="alert" className="mt-2 text-[0.73rem] leading-[1.55] text-hinomaru-ink">
                  {t('pricing.free.email.errorInvalid')}
                </p>
              ) : (
                <p className="mt-2 text-[0.73rem] leading-[1.55] text-sumi-soft/90">
                  {t('pricing.free.email.footnote')}
                </p>
              )}
            </>
          }
          cta={
            <button
              id="free-download-submit"
              type="submit"
              disabled={status === 'sending'}
              style={{ scrollMarginBottom: '1.25rem' }}
              className={`btn-sumi ${PRICING_CTA_BTN} disabled:opacity-70`}
            >
              <Download
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
                aria-hidden
              />
              {status === 'sending'
                ? t('pricing.free.email.sending')
                : t('pricing.free.email.cta')}
            </button>
          }
        />
      </form>
      <MacOnlyConfirmDialog
        open={macConfirmOpen}
        onOpenChange={setMacConfirmOpen}
        onContinue={() => {
          setMacConfirmOpen(false)
          startDownload()
        }}
      />
    </>
  )
}
