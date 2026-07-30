import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>The three numbers worth watching</H2>
    <UL>
      <li>
        <strong>Maximum capacity.</strong> What the pack holds today against
        what it held new. See <G slug="battery-health">battery health</G> for
        how the percentage is derived and why it moves in steps rather than
        smoothly.
      </li>
      <li>
        <strong>Cycle count.</strong> Full equivalent discharges, not plug-in
        events: two half-discharges count as one. Modern Apple Silicon packs
        are rated around 1000 cycles; see{' '}
        <G slug="cycle-count">cycle count</G>.
      </li>
      <li>
        <strong>Condition.</strong> The verdict macOS itself publishes:
        Normal, or Service Recommended. Sensei surfaces it verbatim rather
        than inventing a competing score.
      </li>
    </UL>

    <H2>Read it as a trend, not a score</H2>
    <P>
      Capacity readings are noisy day to day. They depend on temperature,
      recent cycles, and when the controller last recalibrated. A single 1%
      drop means nothing; the shape over months means everything. That's why
      the panel sits alongside{' '}
      <A to="/features/battery-journal">the charge history</A> rather than as
      an isolated number.
    </P>

    <H2>What actually moves it</H2>
    <P>
      Heat, time spent at very high or very low charge, and cycle count, in
      roughly that order. Most of what you can control lives in{' '}
      <A to="/features/charge-limit">the charge limit</A> and in avoiding
      long, hot, fully-charged sessions on a desk.
    </P>
  </>
)

export const faqs = [
  {
    q: "What's a normal capacity after two years?",
    a:
      'Most Macs land somewhere between 85% and 92% after two years of daily use. Below 80% is where macOS starts recommending service.',
  },
  {
    q: 'Why did my capacity jump back up?',
    a:
      'The battery controller recalibrates periodically, and readings before a recalibration can understate the pack. A jump of a point or two is normal; a steady slide is the signal.',
  },
  {
    q: 'Does Battery Sensei read the battery differently from macOS?',
    a:
      'No. It reads the same firmware counters through IOKit and presents them without adjustment, including the condition string, verbatim.',
  },
] as const
