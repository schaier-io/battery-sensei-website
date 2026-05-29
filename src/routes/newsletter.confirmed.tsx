/**
 * Landing page shown after the user clicks the double-opt-in link.
 *
 * Status variants:
 *   - default → "You're confirmed" success, with a direct download button
 *   - invalid → token bad/expired; inline resend form (pre-filled with the
 *               email decoded from the expired token)
 *   - error   → upstream failed (offer to contact support)
 *
 * Layout follows the post-action "moment" pattern established by
 * /thanks/lifetime and /thanks/support — centered hero with hanko,
 * back-to-home anchor at top-left, max-w-3xl section.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  status?: 'invalid' | 'error'
  locale?: string
  email?: string
}

export const Route = createFileRoute('/newsletter/confirmed')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status:
      s.status === 'invalid' || s.status === 'error'
        ? (s.status as Search['status'])
        : undefined,
    locale: typeof s.locale === 'string' ? s.locale : undefined,
    // Pre-fill the resend form when the confirm endpoint recovers an
    // email from an expired-but-signed token. Lightly sanitize: cap
    // length and drop anything obviously non-email-ish so a malformed
    // search param can't poke at the input value.
    email:
      typeof s.email === 'string' &&
      s.email.length > 0 &&
      s.email.length <= 254 &&
      s.email.includes('@')
        ? s.email
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Confirmed — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ConfirmedPage,
})

function ConfirmedPage() {
  const { t, i18n } = useTranslation()
  const { status, email: prefillEmail } = Route.useSearch()

  const isError = status === 'invalid' || status === 'error'

  const heading =
    status === 'invalid'
      ? t('newsletter.confirmed.invalid.heading')
      : status === 'error'
        ? t('newsletter.confirmed.error.heading')
        : t('newsletter.confirmed.success.heading')

  const body =
    status === 'invalid'
      ? t('newsletter.confirmed.invalid.body')
      : status === 'error'
        ? t('newsletter.confirmed.error.body')
        : t('newsletter.confirmed.success.body')

  const kanji = isError ? '？' : '了'

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Link
            to="/"
            className="group zen-link-lift mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] text-sumi-soft hover:text-sumi"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
              strokeWidth={1.8}
              aria-hidden
            />
            {t('thanks.backToHome')}
          </Link>
          <div className="flex flex-col items-center text-center">
            <Hanko kanji={kanji} className="mb-6" />
            <Reveal
              as="h1"
              delay={140}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {heading}
            </Reveal>
            <Reveal
              as="p"
              delay={220}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {body}
            </Reveal>
            {status === 'invalid' && (
              <Reveal as="div" delay={300} className="mt-10 w-full max-w-sm">
                <ResendForm
                  currentLocale={i18n.language}
                  prefillEmail={prefillEmail}
                />
              </Reveal>
            )}
            {/* Direct download. The user just confirmed, so skip the email
                form and link straight to the .pkg (/download/latest → latest
                GitHub release, via vercel.json). */}
            {!isError && (
              <Reveal as="div" delay={300} className="mt-8">
                <a
                  href="/download/latest"
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sumi px-5 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90"
                >
                  <Download
                    className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {t('common.downloadMac')}
                </a>
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

/**
 * Inline resend form. Posts to /api/free-signup (the same endpoint the
 * homepage Free download card uses) so the confirm flow runs through
 * the canonical path — no special-case resend endpoint to maintain.
 *
 * Styling deliberately mirrors the pricing Free signup so visitors see
 * a familiar control: same input geometry (h-11, rounded-md, sumi
 * border at 16% opacity, washi-tinted background), same focus ring,
 * same icon-led submit button (`btn-sumi` would be ideal but it lives
 * in the pricing module — we replicate the geometry inline so this
 * route stays self-contained).
 */
function ResendForm({
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
          <span className="inline-flex items-center gap-1.5 font-medium text-hinomaru">
            <AlertCircle
              className="h-4 w-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            {banner.text}{' '}
            <span className="font-normal text-hinomaru/85">
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
        className="block h-11 w-full min-w-0 rounded-md border border-[color-mix(in_oklab,var(--sumi)_16%,transparent)] bg-[color-mix(in_oklab,var(--washi)_72%,#fff)] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/25 disabled:cursor-not-allowed disabled:opacity-60"
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
