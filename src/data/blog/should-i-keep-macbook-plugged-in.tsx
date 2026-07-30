import { P, H2, Pull, UL, G, A, Apple } from './_components'
import type { BlogPost } from './types'

export const post: BlogPost = {
  slug: 'should-i-keep-macbook-plugged-in',
  title: 'Should I keep my MacBook plugged in all the time?',
  description:
    'What actually happens to a MacBook battery when it lives at 100%, plus the three macOS settings that change the answer. Plain English, Apple sources cited.',
  publishedAt: '2026-05-28',
  readingMinutes: 8,
  tags: ['battery health', 'charging', 'macOS', 'optimized battery charging'],
  body: () => (
    <>
      <P>
        Short answer:{' '}
        <strong>not all the time, but the consequences are smaller than the
        internet thinks.</strong>{' '}
        A MacBook that lives plugged in at 100% will age faster than one that
        spends most of its life between 40 and 80%, but the difference is
        measured in months over years, not days, and not in dramatic failure.
        Three things actually move the needle: how much time the cells spend at
        a high state of charge, how hot the laptop runs, and how often you let
        it sit unused at either extreme. Below, what each of those does, what
        Apple itself does about it, and how to set up your Mac so you stop
        thinking about it.
      </P>

      <H2>The two things that age a Mac battery</H2>
      <P>
        Modern MacBooks use lithium-ion cells, and lithium-ion has two enemies
        that compound. Heat is the simple one. The industry consensus, drawn
        from research at the US National Renewable Energy Laboratory and
        battery-chemistry handbooks, is that every roughly 10°C of sustained
        temperature increase{' '}
        <strong>cuts a cell’s expected lifespan in half</strong>. A MacBook on
        a desk runs noticeably cooler than one charging on a duvet, in direct
        sunlight, or with sustained 100% CPU load. Plugging in always adds heat.
        The charge controller is just one more thing converting energy to
        warmth.
      </P>
      <P>
        The less obvious factor is voltage. A lithium-ion cell held at a high
        state of charge (above about 80%) sits at a higher voltage than one at
        50%, and that elevated voltage oxidizes the cathode. Slowly, but
        irreversibly. Apple acknowledges this directly: in its support note on
        battery health, the company writes that{' '}
        <Apple id="102589">
          a battery’s lifespan depends on its chemical age, which results from
          a complex combination of factors, including temperature history and
          charging pattern
        </Apple>
        . Translation: how long you’ve kept it hot, and how long you’ve kept
        it full.
      </P>
      <Pull>
        Cycles aren’t the enemy. Heat and time at high voltage are.
      </Pull>

      <H2>What Apple actually does about it</H2>
      <P>
        Apple ships two complementary features that try to keep your MacBook
        out of the high-voltage zone unnecessarily. They’re separate, and the
        difference matters.{' '}
        <G slug="optimized-battery-charging">Optimized Battery Charging</G>{' '}
        (OBC) is the on-device machine-learning feature that watches your
        charging routine and, once it’s confident it knows when you’ll unplug,
        starts delaying the last 20% of charge until shortly before you’d need
        a full battery. When OBC is actively holding charge, the menu bar
        shows{' '}
        <strong>Charging On Hold</strong>; you can override it with{' '}
        <strong>Charge to Full Now</strong>.
      </P>
      <P>
        <strong>Charge Limit</strong> (added in macOS Sequoia 15) is the second
        piece: a manual cap at 80, 90, 95, or 100%. Unlike OBC, it’s explicit
        and immediate. You set it; it sticks. The two compose nicely (Charge
        Limit acts as the ceiling, OBC opportunistically defers within that
        ceiling), but most users only ever encounter one and assume that’s the
        whole story. See{' '}
        <Apple id="102338">
          Apple’s own page on Optimized Battery Charging and Charge Limit
        </Apple>{' '}
        for the official picture.
      </P>
      <P>
        OBC works well when your life is predictable. The ML model needs about
        14 days of routine data before it activates, and it relies on you
        unplugging at roughly the same time each day. If your schedule is
        chaotic, OBC stays cautious and you never get the benefit. That’s the
        biggest single reason people swear it “doesn’t work.”
      </P>

      <H2>The 80% rule, demystified</H2>
      <P>
        Cycle-life curves for lithium-ion are well documented, and the shape
        is consistent across manufacturers: capacity loss accelerates sharply
        above about 80% state of charge. Rough numbers from independent
        cycling tests, summarized in plain terms:
      </P>
      <UL>
        <li>
          <strong>Daily 100% charge cycles:</strong> capacity reaches 80% of
          design somewhere between 300 and 500 cycles.
        </li>
        <li>
          <strong>Daily 90% cap:</strong> closer to 600 cycles before hitting
          80% capacity.
        </li>
        <li>
          <strong>Daily 80% cap:</strong> roughly 1,500 cycles, the figure
          most often quoted as the sweet spot.
        </li>
        <li>
          <strong>Daily 70% cap:</strong> ~2,400 cycles, but you’re giving up
          meaningful runtime for marginal extra lifespan.
        </li>
      </UL>
      <P>
        These are rough orders of magnitude, not promises. Your actual mileage
        depends heavily on temperature. But the takeaway is consistent: 80% is
        a clean break-even between “lasts a lot longer” and “gives up too much
        runtime to be worth it.” Apple’s own Charge Limit defaults to 80% for
        exactly this reason.
      </P>

      <H2>When plugged-in is fine, when it isn’t</H2>
      <P>
        Three rough profiles:
      </P>
      <UL>
        <li>
          <strong>The desktop user.</strong> You almost never unplug. The Mac
          lives on your desk, the trip to the café is rare. Set a hard{' '}
          <strong>Charge Limit at 80%</strong> and forget about it. OBC is
          unnecessary here; there’s no “unplug time” for it to learn.
        </li>
        <li>
          <strong>The daily commuter.</strong> You unplug once or twice a day,
          on a roughly predictable schedule. Either approach works: Apple’s
          OBC will learn your pattern and defer past 80% on its own, or a
          manual 80% cap with{' '}
          <A to="/features/travel-mode">Travel Mode</A> for trips will give you
          more visible control.
        </li>
        <li>
          <strong>The traveler.</strong> Your routine shifts every week. OBC
          struggles here because the ML model is averaging over a moving
          target. A manual cap plus a one-tap “full charge tonight, normal cap
          tomorrow” setting is the right shape. That’s what Sensei’s Travel
          Mode does.
        </li>
      </UL>
      <P>
        One specific edge case: if you’re storing the MacBook unused for more
        than a couple of weeks, charge it to roughly 50% first. A cell stored
        at 100% loses capacity measurably faster than one stored half-full, in
        the same way a coiled spring loses tension faster than one at rest. A
        cell stored at 0% loses capacity faster still; lithium-ion does not
        like deep discharge.
      </P>

      <H2>What to actually do, in three steps</H2>
      <P>
        On any MacBook running macOS Sequoia 15 or later, the path is short:
      </P>
      <UL>
        <li>
          <strong>System Settings → Battery → Battery Health → Charge Limit.</strong>{' '}
          Set it to 80% if you mostly stay at your desk, 90% if you want
          some runtime cushion.
        </li>
        <li>
          <strong>Leave Optimized Battery Charging on.</strong> Even with a
          manual cap, OBC will continue to defer the last few percent toward
          when you actually need them.
        </li>
        <li>
          <strong>Use a tool for trip days.</strong> Manually toggling the cap
          back to 100% the night before a flight, then remembering to put it
          back when you get home, is exactly the kind of thing humans forget.{' '}
          <A to="/features/travel-mode">Sensei’s Travel Mode</A> does the
          toggle and the auto-reset at 9 AM the next morning, so the cap comes
          back on its own.
        </li>
      </UL>
      <P>
        That’s the whole answer. The rest is folklore.
      </P>

      <H2>One more thing: cycle counts aren’t the metric you think</H2>
      <P>
        “Cycle count” is the number that gets stared at, but it’s downstream of
        the real question, which is{' '}
        <G slug="battery-health">battery health</G>: how much capacity is
        left. A two-year-old MacBook with 1,200 cycles at 88% capacity is in
        better shape than one with 400 cycles at 78%, because the latter has
        been stewed at 100% on a hot desk. For more on that distinction, see{' '}
        <A to="/guides/healthy-cycle-count-macbook">
          what’s a healthy MacBook battery cycle count
        </A>
        . If OBC remains mysterious to you, the longer guide is{' '}
        <A to="/guides/optimized-battery-charging-explained">
          Optimized Battery Charging, explained
        </A>
        .
      </P>
    </>
  ),
  faqs: [
    {
      q: 'Is it bad to leave my MacBook plugged in overnight?',
      a:
        "Not if you have a charge limit set. macOS Sequoia’s 80% Charge Limit (or a third-party tool that does the same) means the battery isn’t actually being held at 100% overnight. It’s held at your cap. If you have no cap and you do this every night for months, you’ll see capacity drop faster than necessary.",
    },
    {
      q: 'Does fast charging damage the battery more?',
      a:
        'Slightly, mostly through extra heat. Apple’s included adapters are tuned to a charging rate the cells are designed for. A higher-wattage adapter doesn’t harm the battery directly (the MacBook only pulls what it negotiates), but a hot room plus heavy CPU load plus fast charging is the worst-case combination for cell aging.',
    },
    {
      q: 'Should I drain the battery to 0% sometimes to "exercise" it?',
      a:
        'No. Lithium-ion is not nickel-cadmium. Full discharges actively shorten lifespan, and Apple Silicon MacBooks calibrate the gauge automatically. There’s nothing to “exercise.” If a guide tells you to drain to 0% periodically, the guide is outdated.',
    },
    {
      q: 'My MacBook is stuck at 80%. Is something broken?',
      a:
        'Almost certainly not. Either Optimized Battery Charging is actively deferring the last 20% (the menu bar will say “Charging On Hold”; click and choose “Charge to Full Now” to override) or you’ve set Charge Limit to 80% (Settings → Battery → Battery Health). The third possibility is thermal: a too-hot MacBook pauses charging until it cools down.',
    },
  ],
}
