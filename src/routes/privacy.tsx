import { createFileRoute } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { ArrowLeft, Check, X } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/privacy'
const PAGE_TITLE = 'Privacy — Battery Sensei'
const PAGE_DESC =
  'What we collect, why, who we share it with, and your rights as a visitor or customer. Plain-language privacy notice for battery-sensei.app.'
// Last meaningful edit to the legal substance below. Update when you
// change WHAT is collected / processors / retention — not on cosmetic
// tweaks. Format matches the schema.org Article spec.
const LAST_UPDATED = '2026-05-31'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      // Legal pages should be crawlable so the privacy URL is reachable
      // from Google's "site:" results — required for some payment
      // processor + advertiser onboarding flows. The visitor-facing
      // value is low but transparency is the point.
      { name: 'robots', content: 'index, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: PrivacyPage,
})

/**
 * Privacy notice.
 *
 * The body is authoritative in English — the chrome (kicker, page
 * title italic, last-updated label, footer back-link) is translated
 * via i18n keys so it sits naturally inside whichever locale the
 * visitor has selected. Translating legal substance is out of scope
 * until counsel can review; localized summaries can be added later
 * under each section if the audience justifies it.
 *
 * Every claim below maps to something a developer can verify in the
 * repo: the cookies/storage table mirrors the actual surface area
 * audited in the chat (`bs_locale`, sessionStorage purchase dedupe),
 * the processors list mirrors what's actually wired in
 * (`@vercel/analytics`, `@vercel/speed-insights`, Polar Software Inc.
 * for checkout, Resend for newsletter, PostgreSQL via Vercel).
 */
