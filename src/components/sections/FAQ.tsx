import { useEffect, useState, type ReactNode } from 'react'
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
import { TRIAL_DAYS } from '#/lib/polar'
import { useLifetimePrice } from '#/lib/use-price'

/** Pre-filled refund mailto. Identical body to the /legal `Request a
 *  refund` CTA so both surfaces produce the same support thread shape. */
const REFUND_MAILTO =
  'mailto:info@battery-sensei.app?subject=Refund%20request%20%E2%80%94%20Battery%20Sensei' +
  '&body=Hi%2C%0A%0AI%27d%20like%20to%20request%20a%20refund%20for%20my%20Battery%20Sensei%20purchase.%0A%0A' +
  'Polar%20order%20id%20%28if%20handy%29%3A%20%0AReason%20%28optional%29%3A%20%0A%0A' +
  'Please%20note%3A%20I%20am%20sending%20this%20from%20the%20email%20I%20used%20at%20checkout.%0A%0AThanks%2C'

/**
 * One FAQ item. `a` is an ARRAY of paragraphs (not a single blob): each
 * entry renders as its own `<p>` with breathing room between, so the
 * answer scans like prose, not a wall.
 *
 * Inline emphasis uses Markdown-style `**bold**` markers — the
 * renderer below converts them to `<strong>` with a sumi tint so the
 * key claim of each answer anchors the eye.
 *
 * The optional `id` is a stable locale-independent identifier used
 * for deep-linking (`#faq-refund`) and as the accordion's internal
 * `value` so order changes don't break links.
 */
type FaqItem = { id?: string; q: string; a: ReadonlyArray<string> }
const LICENSE_SCOPE_LIFETIME = 'Lifetime unlock: up to 3 Macs you own.'
const LICENSE_SCOPE_YEARLY = 'Yearly Patron: up to 5 Macs while subscribed.'

/**
 * Static EN copy of the FAQ. Mirrors `faq.items` in en.json — both
 * must stay in sync because:
 *   - `<FAQ>` renders the locale-aware version via `t('faq.items', …)`
 *   - `src/routes/__root.tsx` consumes THIS array for the SSR FAQPage
 *     JSON-LD schema. The JSON-LD runs server-side before i18n
 *     hydrates, so it can't go through `t()`. A static EN copy is
 *     the simplest way to keep rich-result snippets in sync with the
 *     on-page copy.
 *
 * Canonical values are baked in here ($3.99 lifetime, 5-day trial)
 * so search engines see a fully-resolved answer. The locale strings
 * use `{{price}}` / `{{trial}}` placeholders that the renderer
 * interpolates at runtime. If the canonical price changes, update
 * BOTH en.json AND this array.
 */
export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
  {
    q: 'Which Macs are supported?',
    a: [
      '**macOS 13 Ventura or later.** Sonoma, Sequoia, and whatever ships next.',
      'Every Apple Silicon Mac. Intel MacBooks too.',
    ],
  },
  {
    q: 'How much does Battery Sensei cost?',
    a: [
      `**$3.99 once, lifetime license.** ${LICENSE_SCOPE_LIFETIME} No subscription.`,
      'Free for 5 days first. No card, no account.',
      'When the trial ends, Sensei asks once at launch. Skip the purchase and the core stays free forever: charge limit, Travel Mode, smart alerts, 24-hour history, per-app drain, live menu-bar watts.',
      'Premium adds Meeting Battery Guard, unlimited history, and custom warning rules. Checkout shows your local currency.',
    ],
  },
  {
    q: 'How does the license key work?',
    a: [
      'After checkout, your key arrives by email.',
      'Open Sensei → Settings → Premium and paste it in. Activates against Polar, stores locally.',
      `**No account. No login.** ${LICENSE_SCOPE_LIFETIME} ${LICENSE_SCOPE_YEARLY}`,
    ],
  },
  {
    id: 'refund',
    q: 'Can I get a refund?',
    a: [
      '**Yes. 14 days, no questions asked.**',
      'Email us and the refund goes back to the original card. Polar handles the payment.',
    ],
  },
  {
    q: 'How does the charge limit work?',
    a: [
      'Sensei stops the charge at the level you pick. Default is **80%**: cooler battery, longer life.',
      'Travel Mode is one click. Sensei tops up to 100% **at full speed**, with no macOS slow-down on the last 20%.',
      'Returns to your limit when you are home.',
    ],
  },
  {
    q: 'Does Sensei send my data anywhere?',
    a: [
      '**No. Nothing leaves your Mac.**',
      'No telemetry. No analytics. No cloud account. Your battery history stays on this machine.',
    ],
  },
  {
    q: 'How is Battery Sensei different from the macOS battery menu?',
    a: [
      'macOS shows you a percentage. **Sensei reads the rest.**',
      'Smart low-battery alerts at thresholds you choose. A charge limit with Travel Mode. Live charging watts. Cycle and capacity over time.',
      'Plus a calm, plain-English history of how your battery is aging.',
    ],
  },
  {
    q: 'How much battery does Sensei itself use?',
    a: [
      '**Less than 1%.**',
      'Native AppKit and SwiftUI. No background polling. Sensei samples only when macOS reports a change.',
    ],
  },
  {
    q: 'Is Battery Sensei an AlDente alternative?',
    a: [
      "**Yes.** Sensei covers AlDente's charge limit in every tier, plus smart warnings and a battery history.",
      'Ships as one notarized .pkg installer. Premium adds Meeting Battery Guard, unlimited history, and custom warning rules. One payment, lifetime.',
      'Side-by-side comparison lives in the Compare section above.',
    ],
  },
  {
    q: 'How do I update Battery Sensei?',
    a: [
      'Sensei checks for updates on launch.',
      'A new build shows up as a quiet notice. **You install when you say so.** No silent pushes, no nag screens.',
    ],
  },
  {
    q: 'How does Meeting Battery Guard work?',
    a: [
      'Opt-in Premium feature. Sensei reads your calendar locally and predicts which meetings your battery might not survive.',
      'When a meeting is at risk, you get up to four nudges: **30, 15, and 5 minutes before** start, plus one at the start time.',
      'Each nudge names the exact minute the laptop is predicted to die ("dies 17 min into standup") and the plug-in time that clears it ("22 min on the charger and you\'re through").',
      'Event titles never leave your Mac. Sensei reads the calendar locally via EventKit. If the risk passes, pending reminders cancel silently.',
    ],
  },
]

