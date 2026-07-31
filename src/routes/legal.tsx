import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLink } from '#/components/HomeLink'
import { ArrowLeft, Mail } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { DocumentNav, type DocumentNavItem } from '#/components/DocumentNav'
import { ProtectedBusinessPhone } from '#/components/ProtectedBusinessPhone'
import { formatLongDate } from '#/lib/format-date'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/legal'
const PAGE_TITLE = 'Legal — Battery Sensei'
const PAGE_DESC =
  'Imprint and legal disclaimer for battery-sensei.app: operator details, liability disclaimer, copyright, governing law and out-of-court dispute resolution.'
// Last meaningful edit to the legal substance below. Update when you
// change operator details, governing law, the merchant-of-record or any
// referenced authority — not on cosmetic tweaks. This dates the imprint,
// independently of the footer's build-time site date.
const LAST_UPDATED = '2026-07-31'

/** Section order for the jump list. `anchor` must match the `<Block anchor>`
    below it; `key` is the i18n namespace the heading is read from. */
const LEGAL_SECTIONS: ReadonlyArray<Omit<DocumentNavItem, 'label'> & { key: string }> = [
  { anchor: 'operator', key: 'operator' },
  { anchor: 'eu-representative', key: 'euRepresentative' },
  { anchor: 'merchant-of-record', key: 'merchantOfRecord' },
  { anchor: 'withdrawal', key: 'withdrawal' },
  { anchor: 'content-liability', key: 'contentLiability' },
  { anchor: 'external-links', key: 'externalLinks' },
  { anchor: 'copyright', key: 'copyright' },
  { anchor: 'governing-law', key: 'governingLaw' },
  { anchor: 'dispute-resolution', key: 'disputeResolution' },
  { anchor: 'privacy-pointer', key: 'privacyPointer' },
]

export const Route = createFileRoute('/legal')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      // Keep the operator's identifying details crawlable and directly
      // reachable from the site footer.
      { name: 'robots', content: 'index, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: LegalPage,
})

/**
 * Imprint + legal disclaimer.
 *
 * Operator identity is intentionally limited to the fields needed to
 * identify and contact 41BIT LLC. Formation date, NAICS classification,
 * and good-standing status are not customer-facing legal disclosures.
 */
