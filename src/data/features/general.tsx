import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>What lives here</H2>
    <UL>
      <li>
        <strong>Menu-bar content.</strong> Choose what the item shows —
        percentage, time remaining, an icon alone — so the thing you check
        forty times a day says the thing you actually want.
      </li>
      <li>
        <strong>Appearance.</strong> Follow the system, or pin light or dark.
        Every surface, overlay, and share card is designed in both.
      </li>
      <li>
        <strong>Language.</strong> English, German, Spanish, French, and
        Japanese, independent of your macOS language if you prefer.
      </li>
      <li>
        <strong>Start at login.</strong> Battery Sensei is only useful when
        it's running; this is the switch that keeps it there.
      </li>
    </UL>

    <H2>What deliberately isn't here</H2>
    <P>
      No account, no sync settings, no telemetry toggle — because there's
      nothing to sync and nothing being collected. Everything Battery Sensei
      knows about your battery stays on your Mac, which is why the settings
      list is short. The charging behaviour itself lives in{' '}
      <A to="/features/charge-limit">the charge limit</A>, and alerting in{' '}
      <A to="/features/alert-presets">warning presets</A>.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Does Battery Sensei need an account?',
    a:
      "No. There's no sign-up, no cloud, and no telemetry. A licence key unlocks Premium and is checked against the store, nothing else.",
  },
  {
    q: "Can the app's language differ from macOS?",
    a:
      'Yes. Pick any of the five supported languages in General; it applies to the app only.',
  },
  {
    q: 'Does it start automatically?',
    a:
      'Only if you turn on Start at Login. Battery Sensei never installs a launch agent behind your back.',
  },
] as const