/**
 * Convert an FAQ item to the stable accordion value used in
 * `<AccordionItem value=...>`. Items tagged with `id` use `id-<id>`
 * (e.g. `id-refund`); others fall back to `item-<index>`. The leading
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

/**
 * Replace `{{name}}` tokens in `text` with the matching entry from
 * `vars`. Missing names pass through unchanged (`{{name}}`) so a
 * surfaced placeholder loud-fails in dev instead of silently producing
 * empty copy. `t()` does this for top-level keys, but here we're
 * iterating string entries pulled out via `returnObjects: true`, which
 * skips interpolation — so we do it ourselves.
 */
function interpolate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    key in vars ? String(vars[key]) : `{{${key}}}`,
  )
}

/**
 * Split a paragraph on `**bold**` markers and wrap matched spans in
 * `<strong>`. Used by `FaqAnswer` so authored Markdown-style emphasis
 * survives both i18n round-trips and the SSR JSON-LD strip (the
 * schema serializer just removes `**` and keeps the text). Returns a
 * flat React node list rather than HTML, so no `dangerouslySetInnerHTML`.
 */
function renderInline(text: string): ReactNode[] {
  // Greedy `[^*]+` is fine because authored markers never nest. If we
  // ever want italics too, switch to a small finite-state tokenizer.
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-medium text-sumi">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/**
 * Render one FAQ answer as a column of paragraphs with breathing room
 * between. First paragraph is the lede (carries the bold anchor in
 * most answers); subsequent paragraphs are detail. Uniform size across
 * all paragraphs — the visual hierarchy comes from emphasis + spacing,
 * not type scale, which keeps the calm zen rhythm.
 */
function FaqAnswer({
  paragraphs,
  vars,
}: {
  paragraphs: ReadonlyArray<string>
  vars: Record<string, string | number>
}) {
  return (
    <div className="space-y-3">
      {paragraphs.map((raw, i) => (
        <p key={i} className="leading-[1.65]">
          {renderInline(interpolate(raw, vars))}
        </p>
      ))}
    </div>
  )
}

export function FAQ() {
  const { t } = useTranslation()
  // The two runtime values the cost / pricing answers interpolate.
  // Pulled here (not at module load) because price is locale-aware
  // via `useLifetimePrice` and `i18n.language` changes can re-render.
  const lifetime = useLifetimePrice()
  const items = t('faq.items', { returnObjects: true }) as Array<FaqItem>
  const vars = {
    price: lifetime.discounted.formatted,
    trial: TRIAL_DAYS,
    lifetimeScope: t('licenseScope.lifetime'),
    yearlyScope: t('licenseScope.yearly'),
  }
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
    // The items array comes back from i18n.t with a stable identity per
    // render; we only need to re-read on hash change.
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
            // line, and the checkout trust badge: keep it lowercase
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
                <AccordionContent className="text-sumi-soft pb-5 text-[0.9375rem]">
                  <FaqAnswer paragraphs={item.a} vars={vars} />
                  {item.id === 'refund' && (
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
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
