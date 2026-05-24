import { Check, Sparkles, Clock, Infinity as InfinityIcon, Headphones } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { TiltCard } from '#/components/zen/TiltCard'
import { TRIAL_DAYS, premiumCheckoutUrl } from '#/lib/lemon'
import { usePremiumPrice } from '#/lib/use-price'

const freeFeatures = [
  'Smart low-battery alerts (Zen, Regular, Senpai)',
  'Charge limit with Travel Mode',
  '30-day battery history (Saga)',
  'Menu-bar live charge + watts',
  'Notarized by Apple. Privacy-first.',
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
    <section id="pricing" className="zen-section mx-auto max-w-5xl px-5 sm:px-6">
      <div className="mb-14 flex flex-col items-center text-center">
        <Hanko kanji="価" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">
          Pricing · 値段
        </Reveal>
        <Reveal as="h2" delay={200} className="section-heading text-sumi max-w-2xl">
          Live with it for {TRIAL_DAYS} days.
          <span className="block italic text-sumi-soft font-normal">
            Keep it forever for {price.formatted}.
          </span>
        </Reveal>
        <Reveal
          as="p"
          delay={280}
          className="prose-readable mx-auto mt-5 text-[1.0625rem] text-sumi-soft"
        >
          One payment, then never again. AlDente Pro is about $24 a year, every
          year. Sensei is {price.formatted}, once. Every Mac you own, every
          future Premium feature, no subscription, no account.
        </Reveal>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        {/* Trial card */}
        <Reveal delay={120} className="h-full">
          <TiltCard rotateAmplitude={3} scaleOnHover={1.005}>
            <article className="paper-card flex h-full flex-col p-7 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-jp text-xs tracking-widest text-nezumi">
                    お試し
                  </p>
                  <h3 className="display-title mt-1 text-[1.5rem] font-medium text-sumi">
                    Free trial
                  </h3>
                </div>
                <span className="kanji-accent font-jp text-3xl leading-none text-sumi-soft/70">
                  試
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="display-title text-[2.5rem] font-medium text-sumi leading-none tabular-nums">
                  {price.zero}
                </span>
                <span className="text-sm text-sumi-soft">
                  for {TRIAL_DAYS} days
                </span>
              </div>
              <p className="mt-2 text-[0.8125rem] text-nezumi">
                No card. No account. Then {price.formatted} once — or revert to
                the free essentials.
              </p>

              <ul className="mt-7 space-y-2.5">
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

              <a
                href="/download/latest"
                className="mt-auto pt-8 self-stretch"
              >
                <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-6 text-sm font-medium text-sumi transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:border-sumi/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]">
                  Start free — no card
                </span>
              </a>
            </article>
          </TiltCard>
        </Reveal>

        {/* Premium card */}
        <Reveal delay={220} className="h-full">
          <TiltCard rotateAmplitude={3} scaleOnHover={1.005}>
            <article className="paper-card relative flex h-full flex-col p-7 md:p-8">
              {/* Recommended ribbon */}
              <span
                aria-hidden
                className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-hinomaru px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-washi shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]"
              >
                <span className="font-jp text-[11px] leading-none">推</span>
                Recommended
              </span>

              <div>
                <p className="font-jp text-xs tracking-widest text-hinomaru/80">
                  先生 · Premium
                </p>
                <h3 className="display-title mt-1 text-[1.5rem] font-medium text-sumi">
                  Sensei Premium
                </h3>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="display-title text-[2.5rem] font-medium text-sumi leading-none tabular-nums">
                  {price.formatted}
                </span>
                <span className="text-sm text-sumi-soft">once, forever</span>
              </div>
              <p className="mt-2 text-[0.8125rem] text-nezumi">
                Everything in the trial, plus:
              </p>

              <ul className="mt-7 space-y-4">
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

              <a
                href={premiumCheckoutUrl()}
                className="lemonsqueezy-button btn-sumi mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                Unlock Premium — {price.formatted}
              </a>
              <p className="mt-3 text-center text-[0.75rem] text-nezumi">
                Secure checkout by Lemon Squeezy · 14-day refund, no questions
              </p>
            </article>
          </TiltCard>
        </Reveal>
      </div>

      <Reveal as="p" delay={360} className="spec-strip mt-10 text-center">
        Already bought? Enter your license key in Sensei → Settings → Premium.
      </Reveal>
    </section>
  )
}