function PrivacyPage() {
  const { t, i18n } = useTranslation()
  const formattedDate = new Intl.DateTimeFormat(i18n.language || 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(LAST_UPDATED))

  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <HomeLink
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('privacy.backHome')}
            </HomeLink>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="個" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t('privacy.kicker')}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('privacy.title')}
              <span className="block italic text-sumi-soft font-normal">
                {t('privacy.titleItalic')}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={300}
              className="mt-3 text-[12px] uppercase tracking-[0.18em] text-nezumi"
            >
              {t('privacy.lastUpdated', { date: formattedDate })}
            </Reveal>
            <Reveal
              as="p"
              delay={360}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              {t('privacy.intro')}
            </Reveal>
          </div>
        </section>

        {/* TL;DR callout — the plain-language do / don't summary that mirrors
            the page title ("What we collect. And what we don't."). Sits above
            the formal sections so a visitor gets the gist without reading the
            whole notice; everything here is restated, with legal basis, in the
            blocks below. */}
        <section className="zen-section mx-auto max-w-3xl px-5 pt-0 sm:px-6">
          <Reveal>
            <Tldr />
          </Reveal>
        </section>

        {/* Authoritative English body. Keep section anchors (#app, #github,
            #what, #processors, #rights, #contact) stable so external
            references stay valid. */}
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal>
            <article className="legal-prose space-y-10 text-sumi-soft">
              <Block
                anchor="controller"
                kicker={t('privacy.body.controller.kicker')}
                heading={t('privacy.body.controller.heading')}
              >
                <p>
                  <Trans
                    i18nKey="privacy.body.controller.p1"
                    components={[<strong className="text-sumi" />]}
                  />
                </p>
                <p>
                  <Trans
                    i18nKey="privacy.body.controller.p2"
                    components={[<a className="legal-link" href="mailto:info@battery-sensei.app" />]}
                  />
                </p>
              </Block>

              {/* The app itself. Deliberately placed before the website
                  sections: the question most visitors actually have is "does
                  the app on my Mac phone home?" — and the answer is no, beyond
                  the update check described in p3. */}
              <Block
                anchor="app"
                kicker={t('privacy.body.app.kicker')}
                heading={t('privacy.body.app.heading')}
              >
                <p>{t('privacy.body.app.p1')}</p>
                <p>{t('privacy.body.app.p2')}</p>
                <p>{t('privacy.body.app.p3')}</p>
              </Block>

              {/* GitHub release pages. Split out from the app section on
                  purpose: downloading the binary (from the site button or the
                  in-app updater) is a direct connection to GitHub, which sees
                  the visitor's IP as an independent controller. */}
              <Block
                anchor="github"
                kicker={t('privacy.body.github.kicker')}
                heading={t('privacy.body.github.heading')}
              >
                <p>
                  <Trans
                    i18nKey="privacy.body.github.p1"
                    components={[<a className="legal-link" href="https://github.com/schaier-io/battery-sensei-releases" target="_blank" rel="noreferrer" />]}
                  />
                </p>
                <p>
                  <Trans
                    i18nKey="privacy.body.github.p2"
                    components={[<strong className="text-sumi" />]}
                  />
                </p>
                <p>
                  <Trans
                    i18nKey="privacy.body.github.p3"
                    components={[<a className="legal-link" href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer" />]}
                  />
                </p>
              </Block>

              <Block
                anchor="what"
                kicker={t('privacy.body.what.kicker')}
                heading={t('privacy.body.what.heading')}
              >
                <p>{t('privacy.body.what.intro')}</p>
                <ul className="legal-list">
                  <DataItem nameKey="privacy.body.what.items.localeName" bodyKey="privacy.body.what.items.localeBody" inlineComponents={[<code />]} />
                  <DataItem nameKey="privacy.body.what.items.purchaseName" bodyKey="privacy.body.what.items.purchaseBody" inlineComponents={[<code />]} />
                  <DataItem nameKey="privacy.body.what.items.analyticsName" bodyKey="privacy.body.what.items.analyticsBody" />
                  <DataItem nameKey="privacy.body.what.items.signupName" bodyKey="privacy.body.what.items.signupBody" />
                  <DataItem nameKey="privacy.body.what.items.contactName" bodyKey="privacy.body.what.items.contactBody" />
                  <DataItem nameKey="privacy.body.what.items.checkoutName" bodyKey="privacy.body.what.items.checkoutBody" />
                  <DataItem nameKey="privacy.body.what.items.logsName" bodyKey="privacy.body.what.items.logsBody" />
                </ul>
              </Block>

              <Block
                anchor="why"
                kicker={t('privacy.body.why.kicker')}
                heading={t('privacy.body.why.heading')}
              >
                <ul className="legal-list">
                  <DataItem nameKey="privacy.body.why.items.functionalName" bodyKey="privacy.body.why.items.functionalBody" inlineComponents={[<em />]} />
                  <DataItem nameKey="privacy.body.why.items.orderName" bodyKey="privacy.body.why.items.orderBody" inlineComponents={[<em />]} />
                  <DataItem nameKey="privacy.body.why.items.newsletterName" bodyKey="privacy.body.why.items.newsletterBody" inlineComponents={[<em />, <a className="legal-link" href="mailto:info@battery-sensei.app" />]} />
                  <DataItem nameKey="privacy.body.why.items.analyticsName" bodyKey="privacy.body.why.items.analyticsBody" inlineComponents={[<em />]} />
                  <DataItem nameKey="privacy.body.why.items.abuseName" bodyKey="privacy.body.why.items.abuseBody" inlineComponents={[<em />]} />
                </ul>
                <p className="text-[0.875rem] leading-[1.65] text-nezumi">
                  {t('privacy.body.why.noAutomated')}
                </p>
              </Block>

              <Block
                anchor="processors"
                kicker={t('privacy.body.processors.kicker')}
                heading={t('privacy.body.processors.heading')}
              >
                <p>{t('privacy.body.processors.intro')}</p>
                <ul className="legal-list">
                  <DataItem
                    nameKey="privacy.body.processors.items.vercelName"
                    bodyKey="privacy.body.processors.items.vercelBody"
                    inlineComponents={[<a className="legal-link" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" />]}
                  />
                  <DataItem
                    nameKey="privacy.body.processors.items.polarName"
                    bodyKey="privacy.body.processors.items.polarBody"
                    inlineComponents={[<a className="legal-link" href="https://polar.sh/legal/privacy" target="_blank" rel="noreferrer" />]}
                  />
                  <DataItem
                    nameKey="privacy.body.processors.items.resendName"
                    bodyKey="privacy.body.processors.items.resendBody"
                    inlineComponents={[<a className="legal-link" href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer" />]}
                  />
                  <DataItem
                    nameKey="privacy.body.processors.items.postgresName"
                    bodyKey="privacy.body.processors.items.postgresBody"
                    inlineComponents={[<a className="legal-link" href="https://www.databricks.com/legal/privacynotice" target="_blank" rel="noreferrer" />]}
                  />
                </ul>
              </Block>

              <Block
                anchor="retention"
                kicker={t('privacy.body.retention.kicker')}
                heading={t('privacy.body.retention.heading')}
              >
                <ul className="legal-list">
                  <DataItem nameKey="privacy.body.retention.items.signupName" bodyKey="privacy.body.retention.items.signupBody" />
                  <DataItem nameKey="privacy.body.retention.items.contactName" bodyKey="privacy.body.retention.items.contactBody" />
                  <DataItem nameKey="privacy.body.retention.items.purchaseName" bodyKey="privacy.body.retention.items.purchaseBody" />
                  <DataItem nameKey="privacy.body.retention.items.logsName" bodyKey="privacy.body.retention.items.logsBody" />
                </ul>
              </Block>

              <Block
                anchor="rights"
                kicker={t('privacy.body.rights.kicker')}
                heading={t('privacy.body.rights.heading')}
              >
                <p>{t('privacy.body.rights.intro')}</p>
                <ul className="legal-list">
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.access" components={[<strong className="text-sumi" />]} />
                  </li>
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.correct" components={[<strong className="text-sumi" />]} />
                  </li>
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.delete" components={[<strong className="text-sumi" />]} />
                  </li>
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.restrict" components={[<strong className="text-sumi" />]} />
                  </li>
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.portable" components={[<strong className="text-sumi" />]} />
                  </li>
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.object" components={[<strong className="text-sumi" />]} />
                  </li>
                  <li>
                    <Trans i18nKey="privacy.body.rights.items.withdraw" components={[<strong className="text-sumi" />]} />
                  </li>
                </ul>
                <p>
                  <Trans
                    i18nKey="privacy.body.rights.closing"
                    components={[
                      <a className="legal-link" href="mailto:info@battery-sensei.app" />,
                      <a className="legal-link" href="https://uoou.gov.cz" target="_blank" rel="noreferrer" />,
                    ]}
                  />
                </p>
              </Block>

              <Block
                anchor="changes"
                kicker={t('privacy.body.changes.kicker')}
                heading={t('privacy.body.changes.heading')}
              >
                <p>{t('privacy.body.changes.p1')}</p>
              </Block>
            </article>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}

/**
 * Plain-language TL;DR. Two short columns — what we do, what we don't —
 * that mirror the page title ("What we collect. And what we don't.").
 * Pure summary: every line here is restated, with its legal basis, in
 * the formal sections below, so the box can be skimmed and skipped
 * without losing anything binding.
 */
function Tldr() {
  const { t } = useTranslation()
  const keys = ['1', '2', '3', '4'] as const
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,#fff)] p-6 sm:p-8">
      <p className="font-jp text-[11px] tracking-[0.32em] text-hinomaru/85 uppercase">
        TL;DR · 要約
      </p>
      <h2 className="display-title mt-2 text-[1.5rem] font-medium leading-tight text-sumi md:text-[1.75rem]">
        {t('privacy.tldr.heading')}
      </h2>
      <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <TldrColumn
          tone="do"
          label={t('privacy.tldr.doLabel')}
          items={keys.map((n) => t(`privacy.tldr.do.${n}`))}
        />
        <TldrColumn
          tone="dont"
          label={t('privacy.tldr.dontLabel')}
          items={keys.map((n) => t(`privacy.tldr.dont.${n}`))}
        />
      </div>
      <p className="mt-6 border-t border-[var(--line)] pt-4 text-[0.875rem] leading-[1.65] text-nezumi">
        {t('privacy.tldr.note')}
      </p>
    </div>
  )
}

/**
 * One side of the TL;DR. The "do" column gets a matcha check, the "don't"
 * column a hinomaru cross — the same two-color do/don't language the rest
 * of the site uses for affirmative vs negative states.
 */
function TldrColumn({
  tone,
  label,
  items,
}: {
  tone: 'do' | 'dont'
  label: string
  items: string[]
}) {
  const Icon = tone === 'do' ? Check : X
  const iconColor = tone === 'do' ? 'text-matcha' : 'text-hinomaru'
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-nezumi">{label}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-[0.9375rem] leading-[1.55] text-sumi-soft"
          >
            <Icon
              className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`}
              strokeWidth={2.25}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One data-item row. Standard shape across the "what" / "why" /
 * "processors" / "retention" sections — bold name, em-dash, descriptive
 * body that may carry inline rich-text components (links, em, code).
 * Pulling the pattern into a single helper means each row stays one
 * line in the JSX and Trans markers stay shallow.
 */
function DataItem({
  nameKey,
  bodyKey,
  inlineComponents,
}: {
  nameKey: string
  bodyKey: string
  /** Components passed positionally to <Trans> for inline markup
   *  inside the body string (<0>, <1>, …). */
  inlineComponents?: React.ReactElement[]
}) {
  const { t } = useTranslation()
  return (
    <li>
      <strong className="text-sumi">{t(nameKey)}</strong> —{' '}
      {inlineComponents && inlineComponents.length > 0 ? (
        <Trans i18nKey={bodyKey} components={inlineComponents} />
      ) : (
        t(bodyKey)
      )}
    </li>
  )
}

/**
 * Single section block. Wraps each chapter in a stable anchor + kicker
 * + heading, so the layout doesn't drift between sections and external
 * deep-links (#processors, #rights) keep working as the page evolves.
 */
function Block({
  anchor,
  kicker,
  heading,
  children,
}: {
  anchor: string
  kicker: string
  heading: string
  children: React.ReactNode
}) {
  return (
    <section id={anchor} className="scroll-mt-24">
      <p className="font-jp text-[11px] tracking-[0.32em] text-hinomaru/85 uppercase">
        {kicker}
      </p>
      <h2 className="display-title mt-2 text-[1.625rem] md:text-[1.875rem] font-medium text-sumi leading-tight">
        {heading}
      </h2>
      <div className="mt-4 space-y-4 text-[0.9375rem] leading-[1.7] text-sumi-soft md:text-[1rem]">
        {children}
      </div>
    </section>
  )
}
