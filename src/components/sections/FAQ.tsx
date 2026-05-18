import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'

const items = [
  {
    q: 'Which Macs and macOS versions does Battery Sensei support?',
    a: 'macOS 13 Ventura, Sonoma, Sequoia, and later — on both Apple Silicon (M1/M2/M3/M4) and Intel MacBooks.',
  },
  {
    q: 'Is Battery Sensei free?',
    a: 'Yes — free and notarized by Apple. Download the .dmg directly from this site. No accounts, no subscription.',
  },
  {
    q: 'How does the charge limit and Travel Mode work?',
    a: 'Sensei caps your MacBook at a charge level you choose (default 80%) to extend battery life. One click switches to Travel Mode — Sensei tops the battery up to 100% before a trip, then returns to your normal limit afterward.',
  },
  {
    q: 'Does Battery Sensei send my data anywhere?',
    a: 'No. Battery Sensei is privacy-first — it runs entirely on your Mac. No telemetry, no analytics, no cloud account. Your personal battery history stays local; nothing leaves your machine unless you explicitly share it.',
  },
  {
    q: "How is this different from macOS's built-in battery menu?",
    a: "macOS shows you a percentage. Battery Sensei tells you a story — cycles, capacity, thermal state, charging power, and what it all means. Plus customizable low-battery warnings, charge limits, Travel Mode, and a personal battery history.",
  },
  {
    q: 'How do I update Battery Sensei?',
    a: 'Sensei checks for updates on launch and notifies you when a new version is available. You stay in control — updates only install when you say so.',
  },
]

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
