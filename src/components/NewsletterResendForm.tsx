import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Send } from 'lucide-react'

/**
 * Inline resend form for the double-opt-in flow. Posts to
 * /api/free-signup (the same endpoint the homepage Free download card
 * uses) so the confirm flow runs through the canonical path — no
 * special-case resend endpoint to maintain.
 *
 * Shared by both dead ends a confirmation link can reach:
 *   /newsletter/confirmed?status=invalid  — the server rejected the token
 *   /newsletter/confirm without a usable link — nothing to POST with
 * Both leave the visitor mid-journey with no subscription, and the one
 * thing that fixes either is a fresh link, so both get this form rather
 * than a hidden button on one page and a dead one on the other.
 *
 * Styling deliberately mirrors the pricing Free signup so visitors see
 * a familiar control: same input geometry (h-11, rounded-md, sumi
 * border at 16% opacity, washi-tinted background), same focus ring,
 * same icon-led submit button (`btn-sumi` would be ideal but it lives
 * in the pricing module — we replicate the geometry inline so this
 * component stays self-contained).
 */
export function NewsletterResendForm({
  currentLocale,
  prefillEmail,
}: {
  currentLocale: string
  prefillEmail?: string
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error' | 'invalid-email'
  >('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('invalid-email')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('/api/free-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          locale: currentLocale,
          source: 'resend_confirm',
          ...(website ? { website } : {}),
        }),
      })
      if (!res.ok) {
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  // Status banner copy. Lives in a fixed-height slot ABOVE the input so
  // the form never reflows when state changes between idle → sending →
  // success / error / invalid-email. Empty string in idle/sending keeps
  // the slot blank but reserved.
  let banner: { tone: 'success' | 'error' | 'none'; text: string } = {
    tone: 'none',
    text: '',
  }
  if (status === 'success') {
    banner = {
      tone: 'success',
      text: t('newsletter.confirmed.invalid.resentSuccess'),
    }
  } else if (status === 'invalid-email') {
    banner = {
      tone: 'error',
      text: t('newsletter.confirmed.invalid.invalidEmail'),
    }
  } else if (status === 'error') {
    banner = {
      tone: 'error',
      text: t('newsletter.confirmed.invalid.resendError'),
    }
  }

  const isSuccess = status === 'success'

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 text-left"
    >
      {/* Honeypot — off-screen for sighted users, off the tab order. */}
      <label
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
        aria-hidden
      >
        Website
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>
      <label
        htmlFor="resend-email"
        className="block text-[0.74rem] font-medium uppercase tracking-[0.14em] text-sumi-soft/85"
      >
        {t('newsletter.confirmed.invalid.emailLabel')}
      </label>
      {/* Fixed-height status slot ABOVE the input. Reserved space means
          no layout shift when the banner toggles; aria-live announces
          state changes to screen readers. */}
      <div
        className="min-h-[1.5rem] text-[0.8125rem] leading-snug"
        aria-live="polite"
        role={banner.tone === 'error' ? 'alert' : undefined}
      >
        {banner.tone === 'success' && (
          <span className="inline-flex items-center gap-1.5 font-medium text-matcha">
            <CheckCircle2
              className="h-4 w-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            {banner.text}
          </span>
        )}
        {banner.tone === 'error' && (
          <span className="inline-flex items-center gap-1.5 font-medium text-hinomaru-ink">
            <AlertCircle
              className="h-4 w-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            {banner.text}{' '}
            <span className="font-normal text-hinomaru-ink/85">
              {t('newsletter.confirmed.invalid.tryAgain')}
            </span>
          </span>
        )}
      </div>
      <input
        id="resend-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        disabled={isSuccess}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (status === 'invalid-email' || status === 'error') setStatus('idle')
        }}
        placeholder={t('newsletter.confirmed.invalid.emailPlaceholder')}
        className="block h-11 w-full min-w-0 rounded-md border border-[color-mix(in_oklab,var(--sumi)_16%,transparent)] bg-[color-mix(in_oklab,var(--washi)_72%,var(--paper-lift))] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/25 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === 'sending' || isSuccess}
        className="group mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sumi px-4 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Send
          className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-0.5"
          strokeWidth={1.8}
          aria-hidden
        />
        {status === 'sending'
          ? t('newsletter.confirmed.invalid.submitting')
          : t('newsletter.confirmed.invalid.resendCta')}
      </button>
    </form>
  )
}
