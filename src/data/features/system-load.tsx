import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>Why load belongs next to battery</H2>
    <P>
      Battery drain is downstream of work. A Mac at 4% CPU and a Mac at 85%
      CPU are different machines in runtime terms, and the difference is
      usually one process you forgot about. System load puts the four
      readings that matter (CPU, GPU, memory pressure, disk I/O) beside
      the battery numbers rather than in a separate app.
    </P>

    <H2>What each reading tells you</H2>
    <UL>
      <li>
        <strong>CPU.</strong> The single best predictor of discharge rate. A
        single runaway thread pinning one core shows up here long before the
        battery percentage reacts.
      </li>
      <li>
        <strong>GPU.</strong> Often the real culprit on Apple Silicon: video
        calls, WebGL, and hardware-accelerated scrolling all land here rather
        than on the CPU.
      </li>
      <li>
        <strong>Memory pressure.</strong> High pressure means compression and
        swap, and swap means disk writes, an indirect but real battery cost.
      </li>
      <li>
        <strong>Disk I/O.</strong> Sustained writes are the signature of a
        backup, a sync client, or a Spotlight reindex quietly running.
      </li>
    </UL>

    <H2>Load, then blame</H2>
    <P>
      System load tells you <em>that</em> something is working the machine;
      the <A to="/features/energy-usage">app energy panel</A> tells you{' '}
      <em>what</em>. Together they turn “my battery died fast today” into a
      process name you can quit. If the load is sustained and thermal, see{' '}
      <G slug="thermal-throttling">thermal throttling</G> for what the Mac
      does about it.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Isn’t this just Activity Monitor?',
    a:
      'The readings come from the same system sources, but they sit beside your battery numbers instead of in a separate window, and Sensei keeps a short history so you can see whether a spike is new or constant.',
  },
  {
    q: 'Does sampling this drain the battery?',
    a:
      'The sampler is deliberately light: a periodic read of counters the OS already maintains, with no polling loop tighter than the app’s own refresh tick.',
  },
  {
    q: 'What is memory pressure, exactly?',
    a:
      'It’s macOS’s own measure of how hard the memory subsystem is working: closer to “how much compressing and swapping is happening” than to “how much RAM is used”. High pressure costs battery; high usage alone doesn’t.',
  },
] as const
