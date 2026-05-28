import { P, H2, Pull, UL, OL, G, A, Apple } from './_components'
import type { BlogPost } from './types'

export const post: BlogPost = {
  slug: 'optimized-battery-charging-explained',
  title: 'Optimized Battery Charging on Mac, explained — and where it falls short',
  description:
    "Apple's OBC uses on-device ML to delay charging past 80%. Here's how it actually works, where it falls short, and what to do about the gaps.",
  publishedAt: '2026-05-28',
  readingMinutes: 9,
  tags: ['optimized battery charging', 'macOS', 'charge limit', 'MacBook'],
  body: () => (
    <>
      <P>
        <strong>Optimized Battery Charging</strong> (OBC) is Apple’s automatic
        battery-saving feature on every Mac with a T2 chip or Apple Silicon.
        It’s on by default. It uses on-device machine learning to delay
        charging past 80% when it predicts your Mac will stay plugged in for a
        while. It works — sometimes — and it’s invisible enough that most
        people never realize when it kicks in. This is the longer guide: how
        OBC actually works, the situations where it doesn’t, and what to do
        about the gaps.
      </P>

      <H2>The 30-second version</H2>
      <P>
        When you plug in a MacBook with OBC enabled, the system charges fast
        to 80%, then{' '}
        <strong>holds</strong>. If the on-device ML model has learned that
        you’re likely to leave the laptop plugged in for a while — overnight,
        say — it delays the final 20% of charge until shortly before it
        predicts you’ll need it. The hold reduces the time the battery spends
        at high voltage, which is the single biggest contributor to
        accelerated chemical aging.
      </P>
      <Pull>
        Fast to 80%. Hold. Top up only when you’re about to need it.
      </Pull>

      <H2>How OBC actually works</H2>
      <P>
        Apple’s implementation has three moving parts. None of them are
        documented in detail — the source isn’t public — but the behavior is
        consistent and{' '}
        <Apple id="102338">
          Apple’s own support page describes the high-level mechanism
        </Apple>{' '}
        clearly enough to follow.
      </P>
      <OL>
        <li>
          <strong>The two-stage charge curve.</strong> The charge controller
          ramps fast from whatever depleted state up to 80%, then stops. From
          there, charging is gated by the ML model.
        </li>
        <li>
          <strong>On-device prediction.</strong> A small ML model watches
          plug-in time, unplug time, location, and recent battery use. After
          about <strong>14 days</strong> of observation it starts predicting
          when you’ll unplug, and times the last 20% of charging to finish
          shortly before that.
        </li>
        <li>
          <strong>Visible state.</strong> When OBC is holding, the battery
          icon shows{' '}
          <strong>“Charging On Hold”</strong> with a small Apple Intelligence
          mark in newer macOS versions. The override is one click —{' '}
          <strong>“Charge to Full Now.”</strong>
        </li>
      </OL>
      <P>
        The ML model is per-Mac and stays local; Apple is explicit that
        nothing leaves the device. That means it doesn’t carry over to a new
        MacBook — you wait out the 14 days again — and a serious schedule
        change resets it, slowly.
      </P>

      <H2>OBC versus Charge Limit (Sequoia 15+)</H2>
      <P>
        Easy to confuse: <strong>Charge Limit</strong> is a separate feature
        Apple added in macOS Sequoia 15. It’s a manual hard cap (80, 90, 95,
        or 100%) that you set explicitly. The two are designed to compose:
      </P>
      <UL>
        <li>
          <strong>Charge Limit</strong> sets a ceiling. Charging stops at the
          cap, full stop.
        </li>
        <li>
          <strong>OBC</strong> opportunistically defers <em>within</em> that
          ceiling. If your cap is 100% and your routine is predictable, OBC
          can still pause at 80% until shortly before unplug.
        </li>
        <li>
          Both can be active at once. Most users only encounter one of them
          and assume it’s the whole story.
        </li>
      </UL>
      <P>
        Practical advice: leave OBC on, and add a Charge Limit on top if you
        want the predictability OBC alone can’t guarantee. The hard cap is
        for people; the ML is the bonus.
      </P>

      <H2>Where OBC falls short</H2>
      <P>
        OBC was designed around a specific user: someone who plugs in at the
        same time, in the same place, every day. The world is wider than
        that, and four limits show up reliably.
      </P>
      <UL>
        <li>
          <strong>It demands a predictable routine.</strong> If your sleep,
          work, or travel schedule varies week-to-week, the model averages
          your behavior and ends up being cautious — usually defaulting to
          charging straight through to 100% because it can’t predict what
          you’ll do next.
        </li>
        <li>
          <strong>It’s invisible.</strong> You can’t tell whether OBC has
          activated until “Charging On Hold” appears. For the first 14 days
          on a new Mac, it’s silently learning, which is exactly when most
          people decide it’s broken.
        </li>
        <li>
          <strong>It can’t read your calendar.</strong> Flying tomorrow? OBC
          doesn’t know. It’ll be holding at 80% on the morning of your trip,
          and you’ll either notice in time or you won’t.
        </li>
        <li>
          <strong>It’s an average, not a setting.</strong> No per-day
          customization, no easy override for “just this week.” The ML wants
          to learn slowly; users want to change behavior quickly.
        </li>
      </UL>
      <P>
        None of these are deal-breakers — they’re honest design trade-offs.
        OBC trades manual control for invisibility. That’s good for most
        people most of the time, and bad for everyone occasionally.
      </P>

      <H2>The third option: a manual cap plus a trip-day toggle</H2>
      <P>
        The combination that handles all four limits cleanly is{' '}
        <strong>a manual cap</strong> for the daily routine,{' '}
        <strong>a one-tap trip mode</strong> for known exceptions, and{' '}
        <strong>OBC left on</strong> to handle the rest. macOS Sequoia
        provides the first piece. Sensei’s{' '}
        <A to="/features/travel-mode">Travel Mode</A> provides the second:
        one tap lifts the cap to 100%, pauses OBC, switches to stricter
        low-battery alerts for the trip, and reinstates everything at 9 AM
        the next morning so the cap doesn’t silently linger lifted for a
        week.
      </P>
      <P>
        If you live by per-tier alert thresholds — “warn me at 22% with a 14
        second dismiss, alert at 6% until I acknowledge it” — Sensei’s{' '}
        <A to="/features/custom-thresholds">custom thresholds</A> let you set
        them. macOS gives you a single 10% warning by default, which arrives
        well after the moment you actually wanted to know.
      </P>

      <H2>Troubleshooting: why is my Mac stuck at 80%?</H2>
      <P>
        Three things, in roughly the order to check them:
      </P>
      <OL>
        <li>
          <strong>OBC is actively deferring.</strong> Click the battery icon
          in the menu bar. If you see “Charging On Hold,” select{' '}
          <strong>Charge to Full Now</strong>. The hold is intentional; this
          override is the documented way to skip it.
        </li>
        <li>
          <strong>Charge Limit is set.</strong> System Settings → Battery →
          Battery Health. If Charge Limit is on, the slider shows where the
          cap is. Toggle it off, or raise the cap.
        </li>
        <li>
          <strong>Thermal pause.</strong> If your MacBook is hot — running
          sustained CPU, sitting in the sun, on a soft surface — the charge
          controller stops charging until the cell cools. The menu bar can
          show “Not Charging” with the adapter plugged in. See{' '}
          <G slug="thermal-throttling">thermal throttling</G> for what to
          look for.
        </li>
      </OL>
      <P>
        A fourth, rarer case: a failing battery that reports its state badly.
        If your Mac is showing <strong>Service Recommended</strong> and refuses
        to charge above 80% even after disabling Charge Limit and overriding
        OBC, that’s the cell, not the software.
      </P>

      <H2>Should you turn OBC off?</H2>
      <P>
        Almost certainly no. Two reasons. First, the worst OBC can do is
        charge your Mac the way it would have charged with OBC off — there’s
        no failure mode where it makes things worse. Second, even when it’s
        not actively deferring, having it on means a learning model is in
        place for the day it{' '}
        <em>is</em> useful. Leave it on. Add a manual cap on top. Use a tool
        for trip days. That’s the full answer.
      </P>
      <P>
        Related reading:{' '}
        <A to="/blog/should-i-keep-macbook-plugged-in">
          should I keep my MacBook plugged in
        </A>{' '}
        for the broader question of when plugged-in is fine, and{' '}
        <A to="/blog/healthy-cycle-count-macbook">
          what’s a healthy MacBook cycle count
        </A>{' '}
        for the metric that actually matters in the end.
      </P>
    </>
  ),
  faqs: [
    {
      q: 'Does OBC work if my schedule changes a lot?',
      a:
        'Partially. The ML model retrains slowly, so a single off-day doesn’t hurt — but several weeks of irregular use will keep OBC cautious and you won’t see it activate often. A manual Charge Limit is better for unpredictable schedules.',
    },
    {
      q: 'Should I turn off Optimized Battery Charging?',
      a:
        'No. There’s no scenario where leaving OBC on is actively worse than turning it off. If you want the visible manual cap that OBC lacks, set Charge Limit in macOS Sequoia (or a third-party tool) on top of OBC — they compose.',
    },
    {
      q: 'Does Optimized Battery Charging work on Intel MacBooks?',
      a:
        'Yes, on any Mac with the T2 chip — that’s every 2018-or-later Intel MacBook. Pre-T2 Intel Macs don’t support OBC.',
    },
    {
      q: 'Why is OBC not working on my new Mac?',
      a:
        'It needs about 14 days of routine usage before activating. The first time you’ll see “Charging On Hold” is usually in week three. Until then, it’s silently learning.',
    },
    {
      q: 'Does OBC override my Charge Limit?',
      a:
        'No. Charge Limit is the ceiling; OBC defers within that ceiling. If you set Charge Limit to 80%, OBC can’t lift it.',
    },
  ],
}
