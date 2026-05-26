import { useState, type FormEvent } from 'react'
import { Bug, Mail, Send, ShieldCheck, Lightbulb, Sparkles } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { GithubMark } from '#/components/icons/GithubMark'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Topic = 'bug' | 'feature' | 'billing' | 'other'
type Status = 'idle' | 'sending' | 'sent' | 'error'

const TOPIC_ORDER: ReadonlyArray<Topic> = ['feature', 'bug', 'billing', 'other']

const ISSUES_URL = 'https://github.com/schaier-io/battery-sensei-releases/issues/new/choose'
const EMAIL = 'info@battery-sensei.app'

export function Contact() {
  const { t } = useTranslation()
  const [topic, setTopic] = useState<Topic>('feature')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return

    setStatus('sending')
    setErrorMsg('')

    const form = event.currentTarget
    const company = (form.elements.namedItem('company') as HTMLInputElement | null)?.value ?? ''

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic, name, email, subject, message, company }),
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }

      if (!response.ok || !data.ok) {
        setErrorMsg(data.error ?? t('contact.status.errorDefault'))
        setStatus('error')
        return
      }
      setStatus('sent')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch {
      setErrorMsg(t('contact.status.errorNetwork'))
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="zen-section px-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 flex flex-col items-center text-center">
          <Hanko kanji="文" className="mb-5" />
          <Reveal as="p" delay={120} className="kicker-row mb-4">
            {t('contact.kicker')}
          </Reveal>
          <Reveal as="h2" delay={200} className="section-heading text-sumi">
            {t('contact.heading')} <span className="italic text-sumi-soft font-normal">{t('contact.headingItalic')}</span>
          </Reveal>
          <Reveal
            as="p"
            delay={280}
            className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
          >
            {t('contact.intro')}
          </Reveal>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <Reveal delay={120}>
            <form
              onSubmit={handleSubmit}
              className="paper-card flex h-full flex-col gap-5 p-6 sm:p-8"
              aria-describedby="contact-form-help"
              noValidate
            >
              <header className="flex items-center justify-between gap-4">
                <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
                  {t('contact.privateMessage')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-nezumi">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  {t('contact.notStored')}
                </span>
              </header>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-[0.8125rem] font-medium text-sumi mb-1">
                  {t('contact.topicLegend')}
                </legend>
                <div
                  role="radiogroup"
                  aria-label={t('contact.topicLegend')}
                  className="grid grid-cols-2 gap-2"
                >
                  {TOPIC_ORDER.map((value) => {
                    const active = topic === value
                    return (
                      <label
                        key={value}
                        className={[
                          'group relative cursor-pointer rounded-md border px-3 py-2.5 text-left transition-colors duration-200',
                          active
                            ? 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_55%,#fff)]'
                            : 'border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_72%,#fff)] hover:border-[var(--line-strong)]',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="topic"
                          value={value}
                          checked={active}
                          onChange={() => setTopic(value)}
                          className="sr-only"
                        />
                        <span className="display-title block text-[0.9375rem] font-medium text-sumi leading-snug">
                          {t(`contact.topics.${value}.label`)}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] leading-snug text-nezumi">
                          {t(`contact.topics.${value}.hint`)}
                        </span>
                        <span
                          aria-hidden
                          className={[
                            'absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full transition-opacity duration-200',
                            active ? 'bg-hinomaru opacity-100' : 'opacity-0',
                          ].join(' ')}
                        />
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('contact.fields.name')} htmlFor="contact-name">
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('contact.fields.email')} htmlFor="contact-email">
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field
                label={t('contact.fields.subject')}
                htmlFor="contact-subject"
                hint={t('contact.fields.subjectHint')}
              >
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  maxLength={160}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                  placeholder={
                    topic === 'billing'
                      ? t('contact.fields.subjectPlaceholderBilling')
                      : t('contact.fields.subjectPlaceholder')
                  }
                />
              </Field>

              <Field
                label={t('contact.fields.message')}
                htmlFor="contact-message"
                hint={t('contact.fields.messageHint')}
              >
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  minLength={12}
                  maxLength={8000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className={`${inputClass} resize-y leading-[1.55]`}
                />
              </Field>

              <label className="sr-only" aria-hidden="true">
                {t('contact.fields.company')}
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              <p id="contact-form-help" className="sr-only">
                {t('contact.formHelp')}
              </p>

              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p
                  role="status"
                  aria-live="polite"
                  className={[
                    'text-[0.8125rem] leading-snug',
                    status === 'error' ? 'text-hinomaru' :
                    status === 'sent'  ? 'text-matcha font-medium' :
                    'text-nezumi',
                  ].join(' ')}
                >
                  {status === 'sent'   ? t('contact.status.sent') :
                   status === 'error'  ? errorMsg :
                   status === 'sending'? t('contact.status.sending') :
                   t('contact.status.idle')}
                </p>

                <button
                  type="submit"
                  disabled={status === 'sending' || status === 'sent'}
                  className="btn-sumi group inline-flex h-11 items-center justify-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send
                    className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.7}
                  />
                  {status === 'sent'
                    ? t('contact.buttons.sent')
                    : status === 'sending'
                      ? t('contact.buttons.sending')
                      : t('contact.buttons.send')}
                </button>
              </div>
            </form>
          </Reveal>

          <div className="flex flex-col gap-4">
            <Reveal delay={200}>
              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noreferrer"
                className="paper-card group relative flex flex-col gap-4 overflow-hidden p-6 transition-transform duration-300"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-hinomaru/[0.06] blur-2xl"
                />
                <header className="relative flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft display-title">
                    <Sparkles className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.7} aria-hidden />
                    {t('contact.github.label')}
                  </span>
                  <GithubMark className="h-4 w-4 text-nezumi transition-colors group-hover:text-sumi" strokeWidth={1.6} />
                </header>
                <p className="display-title relative text-[1.125rem] font-medium leading-snug text-sumi">
                  {t('contact.github.title')}
                </p>
                <div className="relative -mx-1 flex flex-wrap gap-1.5">
                  <PathChip icon={Lightbulb} label={t('contact.github.paths.idea')} accent="hinomaru" />
                  <PathChip icon={Bug} label={t('contact.github.paths.bug')} accent="kin" />
                  <PathChip icon={Mail} label={t('contact.github.paths.curious')} accent="nezumi" />
                </div>
                <p className="relative text-[0.875rem] leading-[1.55] text-sumi-soft">
                  {t('contact.github.body')}
                </p>
                <span className="relative mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-sumi transition-colors group-hover:text-hinomaru">
                  {t('contact.github.cta')}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                </span>
              </a>
            </Reveal>

            <Reveal delay={280}>
              <a
                href={`mailto:${EMAIL}`}
                className="paper-card group flex flex-col gap-3 p-6"
              >
                <header className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft display-title">
                    <Mail className="h-3.5 w-3.5 text-kin" strokeWidth={1.7} aria-hidden />
                    {t('contact.email.label')}
                  </span>
                </header>
                <p className="display-title text-[1.125rem] font-medium text-sumi leading-snug">
                  {t('contact.email.title')}
                </p>
                <p className="text-[0.875rem] leading-[1.55] text-sumi-soft">
                  {t('contact.email.body')}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-sumi group-hover:text-kin transition-colors break-all">
                  {EMAIL}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                </span>
              </a>
            </Reveal>

            <Reveal delay={360}>
              <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_82%,transparent)] p-5">
                <p className="display-title text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-sumi-soft mb-2">
                  {t('contact.before.title')}
                </p>
                <p className="text-[0.875rem] leading-[1.6] text-sumi-soft">
                  <Trans
                    i18nKey="contact.before.body"
                    components={[
                      <a href="#faq" className="underline decoration-hinomaru/40 decoration-2 underline-offset-4 hover:text-sumi hover:decoration-hinomaru transition-colors" />,
                    ]}
                  />
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

const inputClass =
  'w-full rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-2.5 text-[0.9375rem] text-sumi placeholder:text-nezumi/70 transition-colors duration-200 focus:border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-sumi/15'

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[0.8125rem] font-medium text-sumi"
      >
        {label}
        {hint && (
          <span className="ml-2 text-[0.75rem] font-normal text-nezumi">{hint}</span>
        )}
      </label>
      {children}
    </div>
  )
}

function PathChip({
  icon: Icon,
  label,
  accent,
}: {
  icon: typeof Bug
  label: string
  accent: 'hinomaru' | 'kin' | 'nezumi'
}) {
  const iconColor =
    accent === 'hinomaru'
      ? 'text-hinomaru'
      : accent === 'kin'
        ? 'text-kin'
        : 'text-nezumi'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-2.5 py-1 text-[11px] font-medium text-sumi-soft transition-colors duration-[220ms] group-hover:border-[var(--line-strong)] group-hover:text-sumi">
      <Icon className={`h-3 w-3 ${iconColor}`} strokeWidth={1.8} aria-hidden />
      {label}
    </span>
  )
}
