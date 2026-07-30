import { P, H2, A } from './_components'

export const extended = (
  <>
    <H2>Recognition, not gamification</H2>
    <P>
      Honors mark habits that actually correlate with a healthier pack:
      keeping charge in a moderate band, plugging in before a critical
      warning becomes an emergency, letting a weekly calibration cycle
      happen. They unlock quietly and they never nag. There are no points,
      no leaderboards, and nothing to lose by ignoring them.
    </P>

    <H2>Why habits are the lever</H2>
    <P>
      You can't undo cycle count and you can't repair capacity. What you can
      change is the pattern: how deep you discharge, how long you sit at
      100%, how hot the Mac gets while charging. Those are habits, and
      habits respond to feedback. Honors are the lightest feedback that
      still works.
    </P>
    <P>
      The underlying behaviors are the same ones{' '}
      <A to="/features/charge-limit">the charge limit</A> automates and{' '}
      <A to="/features/battery-journal">Saga</A> records. Honors just
      make the streak visible.
    </P>
  </>
)

export const faqs = [
  {
    q: 'Do honors do anything, or are they decorative?',
    a:
      "They're recognition only. Nothing in the app behaves differently once you earn one. The value is the nudge toward habits that measurably reduce wear.",
  },
  {
    q: 'Can I hide them?',
    a:
      'The gallery collapses, and honors never interrupt you: no notifications, no badges on the menu bar item.',
  },
  {
    q: 'Are they synced or shared anywhere?',
    a:
      "No. They're computed and stored locally from your own battery history.",
  },
] as const
