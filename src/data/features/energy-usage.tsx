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
      Sensei pulls this score every 5 minutes from per-process resource
      usage — no system extension, no kernel hooks, no privileged
      operations. The numbers are exactly what Activity Monitor would
      show if you opened it at the same moment, just gathered
      continuously so you can see trends.
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
    q: 'Why sampled every 5 minutes and not every second?',
    a:
      'Activity Monitor’s energy impact metric is a moving average. Sampling per second wouldn’t show different values — it would just spend battery to measure battery. Every 5 minutes is enough resolution to spot trends without the irony.',
  },
  {
    q: 'Does this require a system extension or root privileges?',
    a:
      'No. Sensei reads per-process resource usage through standard, sandboxed APIs. No kernel hooks, no special permissions, no privileged operations.',
  },
]
