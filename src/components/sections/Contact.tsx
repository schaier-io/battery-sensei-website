import { lazy, Suspense, useState, type FormEvent } from 'react'
import {
  ArrowUpRight,
  AtSign,
  Bug,
  ListChecks,
  Mail,
  Send,
  ShieldCheck,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { GithubMark } from '#/components/icons/GithubMark'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Topic = 'bug' | 'feature' | 'billing' | 'other'
type Status = 'idle' | 'sending' | 'sent' | 'error'

const TOPIC_ORDER: ReadonlyArray<Topic> = ['feature', 'bug', 'billing', 'other']

const ISSUES_URL = 'https://github.com/schaier-io/battery-sensei-releases/issues/new/choose'
const EMAIL = 'info@battery-sensei.app'

// The board pulls its own data fetching + card stack; load it only when the
// visitor actually opens the Roadmap tab so the contact tab stays light.
const FeatureBoard = lazy(() =>
  import('#/components/board/FeatureBoard').then((m) => ({ default: m.FeatureBoard })),
)

type ContactTab = 'contact' | 'roadmap'

export function Contact() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ContactTab>('contact')
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

        {/* Contact first, roadmap beside it: private message vs public board
            are different rooms, and the switch makes that explicit. */}
        <div
          role="tablist"
          aria-label={t('contact.tabs.label')}
          className="mb-8 flex justify-center gap-2"
        >
          {(['contact', 'roadmap'] as const).map((value) => {
            const active = tab === value
            return (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(value)}
                className={`rounded-full border px-5 py-2 text-[0.875rem] font-medium transition-colors duration-[220ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 ${
                  active
                    ? 'border-sumi bg-sumi text-washi'
                    : 'border-[var(--line-strong)] bg-transparent text-sumi-soft hover:text-sumi'
                }`}
              >
                {t(`contact.tabs.${value}`)}
              </button>
            )
          })}
        </div>

        {tab === 'roadmap' && (
          <div className="mx-auto max-w-3xl">
            <Suspense
              fallback={
                <p className="py-12 text-center text-[0.9rem] text-sumi-soft">…</p>
              }
            >
              <FeatureBoard />
            </Suspense>
          </div>
        )}

        <div
          hidden={tab !== 'contact'}
          className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
        >
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
                  {t('contact.notStored')}
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
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
                          'group relative cursor-pointer rounded-md border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200',
                          active
                            ? 'border-hinomaru/40 bg-[color-mix(in_oklab,var(--washi)_48%,#fff)] shadow-[inset_2px_0_0_var(--hinomaru),0_1px_0_rgba(255,255,255,0.5)]'
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
                        <span className={['display-title block text-[0.9375rem] font-medium leading-snug', active ? 'text-sumi' : 'text-sumi'].join(' ')}>
                          {t(`contact.topics.${value}.label`)}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] leading-snug text-nezumi">
                          {t(`contact.topics.${value}.hint`)}
                        </span>
                        <span
                          aria-hidden
                          className={[
                            'absolute right-2.5 top-2.5 grid h-3.5 w-3.5 place-items-center rounded-full transition-[opacity,transform,background-color] duration-200',
                            active
                              ? 'bg-hinomaru/16 text-hinomaru opacity-100 scale-100'
                              : 'opacity-0 scale-90',
                          ].join(' ')}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        </span>
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
                    placeholder={t('contact.fields.namePlaceholder')}
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
                    placeholder={t('contact.fields.emailPlaceholder')}
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

              {/* Feature ideas have a public home too: the roadmap board,
                  where submissions become votable after review. This form
                  stays the private path — the pointer is informational,
                  not a mode switch. */}
              {topic === 'feature' && (
                <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_82%,transparent)] p-3.5">
                  <p className="text-[0.8125rem] leading-[1.5] text-sumi-soft">
                    {t('contact.board.hint')}
                  </p>
                  <Link
                    to="/roadmap"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-sumi transition-colors hover:text-hinomaru"
                  >
                    {t('contact.board.linkLabel')}
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
                  </Link>
                </div>
              )}

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
                  placeholder={t(
                    `contact.fields.messagePlaceholder.${topic}`,
                  )}
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

              {/* Status text + submit. Pulled tight against the message
                  textarea above so the form's gap-5 rhythm doesn't
                  leave a chasm beneath the message field. */}
              <div className="-mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              {/* Compact roadmap card. Was 6 stacked rows (header,
                  title, chips, body paragraph, CTA, ambient blur);
                  collapsed to 4 (header, title, chips+inline CTA).
                  The body paragraph was restating what the chips
                  already communicate — dropped. Tighter padding
                  (p-5) and a smaller title size (1rem, was 1.125)
                  reduce the card's total height by ~40%, which
                  brings it closer to the email card below and
                  stops the right column from towering over the
                  form on the left. */}
              {/* Roadmap card — tightened padding to p-4 (was p-5) so the
                  header chip sits closer to the title. Arrow no longer
                  lives inside a tracked-letter circle that made it
                  look like it was orbiting; it's now a proper SVG
                  chevron that slides + brightens on group hover. */}
              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noreferrer"
                className="paper-card group relative flex flex-col gap-2.5 overflow-hidden p-3.5 sm:p-4 transition-transform duration-300"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-hinomaru/[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-100 group-hover:bg-hinomaru/[0.10]"
                />
                <header className="relative flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft display-title">
                    <Sparkles
                      className="h-3.5 w-3.5 text-hinomaru transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:rotate-[12deg] group-hover:scale-110"
                      strokeWidth={1.7}
                      aria-hidden
                    />
                    {t('contact.github.label')}
                  </span>
                  <GithubMark
                    className="h-4 w-4 text-nezumi transition-colors duration-[220ms] group-hover:text-sumi"
                    strokeWidth={1.6}
                  />
                </header>
                <p className="display-title relative text-[1rem] font-medium leading-snug text-sumi">
                  {t('contact.github.title')}
                </p>
                <div className="relative flex flex-wrap items-center gap-1.5">
                  <PathChip
                    icon={Bug}
                    label={t('contact.github.paths.idea')}
                    accent="hinomaru"
                  />
                  <PathChip
                    icon={Mail}
                    label={t('contact.github.paths.bug')}
                    accent="kin"
                  />
                  <PathChip
                    icon={Lightbulb}
                    label={t('contact.github.paths.curious')}
                    accent="nezumi"
                  />
                  {/* CTA inline at the end of the chip row on wide
                      screens, wraps to its own line on narrow. The
                      arrow now uses a clipped reveal — the chevron sits
                      inside a fixed-width slot and translates within
                      that slot on hover, so it never looks like it's
                      escaping a parent circle or pushing the label. */}
                  <span
                    aria-hidden
                    className="hidden text-[var(--line-strong)] sm:inline"
                  >
                    ·
                  </span>
                  {/* "Find your thread ↗" — use an open-in-new-page cue.
                      Nudge up-right on hover so the direction is clear
                      without heavy motion. */}
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-sumi transition-colors duration-[220ms] group-hover:text-hinomaru">
                    {t('contact.github.cta')}
                    <ArrowUpRight
                      aria-hidden
                      className="h-4 w-4 transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.9}
                    />
                  </span>
                </div>
              </a>
            </Reveal>

            <Reveal delay={280}>
              <a
                href={`mailto:${EMAIL}`}
                className="paper-card group relative flex flex-col gap-3 p-6"
              >
                {/* Ambient kin (gold) wash, mirrors the hinomaru one on
                    the GitHub card so the two cards read as a pair. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-kin/[0.06] blur-2xl transition-opacity duration-500 group-hover:bg-kin/[0.10]"
                />
                <header className="relative flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft display-title">
                    <Mail className="h-3.5 w-3.5 text-kin" strokeWidth={1.7} aria-hidden />
                    {t('contact.email.label')}
                  </span>
                  <AtSign
                    className="h-4 w-4 text-nezumi transition-[colors,transform] duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:text-kin group-hover:scale-110"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                </header>
                <p className="display-title text-[1.125rem] font-medium text-sumi leading-snug">
                  {t('contact.email.title')}
                </p>
                <p className="text-[0.875rem] leading-[1.55] text-sumi-soft">
                  {t('contact.email.body')}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-sumi group-hover:text-kin transition-colors break-all">
                  {EMAIL}
                  <ArrowUpRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.9}
                  />
                </span>
              </a>
            </Reveal>

            <Reveal delay={360}>
              {/* Restructured from a single flowing paragraph into a
                  two-row checklist. Each row leads with a tracked
                  kicker (FAQ / REFUND) so the user can scan and
                  pattern-match without reading the body. The dashed
                  border stays (signals "advisory, not chrome"); the
                  kanji 注 ("careful / pay attention") replaces the
                  uppercase title so the section reads native to the
                  site's kanji-seal vocabulary. */}
              <aside className="rounded-md border border-dashed border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_82%,transparent)] p-5">
                <header className="mb-3 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-3">
                    <span
                      aria-hidden
                      className="font-jp text-base leading-none text-hinomaru/85 w-5 text-center"
                    >
                      注
                    </span>
                    <span className="display-title text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-sumi-soft">
                      {t('contact.before.title')}
                    </span>
                  </span>
                  <ListChecks
                    className="h-4 w-4 text-nezumi/70"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                </header>
                <ul className="space-y-2.5 text-[0.875rem] leading-[1.5] text-sumi-soft">
                  <li className="flex gap-2.5">
                    <span className="display-title shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-nezumi pt-[3px]">
                      FAQ
                    </span>
                    <span>
                      <Trans
                        i18nKey="contact.before.faqHint"
                        components={[
                          <a
                            href="#faq"
                            className="font-medium text-sumi underline decoration-hinomaru/40 decoration-2 underline-offset-4 hover:decoration-hinomaru transition-colors"
                          />,
                        ]}
                      />
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="display-title shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-nezumi pt-[3px]">
                      {t('contact.before.refundLabel')}
                    </span>
                    <span>{t('contact.before.refundHint')}</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="display-title shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-nezumi pt-[3px]">
                      {t('contact.before.journalLabel')}
                    </span>
                    <span>
                      <Trans
                        i18nKey="contact.before.journalHint"
                        components={[
                          <Link
                            to="/blog"
                            className="font-medium text-sumi underline decoration-hinomaru/40 decoration-2 underline-offset-4 hover:decoration-hinomaru transition-colors"
                          />,
                        ]}
                      />
                    </span>
                  </li>
                </ul>
              </aside>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

// Underline animates from 0%→100% on focus via background-size. The
// gradient lives on the existing background (no overlay element), so
// the effect ships on inputs, textareas, and any focus-able field
// without wrapping them in extra divs. Stays subtle — a single
// hinomaru hairline that paints in left→right like a sumi brush
// finishing a label.
const inputClass =
  [
    'block w-full rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-3.5 py-2.5 text-[0.9375rem] text-sumi placeholder:text-nezumi/70',
    'transition-[colors,background-size,box-shadow] duration-[320ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
    'bg-no-repeat bg-[length:0%_1.5px] bg-[position:8px_calc(100%-2px)]',
    "bg-[image:linear-gradient(to_right,var(--hinomaru),color-mix(in_oklab,var(--hinomaru)_30%,transparent))]",
    'focus:bg-[length:calc(100%-16px)_1.5px] focus:border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-sumi/15',
  ].join(' ')

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
  // Tinted hover surface keyed to the chip's accent so each path
  // briefly lights up in its own colour when the parent card is
  // hovered — Lightbulb/idea blushes hinomaru, Bug glows kin, etc.
  const hoverBg =
    accent === 'hinomaru'
      ? 'group-hover:bg-[color-mix(in_oklab,var(--hinomaru)_8%,var(--washi))]'
      : accent === 'kin'
        ? 'group-hover:bg-[color-mix(in_oklab,var(--kin)_10%,var(--washi))]'
        : 'group-hover:bg-[color-mix(in_oklab,var(--washi)_50%,#fff)]'
  return (
    <span
      // Direct chip hover adds a 2° rotation on top of the parent
      // card's group-hover lift, so each path-chip feels independently
      // alive — visitors can hover any single chip and feel it tilt
      // before tapping. Combined with the accent-keyed tinted bg,
      // each path lights up in its own colour.
      className={`path-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-2.5 py-1 text-[11px] font-medium text-sumi-soft transition-[colors,transform,box-shadow] duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:border-[var(--line-strong)] group-hover:text-sumi group-hover:shadow-[0_2px_6px_-4px_rgba(28,26,23,0.18)] hover:!-translate-y-1 hover:!rotate-[2deg] hover:!shadow-[0_6px_14px_-8px_rgba(28,26,23,0.30)] ${hoverBg}`}
    >
      <Icon
        className={`h-3 w-3 ${iconColor} transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 [.path-chip:hover_&]:scale-125 [.path-chip:hover_&]:-rotate-[8deg]`}
        strokeWidth={1.8}
        aria-hidden
      />
      {label}
    </span>
  )
}
