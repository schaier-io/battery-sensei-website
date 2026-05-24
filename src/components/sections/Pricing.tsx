import { Check, Sparkles, Clock, Infinity as InfinityIcon, Headphones, Download, ShieldCheck, KeyRound, RotateCcw } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TRIAL_DAYS, premiumCheckoutUrl } from '#/lib/lemon'
import { usePremiumPrice } from '#/lib/use-price'

// Free essentials kept forever, regardless of upgrade. Same list lives in
// pricing.md for AI crawlers.
const freeFeatures = [
  'Smart low-battery alerts (Zen, Regular, Senpai)',
  'Charge limit with Travel Mode',
  '30-day battery history (Saga)',
  'Menu-bar live charge + watts',
  'Notarized by Apple',
  'Runs entirely on your Mac',
]

const premiumFeatures: Array<{ icon: typeof Sparkles; title: string; body: string }> = [
  {
    icon: Sparkles,
    title: 'Meeting Battery Guard',
    body: 'Sensei reads your next meetings (titles stay on-device) and warns when the battery won\'t survive the one that matters.',
  },
  {
    icon: InfinityIcon,
    title: 'Unlimited Saga history',
    body: 'Keep every cycle, plateau, and capacity reading forever — not just the last 30 days.',
  },
  {
    icon: Clock,
    title: 'Custom warning presets',
    body: 'Build your own thresholds and dismiss times beyond the three included moods.',
  },
  {
    icon: Headphones,
    title: 'Lifetime updates + priority support',
    body: 'One payment. Every future Premium feature. Email goes to a human.',
  },
]

