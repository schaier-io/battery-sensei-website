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
    q: 'How much does Battery Sensei cost?',
    a: 'Sensei Premium is $3.99 once. One payment, lifetime license, every future Premium feature, every Mac you own. Try it free for 5 days first — no card needed to start, no nag when the trial ends. After the trial the core essentials (charge limit, smart alerts, 30-day history) stay free forever; Premium unlocks Meeting Battery Guard, unlimited Saga history, and custom warning presets. For context: AlDente Pro is about $24 every year. Sensei is $3.99 once, ever. Checkout shows the equivalent in your local currency.',
  },
  {
    q: 'How does the license key work?',
    a: 'After checkout via Lemon Squeezy you get a license key by email. Open Sensei → Settings → Premium and paste the key. Sensei activates it against the Lemon Squeezy API and stores the result locally; no account, no login. The key works on every Mac you own.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes. Email within 14 days of purchase and we refund, no questions asked. Lemon Squeezy handles the payment so the refund hits the original card.',
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
    a: 'Yes. Sensei covers AlDente\'s core charge-limit feature in every tier, adds smart warnings and a personal battery history, and ships as a single notarized .dmg. Premium adds Meeting Battery Guard and unlimited Saga history for a $3.99 one-time payment vs. AlDente Pro\'s subscription. A detailed side-by-side comparison lives at battery-sensei.app/vs-aldente.',
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
          className="section-heading text-sumi"
        >
          Answered calmly.
        </Reveal>
      </div>
      <Reveal delay={260}>
      <Accordion type="single" collapsible className="paper-card divide-y divide-[var(--line)]">
        {items.map(({ q, a }, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-0 px-6">
            <AccordionTrigger className="display-title text-left text-sumi text-[1.0625rem] font-medium hover:no-underline py-5">
              {q}
            </AccordionTrigger>
            <AccordionContent className="text-sumi-soft leading-[1.65] pb-5 text-[0.9375rem]">
              {a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      </Reveal>
    </section>
  )
}
