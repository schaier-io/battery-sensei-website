import { createFileRoute } from '@tanstack/react-router'
import { Calendar, AlertTriangle, Zap } from 'lucide-react'
import { FeaturePage } from '#/components/FeaturePage'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/features/meeting-battery-guard'
const PAGE_TITLE = 'Meeting Battery Guard — Battery Sensei'
const PAGE_DESC =
  'Calendar-aware battery warning. Sensei predicts whether your battery will survive each meeting and warns at 30/15/5/0 minutes — all on-device.'

export const Route = createFileRoute('/features/meeting-battery-guard')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: () => <FeaturePage slug="meeting-battery-guard" kanji="会" mockup={<MeetingMockup />} />,
})

function MeetingMockup() {
  return (
    <div className="mx-auto max-w-md space-y-3" aria-hidden>
      {/* Calendar peek card */}
      <div className="rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_75%,#fff)] p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-sumi-soft">
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />
          Next on calendar
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div className="display-title text-[1.0625rem] font-medium text-sumi">Weekly standup</div>
          <div className="text-[12px] text-sumi-soft tabular-nums">3:00 PM · 60 min</div>
        </div>
      </div>
      {/* Warning card */}
      <div className="rounded-lg border border-hinomaru/30 bg-hinomaru/[0.04] p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-hinomaru">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
          Battery won't last your meeting
        </div>
        <p className="text-[14px] leading-[1.5] text-sumi">
          Your laptop dies <span className="font-semibold text-hinomaru">17 min</span> into standup.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-sumi/90 px-2.5 py-1.5 text-[11px] text-washi">
          <Zap className="h-3 w-3" strokeWidth={2} />
          22 min on the charger and you're clear through.
        </div>
      </div>
      {/* Timeline */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--line-strong)] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-sumi-soft">
        <span>Reminds you at</span>
        <span className="flex gap-2 tabular-nums text-sumi">
          <span>−30</span>
          <span>−15</span>
          <span>−5</span>
          <span className="text-hinomaru">now</span>
        </span>
      </div>
    </div>
  )
}
