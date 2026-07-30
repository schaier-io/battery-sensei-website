import { P, H2, UL, DL, DI, G, A, Apple } from './_components'

export const extended = (
  <>
    <H2>How Travel Mode composes with macOS</H2>
    <P>
      Apple’s own charge-protection features (
      <G slug="optimized-battery-charging">Optimized Battery Charging</G> and
      Charge Limit, macOS Sequoia 15+) work well for predictable routines.
      They fall apart in one place: the day before a trip. The ML in OBC has
      no way to know you’re flying tomorrow, and a manual Charge Limit set to
      80% will stop charging right where you need a full battery most.
    </P>
    <P>
      Travel Mode is the bridge. One tap and Sensei:
    </P>
    <UL>
      <li>Lifts your charge cap to 100% for the trip window.</li>
      <li>Pauses macOS Optimized Battery Charging so it doesn’t fight you.</li>
      <li>
        Switches the low-battery thresholds to the stricter Travel preset:
        30 / 15 / 5%, instead of the everyday preset that may not warn until
        10 or 5%.
      </li>
      <li>
        Schedules an automatic restore for 9 AM the next morning, local time.
        Your normal cap returns, OBC unpauses, and the everyday alert preset
        comes back.
      </li>
    </UL>

    <H2>Why the 9 AM auto-reset, not “detect arrival”</H2>
    <P>
      A common feature request: “restore the cap when I get home.” It sounds
      simpler, but detecting “home” reliably means watching Wi-Fi networks,
      location, or charger identifiers. All three fail in the obvious cases
      (hotel Wi-Fi the same SSID as home, a coffee-shop layover, a
      different charger on the trip). The 9 AM reset is dumber, more
      predictable, and impossible to spoof: even if you forget, the cap
      restores itself the next morning. If you stay away longer, you re-tap
      Travel Mode each evening; the friction is exactly the right amount.
    </P>

    <H2>What the stricter alerts look like</H2>
    <P>
      The Travel preset fires earlier and louder than your everyday config:
    </P>
    <DL>
      <DI term="30%">
        Info card, 6-second dismiss. The first nudge. Enough runtime to find
        a power outlet without rushing.
      </DI>
      <DI term="15%">
        Warning, 12-second dismiss. By now your seat neighbor’s charger is
        the next move.
      </DI>
      <DI term="5%">
        Alert, persistent until acknowledged. The plane will land before this
        matters, but Sensei makes sure you notice.
      </DI>
    </DL>
    <P>
      The trade-off is one extra notification on a normal day. The reverse
      trade (silence until 10% on a plane) is a much worse deal. If you
      want a different cadence (say, 35 / 20 / 8), the{' '}
      <A to="/features/custom-thresholds">custom thresholds</A> feature lets
      you build it.
    </P>

    <H2>A note on heat</H2>
    <P>
      Travel Mode lifts the cap; it doesn’t change the cell chemistry. The
      day you charged to 100% and immediately drove the laptop in a hot car
      to the airport is the worst-case combination for{' '}
      <G slug="thermal-throttling">thermal stress</G> on lithium-ion. If you
      can charge to 100% the morning of the trip rather than the night
      before, do. Every hour spent at 100% in a hot bag is an hour of
      accelerated chemical aging.
    </P>
    <P>
      For the deeper question of when plugged-in is fine, see{' '}
      <A to="/guides/should-i-keep-macbook-plugged-in">
        should I keep my MacBook plugged in?
      </A>{' '}
      For the macOS side of the charge story,{' '}
      <A to="/guides/optimized-battery-charging-explained">
        Optimized Battery Charging, explained
      </A>{' '}
      covers what Apple ships and where it stops being enough, including
      what the OBC override <Apple id="102338">Apple documents</Apple> does
      and doesn’t do.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Will Travel Mode override Apple’s Optimized Battery Charging?',
    a:
      'Yes. While Travel Mode is active, Sensei pauses OBC for the trip window so it doesn’t second-guess your need for a full charge. The 9 AM auto-reset re-enables OBC alongside restoring your normal cap.',
  },
  {
    q: 'What if my flight is later in the day?',
    a:
      'Travel Mode keeps the cap lifted until 9 AM local time the morning after you enable it. If your flight is at noon, you can re-enable Travel Mode in the morning to keep the cap raised through the trip, or just leave the 80% cap and rely on stricter alerts plus the partial charge.',
  },
  {
    q: 'Does Travel Mode work without an internet connection?',
    a:
      'Yes. Sensei is fully on-device: no network is needed to lift the cap, fire the stricter alerts, or auto-reset. The 9 AM reset uses your Mac’s local clock, not a server.',
  },
  {
    q: 'Can I extend Travel Mode for a multi-day trip?',
    a:
      'Re-tap Travel Mode each evening before sleep; the cap stays at 100% through the next morning. Most travelers prefer this rhythm over a multi-day mode because it forces a daily check-in: “am I still on the trip?”',
  },
]
