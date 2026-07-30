import { P, H2, UL, A } from './_components'

export const extended = (
  <>
    <H2>The three presets in detail</H2>
    <P>
      Sensei ships with three escalation moods. Each is built around a real
      use case, so pick the one whose stakes match yours.
    </P>
    <UL>
      <li>
        <strong>Zen Mode.</strong> Whispers at 15% (auto-dismisses in 5
        seconds) and once more at 5% (10 seconds). Designed for the
        "finishing a sentence, will plug in shortly" case. No red, no
        urgency, no interruption.
      </li>
      <li>
        <strong>Regular Mode.</strong> The default. A standard card at
        15%, a red overlay at 5%, and a persistent alert at 2%. The middle
        of the curve: visible enough to notice during heavy focus, gentle
        enough not to feel hostile.
      </li>
      <li>
        <strong>Teach Me Senpai.</strong> Stern. A red overlay at 15%
        (stays until dismissed) and a full-screen flasher at 5%. For
        people who routinely miss the milder cues, or for the
        slide-presenting day where running flat costs a deck.
      </li>
    </UL>

    <H2>Why three, not one</H2>
    <P>
      macOS gives you exactly one battery notification, at 10%. That
      timing is reasonable for an average user on an average day, and
      wrong for almost every specific situation. A presenter wants to
      know at 25% so they can plug in between slides. A long-haul flier
      needs the 5% alert to be unmissable. A focused writer wants the
      gentle nudge that doesn’t break flow.
    </P>
    <P>
      Three presets cover the everyday shapes; if none of them quite
      fits, <A to="/features/custom-thresholds">custom thresholds</A>{' '}
      (Pro) lets you compose your own: per-tier percent and per-tier
      dismiss time.
    </P>

    <H2>Switching presets</H2>
    <P>
      One click in the menu bar, or under Settings → Alerts. Changes
      apply immediately. The current preset is the one Sensei uses for
      every day except trip days: when{' '}
      <A to="/features/travel-mode">Travel Mode</A> is active, Sensei
      swaps in stricter trip thresholds for the duration and restores
      your selected preset at the 9 AM auto-reset.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Can I have different presets for plugged-in vs. on battery?',
    a:
      'Alert presets fire only when running on battery. On the adapter there is nothing for them to catch: the tiers are thresholds on a falling charge, and plugged in the charge is climbing back through them. If you want a "currently using the adapter" indicator, that lives in the menu bar live readout, not the alerts system.',
  },
  {
    q: "Why does Senpai keep flashing until I click?",
    a:
      'Because the only way to guarantee you noticed is to refuse to be ignored. Senpai is the preset to pick when missing the warning costs more than the inconvenience of dismissing one.',
  },
]