function LegalPage() {
  const { t, i18n } = useTranslation()
  // Same formatter the footer uses, so the document date and the site date
  // read in one shape on one screen.
  const formattedDate = formatLongDate(LAST_UPDATED, i18n.language)

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
              {t('legal.backHome')}
            </HomeLink>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="法" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4">
              {t('legal.kicker')}
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {t('legal.title')}
              <span className="block italic text-sumi-soft font-normal">
                {t('legal.titleItalic')}
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={300}
              className="mt-3 text-[12px] uppercase tracking-[0.18em] text-nezumi"
            >
              {t('legal.lastUpdated', { date: formattedDate })}
            </Reveal>
            <Reveal
              as="p"
              delay={360}
              className="prose-readable mt-6 text-base text-sumi-soft md:text-[1.0625rem]"
            >
              {t('legal.intro')}
            </Reveal>
            <DocumentNav
              className="mt-8 w-full max-w-2xl text-left"
              label={t('legal.onThisPage', 'On this page')}
              items={LEGAL_SECTIONS.map((section) => ({
                anchor: section.anchor,
                label: t(`legal.body.${section.key}.heading`),
              }))}
            />
          </div>
        </section>

        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal>
            <article className="legal-prose space-y-10 text-sumi-soft">
              <Block
                anchor="operator"
                kicker={t('legal.body.operator.kicker')}
                heading={t('legal.body.operator.heading')}
              >
                {/* Legal entity, reachable company address, registry id,
                    contact channel, and separate developer/IP ownership. */}
                <p>
                  <strong className="text-sumi">{t('legal.body.operator.name')}</strong>
                  <br />
                  {t('legal.body.operator.status')}
                </p>
                <p>
                  {t('legal.body.operator.seatLabel')}
                  <br />
                  {t('legal.body.operator.seatLine1')}
                  <br />
                  {t('legal.body.operator.seatLine2')}
                  <br />
                  {t('legal.body.operator.seatLine3')}
                </p>
                <p>
                  <Trans i18nKey="legal.body.operator.entityId" components={[<strong className="text-sumi" />]} />
                </p>
                <p>
                  <Trans
                    i18nKey="legal.body.operator.emailLine"
                    components={[<a className="legal-link" href="mailto:info@battery-sensei.app" />]}
                  />
                  <br />
                  <ProtectedBusinessPhone
                    label={t('legal.body.operator.phoneLabel')}
                    revealLabel={t('legal.body.operator.phoneReveal')}
                    callLabel={t('legal.body.operator.phoneCallLabel')}
                  />
                </p>
                <p className="text-[0.875rem] leading-[1.65] text-nezumi">
                  <Trans i18nKey="legal.body.operator.responsibility" components={[<strong className="text-sumi-soft" />]} />
                </p>
              </Block>

              <Block
                anchor="eu-representative"
                kicker={t('legal.body.euRepresentative.kicker')}
                heading={t('legal.body.euRepresentative.heading')}
              >
                <p>
                  <Trans
                    i18nKey="legal.body.euRepresentative.p1"
                    components={[
                      <strong className="text-sumi" />,
                      <a
                        className="legal-link"
                        href="https://eur-lex.europa.eu/eli/reg/2016/679/oj"
                        target="_blank"
                        rel="noreferrer"
                      />,
                      <a className="legal-link" href="mailto:info@battery-sensei.app" />,
                    ]}
                  />
                </p>
                <p>{t('legal.body.euRepresentative.p2')}</p>
              </Block>

              <Block
                anchor="merchant-of-record"
                kicker={t('legal.body.merchantOfRecord.kicker')}
                heading={t('legal.body.merchantOfRecord.heading')}
              >
                <p>
                  <Trans i18nKey="legal.body.merchantOfRecord.p1" components={[<strong className="text-sumi" />]} />
                </p>
                <p>
                  <Trans
                    i18nKey="legal.body.merchantOfRecord.p2"
                    components={[<a className="legal-link" href="https://polar.sh/legal" target="_blank" rel="noreferrer" />]}
                  />
                </p>
              </Block>

              <Block
                anchor="withdrawal"
                kicker={t('legal.body.withdrawal.kicker')}
                heading={t('legal.body.withdrawal.heading')}
              >
                <p>
                  <Trans i18nKey="legal.body.withdrawal.p1" components={[<strong className="text-sumi" />]} />
                </p>
                <p>
                  <Trans i18nKey="legal.body.withdrawal.p2" components={[<strong className="text-sumi" />]} />
                </p>
                <p>
                  <Trans
                    i18nKey="legal.body.withdrawal.p3"
                    components={[<a className="legal-link" href="mailto:info@battery-sensei.app" />]}
                  />
                </p>
                <p>{t('legal.body.withdrawal.p4')}</p>
                {/* One-click refund-request mailto. Pre-fills subject +
                    body so support can match the purchase by Polar order
                    id in a few seconds; the hint underneath nudges the
                    buyer to send from the address used at checkout so
                    we don't have to verify identity over a second
                    round-trip. */}
                <p className="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="mailto:info@battery-sensei.app?subject=Refund%20request%20%E2%80%94%20Battery%20Sensei&body=Hi%2C%0A%0AI%27d%20like%20to%20request%20a%20refund%20for%20my%20Battery%20Sensei%20purchase.%0A%0APolar%20order%20id%20%28if%20handy%29%3A%20%0AReason%20%28optional%29%3A%20%0A%0APlease%20note%3A%20I%20am%20sending%20this%20from%20the%20email%20I%20used%20at%20checkout.%0A%0AThanks%2C"
                    className="btn-sumi inline-flex h-10 items-center gap-2 rounded-md px-4 text-[0.8125rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
                  >
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    {t('legal.body.withdrawal.refundCta')}
                  </a>
                  <span className="text-[0.8125rem] text-sumi-soft">
                    {t('legal.body.withdrawal.refundCtaHint')}
                  </span>
                </p>
                {/* FAQ deep-link — same anchor the checkout trust badge
                    points to, so the visitor lands on the auto-expanded
                    refund row. Keeps both pages telling the same story
                    without prose duplication. */}
                <p className="mt-2 text-[0.8125rem]">
                  <HomeLink className="legal-link" hash="faq-refund">
                    {t('legal.body.withdrawal.faqLink')}
                  </HomeLink>
                </p>
              </Block>

              <Block
                anchor="content-liability"
                kicker={t('legal.body.contentLiability.kicker')}
                heading={t('legal.body.contentLiability.heading')}
              >
                <p>{t('legal.body.contentLiability.p1')}</p>
                <p>{t('legal.body.contentLiability.p2')}</p>
              </Block>

              <Block
                anchor="external-links"
                kicker={t('legal.body.externalLinks.kicker')}
                heading={t('legal.body.externalLinks.heading')}
              >
                <p>{t('legal.body.externalLinks.p1')}</p>
              </Block>

              <Block
                anchor="copyright"
                kicker={t('legal.body.copyright.kicker')}
                heading={t('legal.body.copyright.heading')}
              >
                <p>{t('legal.body.copyright.p1')}</p>
                <p>{t('legal.body.copyright.p2')}</p>
              </Block>

              <Block
                anchor="governing-law"
                kicker={t('legal.body.governingLaw.kicker')}
                heading={t('legal.body.governingLaw.heading')}
              >
                <p>{t('legal.body.governingLaw.p1')}</p>
              </Block>

              <Block
                anchor="dispute-resolution"
                kicker={t('legal.body.disputeResolution.kicker')}
                heading={t('legal.body.disputeResolution.heading')}
              >
                <p>
                  <Trans
                    i18nKey="legal.body.disputeResolution.p1"
                    components={[<a className="legal-link" href="mailto:info@battery-sensei.app" />]}
                  />
                </p>
                <p>
                  <Trans
                    i18nKey="legal.body.disputeResolution.p2"
                    components={[<a className="legal-link" href="https://polar.sh/legal/checkout-buyer-terms" target="_blank" rel="noreferrer" />]}
                  />
                </p>
                <p>{t('legal.body.disputeResolution.p3')}</p>
              </Block>

              <Block
                anchor="privacy-pointer"
                kicker={t('legal.body.privacyPointer.kicker')}
                heading={t('legal.body.privacyPointer.heading')}
              >
                <p>
                  <Trans
                    i18nKey="legal.body.privacyPointer.p1"
                    components={[<Link className="legal-link" to="/privacy" />]}
                  />
                </p>
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
 * Same section primitive as the privacy page — kept inline here so the
 * two routes stay independently editable. If a third legal page lands,
 * lift this into `src/components/zen/LegalBlock.tsx`.
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
      <p className="font-jp text-[11px] tracking-[0.32em] text-hinomaru-ink/85 uppercase">
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
