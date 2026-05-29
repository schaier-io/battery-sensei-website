/**
 * Confirmation landing page.
 *
 *   /newsletter/confirm?token=...
 *
 * Reached when the user clicks the "Confirm" link in the confirmation
 * email. GET /api/newsletter/confirm just redirects here without doing
 * anything — the actual confirm is a POST fired from this page.
 *
 * Auto-confirm, without a button click, while still keeping bots out:
 *
 *   1. JavaScript gate — the POST only runs from this client effect.
 *      Inbox link-preview crawlers (Outlook SafeLinks, Gmail proxy,
 *      antivirus scanners, social unfurlers) fetch the URL but do not
 *      execute page JS, so they never reach the confirm call.
 *   2. Automation gate — `navigator.webdriver` headless agents fall back
 *      to the manual button instead of auto-confirming.
 *   3. Visibility gate — if the page is opened in the background
 *      (prefetch / background tab) we wait for it to actually become
 *      visible before confirming. Background prefetchers never do.
 *   4. A deliberate ~1.2s dwell on the zen spinner, so the confirm reads
 *      as a calm moment rather than a flash.
 *
 * A manual button remains as a fallback for the automation case and for
 * retry after an error.
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { EnsoSpinner } from '#/components/zen/EnsoSpinner'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

type Search = {
  token?: string
  locale?: string
}

export const Route = createFileRoute('/newsletter/confirm')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    // Lightweight client-side validation. The server still does the
    // strict zod regex check + HMAC verify on POST — this just keeps
    // garbage out of the form state.
    token:
      typeof s.token === 'string' &&
      s.token.length >= 20 &&
      s.token.length <= 2048 &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s.token)
        ? s.token
        : undefined,
    // Retained (not consumed here) so i18n's detectClientLocale can read it
    // from the URL and render the page in the email's language.
    locale:
      typeof s.locale === 'string' && /^(en|de|es|fr|ja)$/.test(s.locale)
        ? s.locale
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Confirm subscription — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ConfirmPage,
})

type FormState =
  // Initial render (SSR + first paint): show the spinner so there's no
  // flash of the manual button before the auto-confirm kicks in.
  | 'checking'
  | 'confirming'
  | 'manual'
  | 'error'
  | 'missing-token'

/** Minimum time the zen spinner stays on screen (ms). */
const MIN_DWELL_MS = 1200

/** Headless automation self-identifies via navigator.webdriver. */
function isAutomatedAgent(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.webdriver === true
}

function ConfirmPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [state, setState] = useState<FormState>('checking')
  const busyRef = useRef(false)

  const hasToken = typeof token === 'string' && token.length > 0

  const confirmNow = useCallback(async () => {
    if (!hasToken || busyRef.current) return
    busyRef.current = true
    setState('confirming')
    const startedAt = Date.now()
    try {
      const res = await fetch(
        `/api/newsletter/confirm?token=${encodeURIComponent(token!)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        },
      )
      // Hold the spinner for a calm minimum even if the API is instant.
      const remaining = MIN_DWELL_MS - (Date.now() - startedAt)
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }
      if (!res.ok) {
        busyRef.current = false
        setState('error')
        return
      }
      // Parse the navigation target out of the response, falling back to
      // the generic success page if the body is ever malformed.
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean
        redirectTo?: string
      } | null
      const redirectTo =
        typeof body?.redirectTo === 'string' && body.redirectTo.startsWith('/')
          ? body.redirectTo
          : '/newsletter/confirmed'
      navigate({ to: redirectTo })
    } catch {
      busyRef.current = false
      setState('error')
    }
  }, [hasToken, token, navigate])

  // Auto-confirm on load — guarded so only a real, foreground browser
  // (not a crawler / prefetcher / headless agent) triggers the POST.
  useEffect(() => {
    if (!hasToken) {
      setState('missing-token')
      return
    }
    if (isAutomatedAgent()) {
      // Let a human click through instead of silently confirming.
      setState('manual')
      return
    }
    if (typeof document === 'undefined') return

    if (document.visibilityState === 'visible') {
      void confirmNow()
      return
    }
    // Opened in the background (link prefetch or a background tab). Wait
    // until the page is actually looked at before confirming.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', onVisible)
        void confirmNow()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [hasToken, confirmNow])

  const showSpinner = state === 'checking' || state === 'confirming'

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
            {showSpinner ? (
              <>
                <EnsoSpinner
                  size={76}
                  className="mb-8 text-sumi"
                  label={t('newsletter.confirm.confirming')}
                />
                {/* Plain <p>, not <Reveal>: a loading status must be visible
                    immediately, never gated behind a scroll-in animation
                    (which fails to fire when it mounts after a button click). */}
                <p className="max-w-md text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]">
                  {t('newsletter.confirm.confirming')}
                </p>
              </>
            ) : (
              <>
                {/* 印 = "seal / stamp / confirm" — the quiet opt-in gesture
                    before the heavier 了 stamp on the success page. */}
                <Hanko kanji="印" className="mb-6" />
                <Reveal
                  as="h1"
                  delay={140}
                  className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
                >
                  {t('newsletter.confirm.heading')}
                </Reveal>
                <Reveal
                  as="p"
                  delay={220}
                  className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
                >
                  {t('newsletter.confirm.body')}
                </Reveal>
                <Reveal as="div" delay={300} className="mt-10 w-full max-w-sm">
                  {/* Status banner. Fixed-height slot so the layout doesn't
                      jump when the message swaps. */}
                  <div
                    className="mb-3 min-h-[1.25rem] text-center"
                    aria-live="polite"
                    role={state === 'error' ? 'alert' : undefined}
                  >
                    {state === 'error' && (
                      <p className="text-[0.8125rem] font-medium text-hinomaru">
                        {t('newsletter.confirm.error')}
                      </p>
                    )}
                    {state === 'missing-token' && (
                      <p className="text-[0.8125rem] text-sumi-soft">
                        {t('newsletter.confirm.missingToken')}
                      </p>
                    )}
                  </div>
                  {state !== 'missing-token' && (
                    <button
                      type="button"
                      onClick={() => void confirmNow()}
                      disabled={!hasToken}
                      className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sumi px-4 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check
                        className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-110"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {t('newsletter.confirm.cta')}
                    </button>
                  )}
                </Reveal>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
