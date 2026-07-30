import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { ArrowLeft, Leaf, Bell, Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/walkthrough'
const PAGE_TITLE = 'Walkthrough — Battery Sensei'
const PAGE_DESC =
  '60-second walkthrough of Battery Sensei in motion, side by side with AlDente, BatFi, coconutBattery, iStat Menus, and the built-in macOS Charge Limit. Video coming soon.'
export const Route = createFileRoute('/walkthrough')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      // No video yet — keep this page out of search until the embed is live so
      // we don't burn a "Watch the walkthrough" SERP slot on a placeholder.
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: WalkthroughPage,
})

function WalkthroughPage() {
  const { t } = useTranslation()
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl !pb-8 px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <HomeLink
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('walkthrough.backToCompare')}
            </HomeLink>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="動" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t('walkthrough.kicker')}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title self-stretch text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('walkthrough.heading')}
              <span className="block italic text-sumi-soft font-normal">
                {t('walkthrough.headingItalic')}
              </span>
            </Reveal>
            <div className="mt-6 flex w-full flex-col gap-4">
              <Reveal
                as="p"
                delay={320}
                className="max-w-2xl text-base leading-relaxed text-sumi-soft md:flex-1 md:min-w-0 md:text-[1.0625rem]"
              >
                {t('walkthrough.body')}
              </Reveal>
              <Reveal delay={360} className="self-start">
                <Link
                  to="/guides"
                  className="group inline-flex h-10 items-center gap-2.5 whitespace-nowrap rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_64%,var(--paper-lift))] px-4 text-[0.85rem] font-medium text-sumi transition-[transform,background-color,border-color,box-shadow] duration-[300ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-px hover:border-hinomaru/35 hover:bg-[color-mix(in_oklab,var(--washi)_48%,var(--paper-lift))] hover:shadow-[0_10px_20px_-16px_rgba(28,26,23,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
                >
                  <Leaf
                    className="h-4 w-4 text-hinomaru-ink transition-transform duration-[320ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 group-hover:rotate-6"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  Check out the Guides
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-2 pt-6 sm:px-6 md:pt-8">
          <Reveal delay={420}>
            <VideoPlaceholder
              badge={t('walkthrough.videoBadge')}
              caption={t('walkthrough.videoCaption')}
            />
          </Reveal>
        </section>

        <section className="zen-section mx-auto max-w-3xl !pt-6 !pb-12 px-5 sm:px-6">
          <Reveal delay={520}>
            <div className="paper-card relative overflow-hidden p-7 md:p-9">
              {/* Ambient hinomaru + kin washes and a faint washi grain — the
                  same atmosphere as the video plate above, so the notify card
                  reads as part of one continuous surface rather than a bolt-on. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-hinomaru/[0.06] blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -left-16 -bottom-20 h-56 w-56 rounded-full bg-kin/[0.05] blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent 0 23px, rgba(28,26,23,0.035) 23px 24px)',
                }}
              />
              {/* Brushed bell seal — lifts and reddens on card hover via .kanji-accent. */}
              <span
                aria-hidden
                className="kanji-accent pointer-events-none absolute right-5 top-5 select-none font-jp text-[2.75rem] leading-none text-sumi/[0.08] md:right-7 md:top-7 md:text-[3.25rem]"
              >
                鈴
              </span>

              <div className="relative flex flex-col gap-5 md:gap-6">
                <div className="max-w-md">
                  <p className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.24em] text-hinomaru-ink/85">
                    <Bell className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    <span className="font-jp tracking-[0.2em] text-hinomaru-ink/75">通知</span>
                  </p>
                  <h2 className="display-title text-[1.5rem] leading-[1.16] tracking-[-0.015em] text-sumi md:text-[1.75rem]">
                    {t('walkthrough.notifyHeading')}
                  </h2>
                  <p className="mt-3 text-[0.9375rem] leading-[1.6] text-sumi-soft">
                    {t('walkthrough.notifyBody')}
                  </p>
                </div>
                <WalkthroughNotifyForm />
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

function WalkthroughNotifyForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'success'>('idle')
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || status === 'sending') {
      if (!isValid) setStatus('error')
      return
    }
    setStatus('sending')
    let ok = false
    try {
      const res = await fetch('/api/free-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale: i18n.language,
          source: 'walkthrough-notify',
        }),
        keepalive: true,
      })
      ok = res.ok
    } catch {
      // Keep the visitor on the form and show the existing error line.
    }
    setStatus(ok ? 'success' : 'error')
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-xl">
      <label htmlFor="walkthrough-notify-email" className="sr-only">
        {t('walkthrough.notifyForm.label')}
      </label>
      {/* Standard field + button, matching the pricing free-card input
          (same border / washi fill / focus ring); stacks on mobile. */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2.5">
        <input
          id="walkthrough-notify-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (status === 'error' || status === 'success') setStatus('idle')
          }}
          placeholder={t('walkthrough.notifyForm.placeholder')}
          className="block h-11 w-full min-w-0 rounded-md border border-[color-mix(in_oklab,var(--sumi)_16%,transparent)] bg-[color-mix(in_oklab,var(--washi)_72%,var(--paper-lift))] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/25 sm:min-w-[16rem] sm:flex-1"
          aria-invalid={status === 'error'}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-sumi group inline-flex h-11 min-w-[8.75rem] whitespace-nowrap items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)] disabled:opacity-70 sm:shrink-0"
        >
          <Bell
            className="h-4 w-4 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
            strokeWidth={1.8}
            aria-hidden
          />
          {status === 'sending'
            ? t('walkthrough.notifyForm.sending')
            : t('walkthrough.notifyForm.cta')}
        </button>
      </div>
      <div className="mt-2 h-5">
        {status === 'error' && (
          <p role="alert" className="text-[0.75rem] text-hinomaru-ink">
            {t('walkthrough.notifyForm.errorInvalid')}
          </p>
        )}
        {status === 'success' && (
          <p className="inline-flex items-center gap-1.5 text-[0.75rem] text-matcha animate-in fade-in duration-300 motion-reduce:animate-none">
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('walkthrough.notifyForm.success')}
          </p>
        )}
      </div>
    </form>
  )
}

/**
 * 16:9 placeholder for the future walkthrough video. Soft hinomaru wash +
 * centered play icon, "Video coming soon" badge. Drop the <video> in once
 * the cut is ready; the surrounding chrome (border, shadow, padding) stays.
 */
function VideoPlaceholder({ badge, caption }: { badge: string; caption: string }) {
  return (
    <figure className="paper-card relative overflow-hidden p-3 md:p-4">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_75%,var(--paper-lift))]"
        aria-label={badge}
      >
        {/* Ambient washes — diagonal hinomaru + kin so the empty plate has
            depth without competing with the future video frame. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-hinomaru/[0.07] blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-kin/[0.05] blur-3xl"
        />
        {/* Faint washi grain via repeating linear gradient — matches body. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0 23px, rgba(28,26,23,0.04) 23px 24px)',
          }}
        />
        {/* No play glyph while there is nothing to play. A disc that looks
            exactly like a button but does nothing is the most clickable
            object on the page, and every click it absorbs teaches the
            visitor that this page does not respond. The seal and the badge
            carry the "not yet" message on their own. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <span className="font-jp text-[10px] uppercase tracking-[0.32em] text-hinomaru-ink/80">
            動 画
          </span>
          <span className="inline-block rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_55%,var(--paper-lift))] px-3 py-1 text-[11px] font-medium text-sumi">
            {badge}
          </span>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[12px] tracking-[0.06em] text-nezumi">
        {caption}
      </figcaption>
    </figure>
  )
}
