import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>What the automation actually does</H2>
    <P>
      macOS ships Low Power Mode as a manual switch in System Settings. It
      throttles peak CPU and GPU clocks, lowers the display refresh rate on
      ProMotion Macs, dims the backlight slightly, and pauses some background
      work, typically buying 20–30% more runtime at the cost of a little
      responsiveness. The catch is that the switch is manual, buried three
      panes deep, and easy to forget in both directions: you turn it on during
      a crisis and leave it on for a week.
    </P>
    <P>
      Battery Sensei turns it into a rule. You pick a trigger, either a
      percentage (say 20%) or an estimated time remaining (say 45 minutes),
      and Sensei flips Low Power Mode on when you cross it. When you plug in again, it
      flips back off. That's the whole feature: no dashboards to check, no
      decision to make at 18%.
    </P>

    <H2>Why it needs an admin approval</H2>
    <P>
      Changing the Low Power Mode setting is a privileged operation on macOS,
      the same class of change as setting a charge limit. Battery Sensei ships
      a small helper (a <code>SMAppService</code> daemon) that performs exactly
      that one write, and macOS asks you to approve it once. Nothing else in
      the app needs those rights, and the helper does nothing else.
    </P>
    <P>
      If you decline the approval, the rest of Battery Sensei keeps working;
      only the automatic toggle is unavailable. The card tells you which state
      you're in rather than failing silently.
    </P>

    <H2>Choosing a trigger</H2>
    <UL>
      <li>
        <strong>Percentage triggers</strong> are predictable and easy to reason
        about. 20% is a sensible default: enough runtime left that the
        throttling has something to stretch, low enough that you're not giving
        up performance during a normal day.
      </li>
      <li>
        <strong>Time-remaining triggers</strong> track what you're actually
        doing. A 45-minute trigger fires early during a heavy export and late
        while you're reading; the same rule adapts to the workload, including
        the stretches where <G slug="thermal-throttling">thermal throttling</G>{' '}
        is already eating into your runtime.
      </li>
    </UL>
    <P>
      Pair it with <A to="/features/alert-presets">warning presets</A> if you
      want a nudge before the automation acts, or with{' '}
      <A to="/features/meeting-battery-guard">Meeting Guard</A> so a calendar
      conflict escalates before the battery gets that low in the first place.
    </P>

    <H2>What it doesn't do</H2>
    <P>
      Sensei doesn't invent its own throttling. It toggles Apple's own setting,
      which means the behavior is exactly what macOS documents and nothing is
      layered on top of it. No kernel extensions, no CPU pinning, no
      background daemons beyond the one privileged helper described above.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Does Low Power Mode automation work on Intel MacBooks?',
    a:
      'Low Power Mode itself requires macOS 12 or later, and is available on both Intel and Apple Silicon Macs that support the setting. Battery Sensei toggles whatever the system exposes; if your Mac has no Low Power Mode setting, the card explains that instead of offering the automation.',
  },
  {
    q: 'Why does Battery Sensei need an admin password for this?',
    a:
      'Writing the Low Power Mode setting is a privileged operation. Battery Sensei installs a small helper that does only that one write, approved once through macOS. Declining leaves the rest of the app fully functional.',
  },
  {
    q: 'Does it turn Low Power Mode back off automatically?',
    a:
      'Yes. Once you plug in, Sensei restores the previous state, so you never discover a week later that your Mac has been throttled the whole time.',
  },
  {
    q: 'Can I still toggle Low Power Mode myself?',
    a:
      'Always. The System Settings switch and the menu-bar quick action both keep working; the automation just handles the times you would have forgotten.',
  },
  {
    q: 'How much battery life does Low Power Mode actually save?',
    a:
      "Apple doesn't publish a single figure because it depends entirely on the workload. In practice, sustained-load sessions (video export, compiles, many Chrome tabs) see the biggest gains; light reading sees almost none, because there was little peak clock to give up.",
  },
] as const
