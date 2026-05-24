import { useState, type FormEvent } from 'react'
import { Bug, Mail, Send, ShieldCheck } from 'lucide-react'
import { GithubMark } from '#/components/icons/GithubMark'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Topic = 'bug' | 'feature' | 'billing' | 'other'
type Status = 'idle' | 'sending' | 'sent' | 'error'

const TOPICS: ReadonlyArray<{ value: Topic; label: string; hint: string }> = [
  { value: 'billing', label: 'Billing or license', hint: 'Refund, license key, invoice.' },
  { value: 'feature', label: 'Feature idea', hint: 'A way Sensei could help more.' },
  { value: 'bug',     label: 'Bug',            hint: 'Something is broken or wrong.' },
  { value: 'other',   label: 'Something else', hint: 'Hello, press, partnership, etc.' },
]

const ISSUES_URL = 'https://github.com/schaier-io/battery-sensei-releases/issues/new/choose'
const EMAIL = 'sandro@schaier.io'

export function Contact() {
  const [topic, setTopic] = useState<Topic>('billing')
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
        setErrorMsg(data.error ?? 'Something went wrong. Please email us directly.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch {
      setErrorMsg('Network hiccup. Please try again, or email us directly.')
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="zen-section px-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 flex flex-col items-center text-center">
          <Hanko kanji="文" className="mb-5" />
          <Reveal as="p" delay={120} className="kicker-row mb-4">
            Get in touch · 連絡
          </Reveal>
          <Reveal as="h2" delay={200} className="section-heading text-sumi">
            A real person <span className="italic text-sumi-soft font-normal">reads every message.</span>
          </Reveal>
          <Reveal
            as="p"
            delay={280}
            className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
          >
            Bugs and feature requests live in the open on GitHub so everyone
            benefits from the answer. Anything tied to your account, license,
            or payment goes through the form. First reply within ~48 hours on
            weekdays, often sooner.
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
                  Private message
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-nezumi">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  Not stored, just forwarded
                </span>
              </header>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-[0.8125rem] font-medium text-sumi mb-1">
                  What is this about?
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Topic"
                  className="grid grid-cols-2 gap-2"
                >
                  {TOPICS.map((t) => {
                    const active = topic === t.value
                    return (
                      <label
                        key={t.value}
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
                          value={t.value}
                          checked={active}
                          onChange={() => setTopic(t.value)}
                          className="sr-only"
                        />
                        <span className="display-title block text-[0.9375rem] font-medium text-sumi leading-snug">
                          {t.label}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] leading-snug text-nezumi">
                          {t.hint}
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
                <Field label="Your name" htmlFor="contact-name">
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
                <Field label="Email" htmlFor="contact-email">
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
                label="Subject"
                htmlFor="contact-subject"
                hint="Optional, but helps us triage."
              >
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  maxLength={160}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                  placeholder={topic === 'billing' ? 'Refund for order LMS-…' : 'In one line.'}
                />
              </Field>

              <Field
                label="Message"
                htmlFor="contact-message"
                hint="A sentence or two is plenty. Include your license email if it's a billing question."
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

              {/* Honeypot — invisible to humans, irresistible to bots. */}
              <label className="sr-only" aria-hidden="true">
                Company
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              <p id="contact-form-help" className="sr-only">
                The form sends your message to Battery Sensei's support inbox.
                We do not store submissions or share them with third parties.
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
                  {status === 'sent'   ? '送信完了 · Sent. We will reply to your email within 48h on weekdays.' :
                   status === 'error'  ? errorMsg :
                   status === 'sending'? 'Sending…' :
                   'We reply to every email. Promise.'}
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
                  {status === 'sent' ? 'Sent' : status === 'sending' ? 'Sending…' : 'Send message'}
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
                className="paper-card group flex flex-col gap-3 p-6 transition-transform duration-300"
              >
                <header className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft display-title">
                    <Bug className="h-3.5 w-3.5 text-hinomaru" strokeWidth={1.7} aria-hidden />
                    Public · GitHub
                  </span>
                  <GithubMark className="h-4 w-4 text-nezumi transition-colors group-hover:text-sumi" strokeWidth={1.6} />
                </header>
                <p className="display-title text-[1.125rem] font-medium text-sumi leading-snug">
                  Report a bug or request a feature.
                </p>
                <p className="text-[0.875rem] leading-[1.55] text-sumi-soft">
                  The roadmap is open. Templates ask only for what we genuinely
                  need to ship a fix. Vote on existing ideas with a 👍 to bump
                  them up.
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-sumi group-hover:text-hinomaru transition-colors">
                  Open an issue
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
                    Direct email
                  </span>
                </header>
                <p className="display-title text-[1.125rem] font-medium text-sumi leading-snug">
                  Or write to <span className="font-jp">先生</span> directly.
                </p>
                <p className="text-[0.875rem] leading-[1.55] text-sumi-soft">
                  Prefer your own mail client? Same inbox, same person, same
                  ~48h reply. Use this for security disclosures.
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
                  Before you write
                </p>
                <p className="text-[0.875rem] leading-[1.6] text-sumi-soft">
                  Most questions are already answered in the{' '}
                  <a href="#faq" className="underline decoration-hinomaru/40 decoration-2 underline-offset-4 hover:text-sumi hover:decoration-hinomaru transition-colors">
                    FAQ
                  </a>
                  . If it's a refund, mention your order ID (Lemon Squeezy
                  emails it on purchase) so we can refund without going back
                  and forth.
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
