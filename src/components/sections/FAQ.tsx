import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

/** Pre-filled refund mailto — identical body to the /legal `Request a
 *  refund` CTA so both surfaces produce the same support thread shape. */
const REFUND_MAILTO =
  'mailto:info@battery-sensei.app?subject=Refund%20request%20%E2%80%94%20Battery%20Sensei' +
  '&body=Hi%2C%0A%0AI%27d%20like%20to%20request%20a%20refund%20for%20my%20Battery%20Sensei%20purchase.%0A%0A' +
  'Polar%20order%20id%20%28if%20handy%29%3A%20%0AReason%20%28optional%29%3A%20%0A%0A' +
  'Please%20note%3A%20I%20am%20sending%20this%20from%20the%20email%20I%20used%20at%20checkout.%0A%0AThanks%2C'

/**
 * One FAQ item. The optional `id` is a STABLE locale-independent
 * identifier used for deep-linking (e.g. `#faq-refund`) + for the
 * accordion's internal `value` so order changes don't break links.
 * Items without an `id` fall back to a positional `item-N` slug.
 */
type FaqItem = { id?: string; q: string; a: string }

/**
 * Static EN copy of the FAQ. Mirrors `faq.items` in en.json — both must
 * stay in sync because:
 *   - `<FAQ>` renders the locale-aware version via `t('faq.items', …)`
 *   - `src/routes/__root.tsx` consumes THIS array for the SSR FAQPage
 *     JSON-LD schema. Schema-LD runs server-side before i18n hydrates,
 *     so it can't go through `t()` — a static EN copy is the simplest
 *     way to keep rich-result snippets in sync with on-page copy.
 *
 * Where the locale string uses `{{price}}` / `{{trial}}` placeholders,
 * the canonical values are baked in here ($3.99 lifetime, 5-day trial)
 * so search engines see a fully-resolved answer. If the canonical price
 * changes, update both en.json AND this array.
 */
export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
  {
    q: 'Which Macs and macOS versions does Battery Sensei support?',
    a: 'macOS 13 Ventura, Sonoma, Sequoia, and later, on both Apple Silicon (M1/M2/M3/M4) and Intel MacBooks.',
  },
  {
    q: 'How much does Battery Sensei cost?',
    a: 'Sensei Premium is $3.99, one payment, lifetime license — every future Premium feature, every Mac you own. Try it free for 5 days first — no card needed to start, no nag when the trial ends. After the trial the core essentials (charge limit, smart alerts, 30-day history) stay free forever; Premium unlocks Meeting Battery Guard, unlimited Saga history, and custom warning presets. Checkout shows the price in your local currency.',
  },
  {
    q: 'How does the license key work?',
    a: 'After checkout via Polar you get a license key by email. Open Sensei → Settings → Premium and paste the key. Sensei activates it against the Polar API and stores the result locally; no account, no login. The key works on every Mac you own.',
  },
  {
    id: 'refund',
    q: 'Can I get a refund?',
    a: 'Yes. Email within 14 days of purchase and we refund, no questions asked. Polar handles the payment so the refund hits the original card.',
  },
  {
    q: 'How does the charge limit and Travel Mode work?',
    a: 'Sensei caps your MacBook at a charge level you choose (default 80 percent) to extend battery life. One click switches to Travel Mode and Sensei tops the battery up to 100 percent before a trip, then returns to your normal limit when you are home.',
  },
  {
    q: 'Does Battery Sensei send my data anywhere?',
    a: 'No. Battery Sensei is privacy-first. It runs entirely on your Mac. No telemetry, no analytics, no cloud account. Your personal battery history stays local; nothing leaves your machine unless you explicitly share it.',
  },
  {
    q: 'How is Battery Sensei different from the built-in macOS battery menu?',
    a: 'macOS shows you a percentage. Battery Sensei adds smart low-battery alerts at thresholds you choose, a charge limit with Travel Mode, live charging watts, cycle and capacity tracking, and a plain-English history of how your battery is aging.',
  },
  {
    q: 'How much battery does Battery Sensei itself use?',
    a: 'Less than one percent. Sensei is a native AppKit and SwiftUI menu-bar app with no background polling. It samples the system battery only when macOS reports a change.',
  },
  {
    q: 'Is Battery Sensei an AlDente alternative?',
    a: 'Yes. Sensei covers AlDente\'s core charge-limit feature in every tier, adds smart warnings and a plain-English battery history, and ships as a single notarized .pkg installer. Premium adds Meeting Battery Guard and unlimited Saga history for one payment. A detailed side-by-side comparison lives at battery-sensei.app/vs-aldente.',
  },
  {
    q: 'How do I update Battery Sensei?',
    a: 'Sensei checks for updates on launch and notifies you when a new version is available. You stay in control: updates only install when you say so.',
  },
  {
    q: 'How does the Meeting Battery Guard timeout work?',
    a: 'Opt-in. Sensei looks at the next few events on your calendar and predicts whether your current battery will survive each meeting given typical drain. When a meeting is at risk, it fires up to four notifications: 30, 15, and 5 minutes before the meeting starts, and one final nudge at start time. Each notification includes the exact minute the laptop is predicted to die ("dies 17 min into standup") and a plug-in remedy ("22 min on the charger and you\'re clear through"). Event titles never leave your Mac — Sensei reads the calendar locally via EventKit. If a meeting is no longer at risk (you plugged in, or the meeting ended), pending reminders are cancelled silently.',
  },
]