export function Pricing() {
  const price = usePremiumPrice()
  return (
    <section id="pricing" className="zen-section mx-auto max-w-6xl px-5 sm:px-6">
      <div className="mb-12 flex flex-col items-center text-center">
        <Hanko kanji="価" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          Pricing · 値段
        </Reveal>
        <Reveal as="h2" delay={200} className="section-heading text-sumi max-w-2xl">
          Free forever, with {TRIAL_DAYS} days of Premium.
          <span className="block italic text-sumi-soft font-normal">
            Keep it all for {price.formatted}, once.
          </span>
        </Reveal>
        <Reveal
          as="p"
          delay={280}
          className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
        >
          One payment, then never again. {price.formatted} once — every Mac
          you own, every future Premium feature, no subscription, no account.
        </Reveal>
      </div>

      {/* Two-card layout — Free (with the 5-day Premium trial bundled in) and
          Premium (paid upgrade). Both cards share the same top structure so
          they align widths cleanly. RECOMMENDED is an inline pill in the
          normal flow, not absolute-positioned — the .paper-card > * rule
          would otherwise force any absolute child back into flow and stretch
          it to full container width. */}
      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        {/* ---------- Free card ---------- */}
        <Reveal delay={120} className="h-full">
          <article className="paper-card flex h-full flex-col p-7 md:p-8">
            {/* Header block — kanji + tier name, mirrors Premium card's structure */}
            <div className="flex items-center gap-3">
              <span className="font-jp text-xs tracking-widest text-sumi-soft">
                基本 · Free
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-title text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none tabular-nums">
                {price.zero}
              </span>
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                forever
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              Yours forever. No card, no account.
              <span className="block mt-1 text-sumi">
                Plus: every Premium feature unlocked for your first {TRIAL_DAYS} days.
              </span>
            </p>

            <a
              href="/download/latest"
              className="btn-sumi group mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Download
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              Download free
            </a>
            <p className="mt-2 text-[0.7rem] text-nezumi text-center">
              No card, no account. Direct .zip from battery-sensei.app.
            </p>

            {/* Divider */}
            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="mt-6 font-jp text-[11px] tracking-[0.32em] text-nezumi uppercase">
              What you keep · 基本
            </p>
            <ul className="mt-4 space-y-2.5">
              {freeFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-sumi-soft"
                >
                  <Check
                    className="mt-[3px] h-4 w-4 shrink-0 text-sumi/70"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Trial-end binary outcome — pushed to the card bottom so the
                Premium-card price+CTA visually lines up with the Free-card
                features. Both outcomes shown so the trial choice feels safe
                whichever way it goes. */}
            <div className="mt-auto pt-8">
              <div className="rounded-md border border-dashed border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-4 py-3.5">
                <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] font-medium text-sumi-soft">
                  <span className="font-jp normal-case tracking-normal text-hinomaru/80">日 {TRIAL_DAYS + 1}</span>
                  On day {TRIAL_DAYS + 1}, Sensei asks once:
                </p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-sumi-soft">
                  <span className="font-medium text-sumi">Keep Premium ({price.formatted})</span>
                  {' · or · '}
                  <span className="font-medium text-sumi">revert to free essentials</span>.
                  No nag, no card on file, no silent charge.
                </p>
              </div>
            </div>
          </article>
        </Reveal>

        {/* ---------- Premium card ---------- */}
        <Reveal delay={220} className="h-full">
          <article className="paper-card flex h-full flex-col p-7 md:p-8">
            {/* Header — RECOMMENDED pill INLINE in the normal flow (not
                absolute) so the .paper-card > * relative-position rule
                doesn't widen it across the card. */}
            <div className="flex items-center gap-3">
              <span className="font-jp text-xs tracking-widest text-hinomaru/80">
                先生 · Sensei Premium
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-hinomaru/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-hinomaru">
                Recommended
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-title text-[2.25rem] md:text-[2.625rem] font-medium text-sumi leading-none tabular-nums">
                {price.formatted}
              </span>
              <span className="text-[1rem] text-sumi-soft tracking-normal">
                once, forever
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-sumi-soft max-w-md">
              Skip the trial. Unlock everything immediately and own it forever
              — every Mac, every future Premium feature.
            </p>

            <a
              href={premiumCheckoutUrl()}
              className="lemonsqueezy-button btn-sumi group mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              Buy now — {price.formatted}
            </a>
            {/* Trust strip — addresses the three buying anxieties (is it
                safe? am I stuck? is this a recurring trap?) at the moment
                of decision, not in a footer. */}
            <ul className="mt-3 flex flex-col gap-1.5 text-[0.7rem] text-nezumi">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                Apple-notarized · EdDSA-signed updates
              </li>
              <li className="inline-flex items-center gap-1.5">
                <RotateCcw className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                14-day refund, no questions
              </li>
              <li className="inline-flex items-center gap-1.5">
                <KeyRound className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                No subscription · No account · Every Mac you own
              </li>
            </ul>

            {/* Divider */}
            <div aria-hidden className="mt-7 h-px w-full bg-[var(--line)]" />

            <p className="mt-6 font-jp text-[11px] tracking-[0.32em] text-hinomaru/80 uppercase">
              Premium adds · 先生
            </p>
            <ul className="mt-4 space-y-4">
              {premiumFeatures.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-[2px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--hinomaru)_10%,var(--washi))] text-hinomaru">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-medium text-sumi leading-tight">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-sumi-soft">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Activation info — mirrors the Free card's Day-6 box footprint so
                both cards end with a similar bottom block (heights align). Also
                hits the practical "what do I do after I pay" question, which
                kills post-purchase friction anxiety. */}
            <div className="mt-auto pt-8">
              <div className="rounded-md border border-dashed border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_60%,#fff)] px-4 py-3.5">
                <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] font-medium text-sumi-soft">
                  <span className="font-jp normal-case tracking-normal text-hinomaru/80">鍵</span>
                  How activation works
                </p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-sumi-soft">
                  License key by email. Paste once in{' '}
                  <span className="font-medium text-sumi">Sensei → Settings → Premium</span>.
                  Works on every Mac you own. No login, no account.
                </p>
              </div>
            </div>
          </article>
        </Reveal>
      </div>

      <Reveal as="p" delay={360} className="spec-strip mt-10 text-center">
        Already bought? Enter your license key in Sensei → Settings → Premium.
      </Reveal>
    </section>
  )
}
