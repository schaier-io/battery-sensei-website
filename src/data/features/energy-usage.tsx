import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>How the energy impact score works</H2>
    <P>
      Activity Monitor calculates an energy impact score per process — a
      composite of CPU time, idle wake-ups, and a few less-public metrics
      that influence how much battery a process is actually costing you.
      It’s the same number macOS uses to flag "apps that draw significant
      energy" in the battery menu, except surfaced live and rankable.
    </P>
    <P>
      Sensei pulls this score from per-process resource usage — no system
      extension, no kernel hooks, no privileged operations. The live{' '}
      <strong>Now</strong> view refreshes about every 10 seconds (smoothed
      over the last ~30 seconds) while you’re watching it, so the watts you
      see track what’s happening right now; the 3h and 5d windows lean on a
      5-minute history. The numbers are exactly what Activity Monitor would
      show if you opened it at the same moment, just gathered continuously
      so you can see trends.
    </P>
    <P>
      Each row shows the share of a full battery the app spent, or — one
      toggle away — an estimate in watts (live draw on <strong>Now</strong>)
      or watt-hours (energy consumed over the 3h / 5d windows). Same data,
      the unit that fits the question.
    </P>

    <H2>What to look for</H2>
    <UL>
      <li>
        <strong>Background tabs.</strong> Browsers are the single biggest
        category — and within them, a small handful of tabs usually
        dominate. Search "chrome" or "safari" and watch every helper
        process line up.
      </li>
      <li>
        <strong>Hung helpers.</strong> An app whose energy score keeps
        climbing while you’re not using it is the classic signal of a
        stuck process. Often it’s an analytics or update helper.
      </li>
      <li>
        <strong>Video calls that won’t let go.</strong> Hanging up doesn’t
        always release the GPU. If your battery drains 20% faster after a
        meeting than during, the meeting app is still holding context.
      </li>
    </UL>

    <H2>Cross-references</H2>
    <P>
      When energy impact spikes, the per-cell{' '}
      <G slug="thermal-throttling">thermal state</G> usually follows
      within a few minutes. The two readouts are paired in the menu bar
      so you can connect cause and effect — see the live{' '}
      <G slug="watts-in-out">watts in / out</G> number for the cleaner
      version of "how fast is the battery going."
    </P>
    <P>
      For the deeper question of whether plugged-in or unplugged is
      better in the first place, see{' '}
      <A to="/blog/should-i-keep-macbook-plugged-in">
        should I keep my MacBook plugged in?
      </A>
    </P>
  </>
)

export const faqs = [
  {
    q: 'How often does it refresh?',
    a:
      'The live "Now" view resamples about every 10 seconds — smoothed over the last ~30 seconds — and only while that view is open, so you get a current read without spending battery to measure battery. The 3h and 5d history windows are sampled every 5 minutes; Activity Monitor’s energy impact is already a moving average, so finer history wouldn’t show more, just cost more.',
  },
  {
    q: 'Does this require a system extension or root privileges?',
    a:
      'No. Sensei reads per-process resource usage through standard, sandboxed APIs. No kernel hooks, no special permissions, no privileged operations.',
  },
]
