import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>Three numbers that explain everything</H2>
    <P>
      Battery questions usually reduce to one of three readings, and macOS
      exposes none of them in a place you'd find. Power flow puts all three in
      a single panel:
    </P>
    <UL>
      <li>
        <strong>Adapter in.</strong> What your charger is actually delivering
        right now, next to its rated wattage. A 96 W brick delivering 38 W is
        the answer to "why is this charging so slowly", usually a cable, a
        hub, or a port that negotiated down.
      </li>
      <li>
        <strong>System draw.</strong> What the Mac itself consumes. On
        battery, this <em>is</em> your discharge rate, which makes it the
        most honest predictor of runtime you can look at.
      </li>
      <li>
        <strong>Charging.</strong> The share reaching the cells. During
        heavy work this can be near zero even while plugged in: the system
        is eating everything the adapter sends.
      </li>
    </UL>

    <H2>Reading the panel</H2>
    <P>
      The rows run top to bottom: adapter, system, charging. When adapter in
      exceeds system draw, the surplus reaches the cells and the bottom row
      shows the charging wattage with its arrow pointing up. When system draw
      exceeds the adapter, the battery <em>supplements</em> the charger:
      you're on wall power and still losing charge, which the panel labels
      explicitly instead of leaving you to work it out from a shrinking
      percentage.
    </P>
    <P>
      Unplugged, the adapter row disappears and system draw becomes the whole
      story. Pair it with the{' '}
      <A to="/features/energy-usage">app energy panel</A> to attach a name to
      a spike, and see <G slug="watts-in-out">watts in / watts out</G> for the
      underlying terminology.
    </P>

    <H2>Where the numbers come from</H2>
    <P>
      IOKit's power telemetry, read directly from the SMC on Apple Silicon,
      the same source Apple's own tooling uses. No estimation, no sampling
      heuristics, no network calls. When a reading isn't available on your
      hardware, the row hides rather than showing an invented number.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Why does my 96 W charger only deliver 60 W?',
    a:
      'Charging wattage is negotiated between the Mac, the cable, and the adapter. A cable rated below 100 W, a hub in the middle, or a nearly full battery all cap the delivered wattage. Power flow shows the negotiated figure next to the rated one so the gap is visible.',
  },
  {
    q: 'Can the battery drain while plugged in?',
    a:
      'Yes. Under sustained heavy load the system can draw more than the adapter supplies, and the battery covers the shortfall. Power flow labels that state explicitly rather than leaving you to infer it.',
  },
  {
    q: 'Does this work on Intel Macs?',
    a:
      "Partly. Apple Silicon exposes full power telemetry; Intel Macs report a smaller subset, so some rows may be unavailable. Sensei hides what it can't read instead of guessing.",
  },
] as const
