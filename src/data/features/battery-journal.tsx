import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>What the Saga page actually shows</H2>
    <P>
      Five panels, in order:
    </P>
    <UL>
      <li>
        <strong>Charge history chart.</strong> Flip between the last 24 hours,
        3 days, or 7 days (free tier); Premium extends both windows to
        unlimited history. Each charge and discharge is a line; the chart
        annotates rescues (you plugged in within 30 minutes of a critical
        warning) and plateaus (long stretches at the same percent).
      </li>
      <li>
        <strong>Battery Health tiles.</strong> The four numbers worth
        knowing: maximum capacity (your{' '}
        <G slug="battery-health">battery health</G> percentage),{' '}
        <G slug="cycle-count">cycle count</G>, current cell temperature, and
        the condition string macOS reports (Normal or Service Recommended).
      </li>
      <li>
        <strong>Top power-hungry apps.</strong> The same metric Activity
        Monitor uses, surfaced live right now or over the last 3 hours or 5
        days — as a percentage or in watts. A search filter lets you collapse
        a noisy process tree — type "chrome" and every Chrome helper lines up.
      </li>
      <li>
        <strong>Weekly + Monthly Wrapped.</strong> Spotify-Wrapped-style
        recaps of how your battery did this week and this month. Cycles
        added, average daily depth-of-discharge, hottest day, longest
        unplugged stretch. Shareable as a small card.
      </li>
      <li>
        <strong>Rescue Receipts.</strong> When you plug in within 30 minutes
        of Sensei’s critical warning, the app stitches a small "save" card
        with the timing, the apps that were draining you, and the wattage
        in. A quiet record of the close calls.
      </li>
    </UL>

    <H2>Why a battery needs a story</H2>
    <P>
      A capacity number — "92%" — tells you almost nothing without context.
      Is that good for a Mac your age? Did it just drop from 95% in two
      weeks, or has it been holding steady? Which weeks cost you the most
      capacity, and what were you doing then?
    </P>
    <P>
      Saga makes those questions answerable in seconds. The chart shows the
      shape of the curve; the Wrapped recaps surface the patterns; the
      power-hungry apps panel turns "battery died fast today" into a name
      you can point at. Battery health stops being a vague feeling and
      starts being a thing you can{' '}
      <A to="/blog/healthy-cycle-count-macbook">compare against the norm</A>
      .
    </P>

    <H2>Privacy: nothing leaves your Mac</H2>
    <P>
      Every panel above reads from local sources — IOKit for charge state,
      Apple’s power assertions API for per-app energy impact, the battery’s
      own firmware counters for cycles and capacity. There’s no telemetry,
      no cloud sync, no account. The Wrapped recaps you share are images
      you create and choose to send; Sensei doesn’t see them.
    </P>
    <P>
      The shape of Saga only makes sense if the data stays on-device,
      because the chart is yours — your worst week, your nearest miss, the
      hot Saturday that cost you 2% capacity. None of that should live
      anywhere else.
    </P>

    <H2>Where to start reading</H2>
    <P>
      Three useful entry points if you’re new to the page:
    </P>
    <UL>
      <li>
        Open the 7-day chart and look at the depth of each daily discharge.
        A healthy pattern looks like shallow troughs (you didn’t drain
        below 30% most days). Deep troughs mean you’re cycling the battery
        hard — see the{' '}
        <A to="/glossary/charge-cycle">charge cycle</A> entry for why that
        matters.
      </li>
      <li>
        Read the cycle count and battery health together. The two move
        differently, and seeing them side-by-side is the fastest way to
        tell whether your laptop is aging on schedule or ahead of it.
      </li>
      <li>
        Skim the Weekly Wrapped on a quiet Sunday. The "hottest day" and
        "longest unplugged stretch" lines are usually where you’ll find
        the actionable insight.
      </li>
    </UL>
  </>
)

export const faqs = [
  {
    q: 'Does Saga work on Intel MacBooks?',
    a:
      'Yes. The panels read from APIs available on every Mac with a T2 chip or Apple Silicon (2018 and later). Pre-T2 Intel Macs are not supported because the battery telemetry surface is different.',
  },
  {
    q: 'Can I export the chart data?',
    a:
      "Premium adds an export to CSV (charge history + cycle/capacity time series). The free tier keeps the data on-screen but doesn't expose a file export.",
  },
  {
    q: 'How far back does the history go?',
    a:
      'Free tier: 24 hours / 3 days / 7 days. Premium: unlimited, going back to whenever you first installed Sensei. The cycle count and capacity are always lifetime values, regardless of tier.',
  },
]
