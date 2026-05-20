import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

/**
 * Shared FAQ data — also consumed by the FAQPage JSON-LD schema in
 * src/routes/__root.tsx so the answers can earn rich results.
 */
export const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Which Macs and macOS versions does Battery Sensei support?',
    a: 'macOS 13 Ventura, Sonoma, Sequoia, and later, on both Apple Silicon (M1/M2/M3/M4) and Intel MacBooks.',
  },
  {
    q: 'Is Battery Sensei free?',
    a: 'Yes. Battery Sensei is free and notarized by Apple. Download the .dmg directly from this site. No accounts, no subscription, no in-app purchases.',
  },
  {
    q: 'How does the charge limit and Travel Mode work?',
    a: 'Sensei caps your MacBook at a charge level you choose (default 85 percent) to extend battery life. One click switches to Travel Mode and Sensei tops the battery up to 100 percent before a trip, then returns to your normal limit when you are home.',
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
    a: 'Yes. Sensei covers AlDente\'s core charge-limit feature for free, adds smart warnings and a personal battery history, and ships as a single notarized .dmg with no account. A detailed side-by-side comparison lives at battery-sensei.app/vs-aldente.',
  },
  {
    q: 'How do I update Battery Sensei?',
    a: 'Sensei checks for updates on launch and notifies you when a new version is available. You stay in control: updates only install when you say so.',
  },
]

const items = FAQ_ITEMS

export function FAQ() {
  return (
    <section id="faq" className="zen-section mx-auto max-w-3xl px-6">
      <div className="mb-12 flex flex-col items-center text-center">
        <Hanko kanji="問" className="mb-5" />
        <Reveal as="p" delay={120} className="kicker-row mb-4">Questions · 問答</Reveal>
        <Reveal
          as="h2"
          delay={200}
          className="display-title text-3xl font-semibold text-sumi md:text-4xl"
        >
          Answered calmly.
        </Reveal>
      </div>
      <Reveal delay={260}>
      <Accordion type="single" collapsible className="paper-card divide-y divide-[var(--line)]">
        {items.map(({ q, a }, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-0 px-6">
            <AccordionTrigger className="text-left text-sumi font-medium hover:no-underline py-5">
              {q}
            </AccordionTrigger>
            <AccordionContent className="text-sumi-soft leading-relaxed pb-5">
              {a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      </Reveal>
    </section>
  )
}
