import { P, H2, DL, DI, G, A } from './_components'

export const extended = (
  <>
    <H2>The three escalation tiers</H2>
    <P>
      Sensei’s alert system has three levels, each with its own percent and
      its own dismiss time. The defaults are useful starting points, not
      rules:
    </P>
    <DL>
      <DI term="Info">
        A quiet card, auto-dismisses on a short timer (default 5–6 seconds).
        The first nudge that you’re heading toward a lower state of charge.
      </DI>
      <DI term="Warning">
        A more visible card with a longer dismiss timer (default 10–12
        seconds), or in some presets a red overlay. The “okay, find a charger
        now” moment.
      </DI>
      <DI term="Alert">
        Persistent until you acknowledge it. Reserved for when battery is
        genuinely low (5% or below by default). On the Senpai preset, the
        alert is a full-screen flasher.
      </DI>
    </DL>
    <P>
      With custom thresholds, you set <em>three percentages</em> and{' '}
      <em>three dismiss times</em>. The defaults of the built-in presets
      become starting points you can edit, not the only options.
    </P>

    <H2>Why one global warning fails</H2>
    <P>
      macOS gives you a single low-battery warning at 10%. The 10% number
      was chosen as a reasonable average, and it’s wrong for almost
      everyone. On a flight, 10% arrives 20 minutes before the laptop
      dies, which is enough time to save your work but not enough time to
      find a power source. In back-to-back meetings, 10% is way too late;
      you wanted to know at 25% so you could plug in between calls.
    </P>
    <P>
      Per-tier thresholds let the warning match the stakes. Set a 25%
      Info card with a 4-second dismiss to be reminded politely, a 12%
      Warning with a longer dismiss for the “do something” moment, and a
      4% Alert that won’t go away. The shape of the day decides the
      numbers, not Apple’s designers.
    </P>

    <H2>Setting the thresholds</H2>
    <P>
      Open Sensei → <strong>Settings → Alerts → Custom</strong>. Each tier
      has two sliders (the trigger percent and the dismiss duration),
      plus a live preview that fires the actual notification at your
      current settings so you can sanity-check it before saving. Changes
      apply immediately; no relaunch needed.
    </P>
    <P>
      Travel days are the obvious exception, and{' '}
      <A to="/features/travel-mode">Travel Mode</A> handles that by
      swapping in a stricter preset for the duration of the trip and
      restoring your custom thresholds the next morning at 9 AM.
    </P>

    <H2>Pairing with Low Power Mode</H2>
    <P>
      macOS’s <G slug="low-power-mode">Low Power Mode</G> changes how the
      Mac uses power; custom thresholds change when Sensei tells you about
      it. The two compose: longer runtime from LPM plus earlier warnings
      means fewer surprise shutdowns and more time to plug in. A common
      configuration is LPM enabled on battery, alongside a custom 30 / 12
      / 4% threshold set: runtime stretched, warnings still on time.
    </P>
    <P>
      Custom thresholds is a Pro feature. It’s included in the 5-day
      free trial and unlocks with either plan: the one-time Lifetime
      license (three Macs) or a Yearly Patron subscription. The three
      built-in presets (
      <A to="/features/alert-presets">Zen, Regular, Senpai</A>) remain
      free, and most users find one of them works without modification.
      Custom thresholds is for the cases the presets don’t cover.
    </P>
  </>
)

export const faqs = [
  {
    q: "What happens to my custom thresholds when I enable Travel Mode?",
    a:
      'Travel Mode temporarily swaps in a stricter preset (30 / 15 / 5% by default) for the trip window. Your custom thresholds are saved and restored at the 9 AM auto-reset the next morning; they’re not overwritten.',
  },
  {
    q: 'Can I disable a tier entirely?',
    a:
      'Yes. Set the percent to 0 (or higher than 100) and that tier won’t fire. Most users keep all three active because each has a distinct job: gentle reminder, urgent prompt, last-resort alert.',
  },
  {
    q: 'Do custom thresholds work with Apple’s native low-battery notification?',
    a:
      'They replace it. macOS’s single 10% notification is suppressed while Sensei is running and at least one threshold is active. If you uninstall Sensei, macOS’s notification returns automatically.',
  },
]
