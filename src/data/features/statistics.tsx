import { P, H2, A } from './_components'

export const extended = (
  <>
    <H2>What a recap contains</H2>
    <P>
      Every week and month, Sensei folds the raw history into a short recap:
      how long you ran unplugged, how many charge sessions you started, your
      average depth of discharge, the hottest stretch, and the closest call
      you had. It reads like a summary a person would write, not a table.
    </P>

    <H2>Why summaries beat live numbers</H2>
    <P>
      A live percentage answers “what now”. It can’t answer “is this normal
      for me”. Recaps make patterns visible: the week you were on the road,
      the month a sync client quietly ran all day, the stretch where your
      average discharge depth crept from 40% to 70%, the kind of drift that{' '}
      <A to="/features/battery-health">capacity</A> reflects only months
      later.
    </P>

    <H2>Rescues</H2>
    <P>
      When you plug in within thirty minutes of a critical warning, Sensei
      records a rescue and can stitch a small shareable receipt for it. It’s
      a light touch, but it turns a near-miss into something you can actually
      count over a month, and it pairs with{' '}
      <A to="/features/alert-presets">warning presets</A>, since the presets
      decide how much warning you got in the first place.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Where does the data come from?',
    a:
      'Entirely from the local history Battery Sensei records on your own Mac. No account, no sync, no telemetry: the recaps are computed on-device from your own samples.',
  },
  {
    q: 'How long until the first recap?',
    a:
      'The weekly recap needs a few days of samples to say anything meaningful; the monthly one fills in as the month progresses. Sensei shows what it has rather than an empty shell.',
  },
  {
    q: 'Can I share a recap?',
    a:
      'Yes. Recaps and rescue receipts render as small cards you can save or send. Nothing is uploaded; you create the image and decide where it goes.',
  },
] as const
