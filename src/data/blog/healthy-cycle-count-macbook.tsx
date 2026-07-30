import { P, H2, Pull, UL, OL, G, A, Apple } from './_components'
import type { BlogPost } from './types'

export const post: BlogPost = {
  slug: 'healthy-cycle-count-macbook',
  title: "MacBook battery cycle count: what's healthy at every age",
  description:
    'Modern MacBooks are rated for 1,000 cycles. Here is what normal looks like at one year, two years, and four years, plus when "Service Recommended" actually means it.',
  publishedAt: '2026-05-28',
  readingMinutes: 9,
  tags: ['cycle count', 'battery health', 'macOS', 'MacBook'],
  body: () => (
    <>
      <P>
        You just opened System Settings, clicked the ⓘ next to Battery Health,
        and saw a number. Now you’re wondering if that number is good, bad, or
        somewhere in the middle. The honest answer is{' '}
        <strong>it depends on the age of the Mac, and on the capacity
        number sitting right next to it</strong>.{' '}
        Cycle count in isolation tells you very little. This guide walks
        through what one cycle actually is, what your specific MacBook is
        rated for, and what counts as normal at twelve months, two years, and
        four years of use.
      </P>

      <H2>What a cycle actually is</H2>
      <P>
        One{' '}
        <G slug="cycle-count">battery cycle</G> equals one full equivalent
        discharge of your battery’s usable capacity. The keyword is{' '}
        <em>equivalent</em>: a cycle is cumulative, not event-based. Using 50%
        of capacity twice (say, draining to 50% on Monday, charging back up,
        then draining to 50% again on Tuesday) counts as one cycle, not two.
        Apple’s firmware tracks this in fractional increments and rounds when
        it ticks over an integer.
      </P>
      <P>
        Two consequences worth internalizing:
      </P>
      <UL>
        <li>
          <strong>Plugging in does not add cycles.</strong> Cycles count
          drained capacity, not connection events. You can plug and unplug
          twenty times in a day with the battery sitting between 70 and 75%
          the whole time, and your count stays put.
        </li>
        <li>
          <strong>Cycles never reset.</strong> The counter is monotonic. It’s
          designed to be a wear-meter for the cell, not a battery-life
          estimate.
        </li>
      </UL>

      <H2>Your MacBook’s rated limit</H2>
      <P>
        Apple publishes a table of cycle-count limits by model. The headline:
      </P>
      <UL>
        <li>
          <strong>All Apple Silicon (M1, M2, M3, M4) MacBooks: 1,000 cycles.</strong>{' '}
          A normal battery is designed to retain up to 80% of its original
          capacity at that mark.
        </li>
        <li>
          <strong>2018-2019 Intel MacBooks (T2 chip): 1,000 cycles.</strong>
        </li>
        <li>
          <strong>2010-2017 Intel MacBooks: 1,000 for most.</strong> The
          notable exceptions are a few MacBook Air units (13" Mid 2010 and
          Late 2017) rated at 500.
        </li>
        <li>
          <strong>Pre-2010 Macs: 300 cycles.</strong> If you’re still running
          one of these, the rated limit is the least of your concerns.
        </li>
      </UL>
      <P>
        The authoritative list lives on{' '}
        <Apple id="102888">
          Apple’s “Determine battery cycle count for Mac laptops” page
        </Apple>
        . Hitting the limit doesn’t kill the Mac; it’s an engineering target,
        not a death date. Many cells comfortably keep going past 1,000 cycles.
        They just sit at lower maximum capacity.
      </P>

      <H2>What “normal” looks like at your age</H2>
      <P>
        The honest expected-cycles number depends on how much you actually use
        the laptop, but a workable rule of thumb is{' '}
        <strong>30-40 cycles per month of regular use</strong>. Plug that into
        the calendar:
      </P>
      <UL>
        <li>
          <strong>12 months in:</strong> roughly 350-450 cycles is normal.{' '}
          <G slug="battery-health">Battery health</G> usually around 92-97%.
        </li>
        <li>
          <strong>24 months in:</strong> 700-900 cycles. Capacity around
          88-93%. If you’re a heavy user, this is also where you’ll first see
          the “Maximum Capacity” number start to wobble down by a noticeable
          step year-over-year.
        </li>
        <li>
          <strong>36 months in:</strong> 1,000-1,300 cycles. Many MacBooks
          quietly cross the rated limit here. Capacity should be in the
          80-88% range; if it’s dropped below 80%, macOS will show{' '}
          <strong>Service Recommended</strong>.
        </li>
        <li>
          <strong>48 months in:</strong> 1,300+ cycles. The cells are well
          past their design target. Capacity below 80% is now expected, not
          unusual.
        </li>
      </UL>
      <Pull>
        High cycle count with high capacity is fine. Low cycle count with low
        capacity is the warning sign.
      </Pull>
      <P>
        Low-cycle/low-capacity is unusual and almost always means the battery
        has been stewed at 100% on a hot desk for years. Cells age{' '}
        <em>chemically</em> even when they’re not being cycled, and a cell
        stored hot at full charge loses capacity faster than one cycled
        regularly in cooler conditions. The fix isn’t to “use it more.”
        It’s to set a charge limit so future months don’t compound the
        damage.
      </P>

      <H2>How to check it on an Apple Silicon Mac</H2>
      <OL>
        <li>Open System Settings.</li>
        <li>Click <strong>Battery</strong> in the sidebar.</li>
        <li>
          Click the small <strong>ⓘ</strong> button next to{' '}
          <strong>Battery Health</strong>. The cycle count appears next to
          “Maximum Capacity.”
        </li>
      </OL>
      <P>
        From the Terminal:{' '}
        <code className="rounded bg-washi-soft px-1.5 py-0.5 font-mono text-[0.875rem]">
          system_profiler SPPowerDataType | grep "Cycle Count"
        </code>
        . Sensei surfaces the same number live in the menu bar so you don’t
        have to dig, and pairs it with a{' '}
        <A to="/features/battery-journal">history view</A> so you can see how
        fast it’s climbing.
      </P>

      <H2>When to replace the battery</H2>
      <P>
        The honest answer is <strong>when capacity stops working for you</strong>,
        not when the cycle counter crosses 1,000. Most MacBooks at 80%
        capacity still run several hours unplugged; if your day still fits in
        that window, there’s no urgency. macOS surfaces a{' '}
        <Apple id="108376">“Service Recommended” status</Apple>{' '}
        when capacity drops below the design target, but the laptop continues
        to work perfectly safely.
      </P>
      <P>
        Two scenarios where replacement makes sense:
      </P>
      <UL>
        <li>
          <strong>You can no longer make it through a working day.</strong>{' '}
          Capacity below ~70% on a Mac you depend on portable is the practical
          tipping point.
        </li>
        <li>
          <strong>You see swelling or rapid voltage drop under load.</strong>{' '}
          The trackpad pushed up by a bulging cell or a charge level that
          collapses 30% the moment a CPU-heavy app launches are both signs the
          cell is failing, not just worn.
        </li>
      </UL>
      <P>
        If you bought AppleCare and the Mac is still under coverage,{' '}
        <Apple id="108376">Apple replaces the battery at no charge</Apple>{' '}
        when it’s below 80% of original capacity. After AppleCare, the
        Apple-quoted price is in the $129-$199 range depending on model.
      </P>

      <H2>Slowing the count without sabotaging your day</H2>
      <P>
        Here’s the subtle part: capping the charge at 80% does not directly
        slow the cycle counter. Cycles are full-capacity equivalents, and
        whether the cell discharges from 100% to 30% or from 80% to 10%, the
        math comes out to the same 0.7 cycles. What a charge limit changes is{' '}
        <em>voltage stress per cycle</em>, which keeps capacity above the
        Service Recommended threshold for more cycles total. The cycle
        counter still ticks up, but the {' '}
        <G slug="battery-health">battery health</G> percentage drops more
        slowly.
      </P>
      <P>
        Concretely: pair an 80% daily cap with{' '}
        <A to="/features/travel-mode">Travel Mode</A> for the rare day you
        actually need 100% of the battery. The combination tends to push the
        Service Recommended notice out by 12-18 months on a typical MacBook,
        which is the only number that matters in the end.
      </P>
      <P>
        For the wider picture on whether to plug in at all, see{' '}
        <A to="/guides/should-i-keep-macbook-plugged-in">
          should I keep my MacBook plugged in?
        </A>{' '}
        And for the related (and routinely misunderstood) feature Apple
        ships,{' '}
        <A to="/guides/optimized-battery-charging-explained">
          Optimized Battery Charging, explained
        </A>
        .
      </P>
    </>
  ),
  faqs: [
    {
      q: 'Is 500 cycles a lot for a 2-year-old MacBook?',
      a:
        'No, it’s slightly above the typical average and entirely normal. If your battery health is also healthy (88-94% range), you’re in the middle of the curve. The cycle counter rises with use; what matters is whether the capacity is dropping at a reasonable rate.',
    },
    {
      q: 'Why is my cycle count and my capacity moving at different speeds?',
      a:
        'Because they measure different things. Cycle count is a usage tally; capacity is a wear measurement. Two batteries with identical cycles can have very different capacities depending on how hot they ran and how much time they spent near 100% charge.',
    },
    {
      q: 'Can I reset the cycle count?',
      a:
        'No. The counter lives in battery firmware and is monotonic. It only resets when the battery itself is replaced (a service event swaps in a new cell, which starts at 0).',
    },
    {
      q: 'Does sleeping the Mac add cycles?',
      a:
        'Practically no. Sleep draws so little power that the cumulative discharge over an entire weekend of sleep is a tiny fraction of one cycle. Standby mode on Apple Silicon is especially miserly.',
    },
    {
      q: 'My Mac says "Service Recommended". Is it dangerous to keep using it?',
      a:
        'No. "Service Recommended" means capacity is below the design target, not that the cell is unsafe. The exception is visible swelling or rapid voltage collapse under load: those warrant immediate replacement.',
    },
  ],
}
