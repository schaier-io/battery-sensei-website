import { P, H2, UL, G, A } from './_components'

export const extended = (
  <>
    <H2>Why capping charge helps</H2>
    <P>
      Lithium-ion cells age fastest at the extremes. Time spent sitting at
      100% — especially warm, especially plugged in overnight — is the single
      most controllable contributor to capacity loss. Holding the pack lower
      on ordinary days trades a little runtime you probably weren't using for
      slower long-term wear.
    </P>
    <P>
      This isn't a replacement for Apple's{' '}
      <G slug="optimized-battery-charging">Optimized Battery Charging</G>,
      which delays the last stretch of a charge based on learned routine.
      Battery Sensei shows that setting's live state alongside its own cap, so
      you can see which mechanism is holding the charge back.
    </P>

    <H2>Picking a number</H2>
    <UL>
      <li>
        <strong>80%</strong> is the common default: meaningful reduction in
        high-state-of-charge time, still a full working day for most people.
      </li>
      <li>
        <strong>90%</strong> suits people who regularly need the runtime and
        want a gentler trade.
      </li>
      <li>
        <strong>100%</strong> turns the cap off entirely — the right answer
        before travel, and Sensei stops nagging about weekly cycles when
        you're there.
      </li>
    </UL>

    <H2>The weekly full cycle</H2>
    <P>
      A pack that never leaves a narrow band gives the battery controller less
      to calibrate against, and runtime estimates drift. With a cap set,
      Sensei surfaces a weekly reminder to run one fuller cycle — enough to
      keep the gauge honest without undoing the benefit of the cap. See{' '}
      <G slug="calibration">calibration</G> for the mechanism, and{' '}
      <A to="/features/battery-journal">the battery journal</A> for whether
      it's working over time.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Does a charge limit actually extend battery lifespan?',
    a:
      "It reduces time spent at high state of charge, which is one of the well-documented stressors on lithium-ion cells alongside heat and deep discharge. It's a slow effect measured over months, not something you'll see next week.",
  },
  {
    q: 'Does this conflict with Optimized Battery Charging?',
    a:
      "No. Apple's feature delays the final charge stretch based on your routine; the cap sets a ceiling. Battery Sensei shows both states so you always know which one is in control.",
  },
  {
    q: 'What happens before a trip?',
    a:
      'Set the cap to 100% (or use Travel Mode) and charge fully. Sensei also pauses the weekly full-cycle reminder while the cap is off.',
  },
] as const
