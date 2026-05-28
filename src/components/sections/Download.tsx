import { Download as DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '#/components/zen/Reveal'
import { ChargeRing } from '#/components/zen/ChargeRing'
import { MacOnlyConfirm } from '#/components/MacOnlyConfirm'
import { TRIAL_DAYS } from '#/lib/polar'
import { useLifetimePrice } from '#/lib/use-price'

export function Download() {
  const lifetime = useLifetimePrice()
  const price = lifetime.discounted
  const { t } = useTranslation()
  return (
    <section id="download" className="zen-section px-5 sm:px-6">
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal delay={60} className="relative mx-auto mb-8 w-fit">
          <ChargeRing fraction={0.8} size={240} />
        </Reveal>

        <Reveal as="p" delay={140} className="font-jp text-base text-hinomaru/80 mb-3 tracking-[0.4em]">
          {t('download.welcome')}
        </Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="section-heading text-sumi"
        >
          {t('download.heading')}
          <span className="block italic text-sumi-soft font-normal">
            {t('download.headingItalic')}
          </span>
        </Reveal>
        <Reveal
          as="p"
          delay={280}
          className="prose-readable mx-auto mt-6 text-[1.0625rem] text-sumi-soft md:text-[1.125rem]"
        >
          {t('download.body', { trial: TRIAL_DAYS, price: price.formatted })}
        </Reveal>
        <Reveal
          delay={360}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <MacOnlyConfirm
            onConfirm={() => window.location.assign('/download/latest')}
          >
            {({ onClick }) => (
              <a
                href="/download/latest"
                onClick={onClick}
                className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
              >
                <DownloadIcon
                  className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                  strokeWidth={1.8}
                />
                {t('common.downloadMac')}
              </a>
            )}
          </MacOnlyConfirm>
        </Reveal>
        <Reveal
          delay={440}
          className="mt-9 grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto"
        >
          <TrustPill kanji="速" title={t('download.trust.native.title')} body={t('download.trust.native.body')} />
          <TrustPill kanji="軽" title={t('download.trust.light.title')} body={t('download.trust.light.body')} />
          <TrustPill kanji="無" title={t('download.trust.private.title')} body={t('download.trust.private.body')} />
        </Reveal>

        <Reveal
          as="p"
          delay={520}
          className="spec-strip mt-8"
        >
          {t('download.specStrip', { trial: TRIAL_DAYS, price: price.formatted })}
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