/**
 * Convert an FAQ item to the stable accordion value used in
 * `<AccordionItem value=...>`. Items tagged with `id` use `id-<id>`
 * (e.g. `id-refund`), others fall back to `item-<index>`. The leading
 * `id-` namespace lets the hash-handler below distinguish "user
 * deep-linked to a tagged item" from "an internal anchor collision".
 */
function valueFor(item: FaqItem, index: number): string {
  return item.id ? `id-${item.id}` : `item-${index}`
}

/**
 * Read the current URL hash and turn it into an accordion value, if it
 * targets a tagged FAQ. Supported anchor shapes:
 *   #faq-refund   ← preferred, human-friendly
 *   #refund       ← also accepted as a shortcut
 *   #id-refund    ← the raw accordion value (for completeness)
 * Returns `null` when the hash doesn't address a tagged FAQ; that's
 * the cue to leave the accordion fully collapsed.
 */
function valueFromHash(items: ReadonlyArray<FaqItem>): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#/, '').toLowerCase()
  if (!raw) return null
  for (const it of items) {
    if (!it.id) continue
    if (
      raw === `faq-${it.id}` ||
      raw === it.id ||
      raw === `id-${it.id}`
    ) {
      return `id-${it.id}`
    }
  }
  return null
}

export function FAQ() {
  const { t } = useTranslation()
  const items = t('faq.items', { returnObjects: true }) as Array<FaqItem>
  // Open-item state. Empty string means "all collapsed". We sync it to
  // the URL hash on mount + on hash changes so deep-links like
  // `/#faq-refund` from the legal page or footer expand the right row.
  const [openValue, setOpenValue] = useState<string>('')

  useEffect(() => {
    const next = valueFromHash(items)
    if (next) setOpenValue(next)
    const onHash = () => {
      const v = valueFromHash(items)
      if (v) setOpenValue(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
    // The items array comes back from i18n.t — stable identity per
    // render is fine here; we only need to re-read on hash change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section id="faq" className="zen-section mx-auto max-w-3xl px-6">
      <div className="mb-12 flex flex-col items-center text-center">
        <Hanko kanji="問" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">{t('faq.kicker')}</Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="section-heading text-sumi"
        >
          {t('faq.heading')}
        </Reveal>
      </div>
      <Reveal delay={260}>
        <Accordion
          type="single"
          collapsible
          value={openValue}
          onValueChange={setOpenValue}
          className="paper-card divide-y divide-[var(--line)]"
        >
          {items.map((item, i) => {
            const value = valueFor(item, i)
            // Stable DOM anchor for tagged items only. `faq-refund` is
            // the URL slug we link to from /legal, the footer trust
            // line, and the checkout trust badge — keep it lowercase
            // and locale-independent.
            const anchorId = item.id ? `faq-${item.id}` : undefined
            return (
              <AccordionItem
                key={value}
                value={value}
                id={anchorId}
                className="border-0 scroll-mt-24 px-6"
              >
                <AccordionTrigger className="display-title text-left text-sumi text-[1.0625rem] font-medium hover:no-underline py-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sumi-soft leading-[1.65] pb-5 text-[0.9375rem]">
                  {item.a}
                  {item.id === 'refund' && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
                      <a
                        href={REFUND_MAILTO}
                        className="btn-sumi inline-flex h-10 items-center gap-2 rounded-md px-4 text-[0.8125rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
                      >
                        <Mail className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                        {t('legal.body.withdrawal.refundCta')}
                      </a>
                      <span className="text-[0.8125rem] text-sumi-soft">
                        {t('legal.body.withdrawal.refundCtaHint')}
                      </span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </Reveal>
    </section>
  )
}
