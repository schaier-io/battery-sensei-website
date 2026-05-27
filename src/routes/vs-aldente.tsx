import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, Minus, Download as DownloadIcon, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/vs-aldente'
const PAGE_TITLE =
  'Battery Sensei vs AlDente — Free macOS Charge-Limit Alternative'
const PAGE_DESC =
  'A fair side-by-side: Battery Sensei (free, open source) vs AlDente (paid). Charge limits, Travel Mode, low-battery alerts, cycle history. Both native macOS.'

/**
 * Static EN copy mirrored from `vsAldente.faq` in en.json. The user-
 * facing FAQ on this route reads from `t('vsAldente.faq', …)` so all
 * five locales get the localized version; this static copy exists only
 * so the SSR FAQPage JSON-LD below can resolve without going through
 * the i18n runtime (which isn't ready at route-head time).
 *
 * Keep this in lockstep with en.json. House rules: no "AlDente Pro"
 * (the brand uses plain "AlDente" in its own current marketing), no
 * hardcoded prices.
 */
const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Is Battery Sensei free?',
    a: 'The essentials are free forever — charge limit, smart alerts, 30-day history. Premium is a one-time unlock for Meeting Battery Guard, unlimited Saga history, and custom presets. No subscription, no account. Sensei is open source on GitHub.',
  },
  {
    q: 'Does Battery Sensei do everything AlDente does?',
    a: 'Most of what most people use AlDente for, yes: charge limit, Travel Mode for trips, native menu-bar status. Sensei adds smart low-battery alerts at thresholds you choose and a plain-English battery history. AlDente has additional power features like discharge mode and sailing/calibration that Sensei does not match.',
  },
  {
    q: 'When should I pick AlDente instead?',
    a: 'If you want the most fine-grained battery control on macOS today (heat-mode, sailing, discharge), AlDente is the deeper tool. Sensei prioritises calm defaults and a quiet menu-bar story over an exhaustive feature list.',
  },
  {
    q: 'Will switching from AlDente to Battery Sensei lose my data?',
    a: 'Nothing in macOS itself is lost. Sensei starts a fresh battery journal from install day. You can run both apps briefly during the switchover, then uninstall the one you do not want.',
  },
  {
    q: 'Are charge limits safe? Does Apple support them?',
    a: 'Apple already implements Optimized Battery Charging in macOS to hold around 80% based on your habits. Manual charge-limit tools like Battery Sensei or AlDente sit on top of that, letting you set the cap explicitly. Apple\'s own guidance is that lithium-ion ages faster the longer it sits at 100%.',
  },
]

export const Route = createFileRoute('/vs-aldente')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
      { property: 'og:image', content: `${SITE_URL}/share-card.png` },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: PAGE_TITLE },
      { name: 'twitter:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'vs AlDente',
              item: `${SITE_URL}${PATH}`,
            },
          ],
        }),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        }),
      },
    ],
  }),
  component: VsAldentePage,
})

type Row = {
  label: string
  sensei: 'yes' | 'partial' | 'no' | string
  aldente: 'yes' | 'partial' | 'no' | string
}

function VsAldentePage() {
  const { t } = useTranslation()
  const ROWS = t('vsAldente.rows', { returnObjects: true }) as Row[]
  const differentList = t('vsAldente.different', { returnObjects: true }) as Array<{ title: string; body: string }>
  const faqList = t('vsAldente.faq', { returnObjects: true }) as Array<{ q: string; a: string }>
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('vsAldente.backLink')}
            </Link>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="比" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t('vsAldente.kicker')}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('vsAldente.heading')}
              <span className="block italic text-sumi-soft font-normal">
                {t('vsAldente.headingItalic')}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={320}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('vsAldente.intro')}
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6">
          <Reveal delay={420}>
            <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_92%,#fff)] shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_18px_40px_-22px_rgba(28,26,23,0.18)]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.18em] text-sumi-soft">
                    <th className="w-[44%] px-5 py-4 font-semibold">{t('vsAldente.tableHeaders.feature')}</th>
                    <th className="w-[28%] px-5 py-4 font-semibold text-hinomaru">
                      {t('vsAldente.tableHeaders.sensei')}
                    </th>
                    <th className="w-[28%] px-5 py-4 font-semibold">{t('vsAldente.tableHeaders.aldente')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {ROWS.map((r) => (
                    <tr key={r.label} className="align-top">
                      <td className="px-5 py-3.5 text-sumi">{r.label}</td>
                      <Cell value={r.sensei} accent partialLabel={t('vsAldente.labels.partial')} />
                      <Cell value={r.aldente} partialLabel={t('vsAldente.labels.partial')} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal as="p" delay={520} className="mt-6 text-[12px] tracking-[0.1em] text-nezumi">
            {t('vsAldente.lastUpdatedNote')}
          </Reveal>
        </section>

        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="h2" delay={120} className="display-title text-2xl font-semibold text-sumi md:text-3xl">
            {t('vsAldente.differentHeading')}
          </Reveal>
          <Reveal as="ul" delay={200} className="mt-6 space-y-4 text-sumi-soft">
            {differentList.map(({ title, body }) => (
              <li key={title}>
                <span className="text-sumi font-semibold">{title}</span>{' '}{body}
              </li>
            ))}
          </Reveal>

          <Reveal as="h2" delay={280} className="display-title mt-12 text-2xl font-semibold text-sumi md:text-3xl">
            {t('vsAldente.wins')}
          </Reveal>
          <Reveal as="p" delay={340} className="mt-4 text-sumi-soft leading-relaxed">
            {t('vsAldente.winsBody')}
          </Reveal>

          <Reveal as="h2" delay={420} className="display-title mt-12 text-2xl font-semibold text-sumi md:text-3xl">
            {t('vsAldente.questions')}
          </Reveal>
          <Reveal delay={500} className="mt-6">
            <dl className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_94%,#fff)]">
              {faqList.map(({ q, a }) => (
                <div key={q} className="px-5 py-4">
                  <dt className="text-sumi font-semibold">{q}</dt>
                  <dd className="mt-2 text-sumi-soft leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={600} className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              to="/"
              hash="download"
              className="btn-sumi inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium"
            >
              <DownloadIcon className="h-4 w-4" strokeWidth={1.8} />
              {t('vsAldente.tryFree')}
            </Link>
            <a
              href="https://github.com/schaier-io/battery-sensei-releases"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              {t('vsAldente.readSource')}
            </a>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Cell({
  value,
  accent = false,
  partialLabel,
}: {
  value: string
  accent?: boolean
  partialLabel: string
}) {
  if (value === 'yes') {
    return (
      <td className="px-5 py-3.5">
        <Check
          className={`h-4 w-4 ${accent ? 'text-hinomaru' : 'text-matcha'}`}
          strokeWidth={2}
        />
      </td>
    )
  }
  if (value === 'no') {
    return (
      <td className="px-5 py-3.5">
        <Minus className="h-4 w-4 text-nezumi" strokeWidth={2} />
      </td>
    )
  }
  if (value === 'partial') {
    return (
      <td className="px-5 py-3.5 text-[12px] uppercase tracking-[0.16em] text-sumi-soft">
        {partialLabel}
      </td>
    )
  }
  return (
    <td className={`px-5 py-3.5 text-sm ${accent ? 'text-sumi font-medium' : 'text-sumi-soft'}`}>
      {value}
    </td>
  )
}
