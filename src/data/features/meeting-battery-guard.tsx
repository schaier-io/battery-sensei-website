import { P, H2, UL, A } from './_components'

export const extended = (
  <>
    <H2>The four severity levels</H2>
    <P>
      Sensei reads the next 4 hours of calendar events through EventKit
      (on-device; calendar data never leaves the Mac) and scores each
      meeting against your current battery + observed drain rate. The
      four levels:
    </P>
    <UL>
      <li>
        <strong>Comfortable.</strong> Battery will easily outlast the
        meeting. Sensei stays silent.
      </li>
      <li>
        <strong>Tight.</strong> Cutting it close but probably fine. One
        nudge 30 minutes before so you can decide.
      </li>
      <li>
        <strong>Critical.</strong> The laptop will likely die before the
        meeting ends. Warnings fire at 30, 15, 5, and 1 minute before
        the meeting, each one showing the exact minute the laptop is
        projected to die and a concrete remedy: "22 minutes on the
        charger and it lasts through the meeting."
      </li>
      <li>
        <strong>Catastrophic.</strong> The meeting starts before the
        battery would last. Warned immediately, with the time-to-death
        and the plug-in minutes-needed.
      </li>
    </UL>

    <H2>Plug-in cancels pending warnings</H2>
    <P>
      Once you plug in, Sensei recomputes the projection. If the new
      runtime estimate clears the meeting comfortably, queued warnings
      cancel themselves silently. You don’t get a "never mind"; the
      warnings just stop. The goal is to nudge you when there’s still
      time to fix the problem, not to keep nagging once the problem is
      solved.
    </P>

    <H2>Privacy by default</H2>
    <P>
      Calendar event titles are readable in the warning by default so
      you can tell which meeting is at risk. One toggle in Settings →
      Meeting Guard redacts the titles, so the warning becomes
      "Next meeting" instead of "Quarterly review with Sarah." The data
      itself never leaves your Mac either way; the toggle only affects
      whether the notification text includes the title.
    </P>
    <P>
      Meeting Guard is Premium. It’s included in the free trial
      and unlocks with a Lifetime license. The 4-hour lookahead is the
      default; the value can be lowered if you prefer shorter horizons,
      but lower values lose the early-Catastrophic warning. For tighter
      everyday timing, pair this with{' '}
      <A to="/features/custom-thresholds">custom thresholds</A>.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Does Meeting Guard work with Google Calendar / Outlook?',
    a:
      'Yes. Anything that publishes events to macOS Calendar (EventKit) works. That includes Google Calendar via the Mac’s Internet Accounts pane, Outlook via Exchange, iCloud Calendar, and local calendars. Sensei reads the union of all enabled accounts.',
  },
  {
    q: 'Is the calendar data sent anywhere?',
    a:
      'No. EventKit access is on-device. Sensei never sees the events outside the process, and the process has no network connection for telemetry of any kind.',
  },
]
