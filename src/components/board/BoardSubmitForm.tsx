import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Lightbulb, Send } from 'lucide-react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * Inline "Suggest a feature" form on the roadmap page — mirrors the
 * macOS app's Suggest tab so the browse → check-for-duplicates → submit
 * flow happens on one page. Submissions land in the same moderated
 * queue as every other source (POST /api/feature-requests).
 */
export function BoardSubmitForm() {
  const { t, i18n } = useTranslation()
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [ticketId, setTicketId] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setErrorMsg('')

    const form = event.currentTarget
    const company = (form.elements.namedItem('company') as HTMLInputElement | null)?.value ?? ''

    try {
      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          body: details,
          email,
          locale: i18n.language.split('-')[0],
          source: 'web',
          company,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        ticketId?: string
        error?: string
      }
      if (!response.ok || !data.ok) {
        setErrorMsg(data.error ?? t('board.submit.errorDefault'))
        setStatus('error')
        return
      }
      setTicketId(data.ticketId ?? '')
      setStatus('sent')
      setTitle('')
      setDetails('')
      setEmail('')
    } catch {
      setErrorMsg(t('board.submit.errorNetwork'))
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="paper-card relative flex flex-col items-center gap-3 overflow-hidden p-8 text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-matcha/[0.08] blur-2xl"
        />
        <span className="grid h-10 w-10 place-items-center rounded-full bg-matcha/[0.12] text-matcha">
          <Check className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <p className="display-title text-[1.0625rem] font-medium text-sumi">
          {t('board.submit.successTitle')}
        </p>
        <p className="max-w-md text-[0.9375rem] leading-[1.6] text-sumi-soft">
          {t('board.submit.successBody')}
        </p>
        {ticketId && (
          <p className="font-mono text-[0.75rem] text-nezumi">{ticketId}</p>
        )}
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-1 inline-flex h-9 items-center rounded-md border border-[var(--line)] px-4 text-[0.8125rem] font-medium text-sumi-soft transition-colors hover:text-sumi"
        >
          {t('board.submit.another')}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper-card relative flex flex-col gap-4 overflow-hidden p-6 sm:p-7"
      noValidate
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-hinomaru/[0.06] blur-2xl"
      />
      <header className="relative flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft display-title">
        <Lightbulb className="h-3.5 w-3.5 text-hinomaru-ink" strokeWidth={1.7} aria-hidden />
        {t('board.submit.heading')}
      </header>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="board-title" className="text-[0.8125rem] font-medium text-sumi">
          {t('board.submit.titleLabel')}
        </label>
        <input
          id="board-title"
          type="text"
          required
          minLength={4}
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
          placeholder={t('board.submit.titlePlaceholder')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="board-details" className="text-[0.8125rem] font-medium text-sumi">
          {t('board.submit.detailsLabel')}
        </label>
        <textarea
          id="board-details"
          required
          minLength={12}
          maxLength={4000}
          rows={4}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className={`${inputClass} resize-y leading-[1.55]`}
          placeholder={t('board.submit.detailsPlaceholder')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="board-email" className="text-[0.8125rem] font-medium text-sumi">
          {t('board.submit.emailLabel')}
          <span className="ml-2 text-[0.75rem] font-normal text-nezumi">
            {t('board.submit.emailHelp')}
          </span>
        </label>
        <input
          id="board-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder={t('board.submit.emailPlaceholder')}
        />
      </div>

      <label className="sr-only" aria-hidden="true">
        {t('contact.fields.company')}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          aria-live="polite"
          className={[
            'text-[0.8125rem] leading-snug',
            status === 'error' ? 'text-hinomaru-ink' : 'text-nezumi',
          ].join(' ')}
        >
          {status === 'error'
            ? errorMsg
            : status === 'sending'
              ? t('board.submit.sending')
              : t('board.submit.moderationNote')}
        </p>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-sumi group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send
            className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.7}
            aria-hidden
          />
          {status === 'sending' ? t('board.submit.sending') : t('board.submit.send')}
        </button>
      </div>
    </form>
  )
}

// Same brush-underline focus treatment as the contact form fields.
const inputClass = [
  'block w-full rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,var(--paper-lift))] px-3.5 py-2.5 text-[0.9375rem] text-sumi placeholder:text-nezumi/70',
  'transition-[colors,background-size,box-shadow] duration-[320ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
  'bg-no-repeat bg-[length:0%_1.5px] bg-[position:8px_calc(100%-2px)]',
  "bg-[image:linear-gradient(to_right,var(--hinomaru),color-mix(in_oklab,var(--hinomaru)_30%,transparent))]",
  'focus:bg-[length:calc(100%-16px)_1.5px] focus:border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-sumi/15',
].join(' ')
