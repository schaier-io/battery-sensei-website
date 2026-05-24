import { Download as DownloadIcon } from 'lucide-react'
import { GithubMark } from '#/components/icons/GithubMark'
import { Reveal } from '#/components/zen/Reveal'
import { ChargeRing } from '#/components/zen/ChargeRing'
import { TRIAL_DAYS } from '#/lib/lemon'
import { usePremiumPrice } from '#/lib/use-price'

export function Download() {
  const price = usePremiumPrice()
  return (
    <section id="download" className="zen-section px-5 sm:px-6">
      <div className="relative mx-auto max-w-3xl text-center">
        {/* Bristled brush ring + gold charge arc + shimmer + app icon —
            mirrors the macOS app's heroIconPanel, at the "almost full"
            80% point with a sweeping highlight along the gold. */}
        <Reveal delay={60} className="relative mx-auto mb-8 w-fit">
          <ChargeRing fraction={0.8} size={240} />
        </Reveal>

        <Reveal as="p" delay={140} className="font-jp text-base text-hinomaru/80 mb-3 tracking-[0.4em]">
          ようこそ
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="section-heading text-sumi"
        >
          Install once.
          <span className="block italic text-sumi-soft font-normal">
            Let your battery breathe.
          </span>
        </Reveal>
        <Reveal
          as="p"
          delay={280}
          className="prose-readable mx-auto mt-6 text-[1.0625rem] text-sumi-soft md:text-[1.125rem]"
        >
          {TRIAL_DAYS} days to live with it. Then {price.formatted} once, never
          again — about a sixth of an AlDente Pro year. Notarized by Apple. Sits
          in your menu bar from day one and looks after your battery without
          asking again.
        </Reveal>
        <Reveal
          delay={360}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="/download/latest"
            className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <DownloadIcon
              className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
              strokeWidth={1.8}
            />
            Download for macOS
          </a>
          <a
            href="https://github.com/schaier-io/battery-sensei-releases"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-sumi-soft transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
          >
            <GithubMark className="h-4 w-4" strokeWidth={1.5} />
            Source
          </a>
        </Reveal>
        <Reveal
          delay={440}
          className="mt-9 grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto"
        >
          <TrustPill kanji="速" title="Native macOS" body="AppKit and SwiftUI. Feels like a system tool, because it is one." />
          <TrustPill kanji="軽" title="Light on your battery" body="No background polling. Sensei wakes only when macOS reports a change." />
          <TrustPill kanji="無" title="Nothing leaves your Mac" body="No telemetry. No account. No cloud, ever." />
        </Reveal>

        <Reveal
          as="p"
          delay={520}
          className="spec-strip mt-8"
        >
          macOS 13+. Apple Silicon &amp; Intel. {TRIAL_DAYS} days free, no card. {price.formatted} once. 14-day refund.
        </Reveal>
      </div>
    </section>
  )
}

function TrustPill({
  kanji,
  title,
  body,
}: {
  kanji: string
  title: string
  body: string
}) {
  return (
    <div className="relative rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] px-4 py-4 text-left transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5">
      <span
        aria-hidden
        className="absolute top-3 right-3 font-jp text-base text-hinomaru/70 leading-none"
      >
        {kanji}
      </span>
      <p className="display-title text-[0.9375rem] font-medium text-sumi tracking-tight pr-7">
        {title}
      </p>
      <p className="mt-1.5 text-[0.8125rem] leading-[1.55] text-sumi-soft">{body}</p>
    </div>
  )
}
