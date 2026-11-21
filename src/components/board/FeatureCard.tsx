import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp } from 'lucide-react'

export type BoardStatus = 'open' | 'planned' | 'in_progress' | 'shipped'

export type BoardItem = {
  id: string
  title: string
  body: string
  status: BoardStatus
  votes: number
  createdAt: string
}

/** Status color, shown once per section heading (FeatureBoard). */
export const STATUS_DOT: Record<BoardStatus, string> = {
  open: 'bg-nezumi',
  planned: 'bg-kin',
  in_progress: 'bg-hinomaru',
  shipped: 'bg-matcha',
}

/**
 * One request row: title, expandable body, vote control.
 * Title/body are user-submitted content — rendered strictly as React
 * text nodes (never HTML) with pre-line whitespace.
 */
export function FeatureCard({
  item,
  hasVoted,
  onVote,
}: {
  item: BoardItem
  hasVoted: boolean
  onVote: () => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const votable = item.status !== 'shipped'

  return (
    <article className="paper-card flex items-start gap-4 p-4 sm:p-5">
      <button
        type="button"
        onClick={onVote}
        disabled={!votable}
        aria-pressed={hasVoted}
        aria-label={hasVoted ? t('board.unvote') : t('board.vote')}
        title={hasVoted ? t('board.unvote') : t('board.vote')}
        className={[
          'flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-md border px-2 py-2 transition-[colors,transform,box-shadow] duration-[220ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
          hasVoted
            ? 'border-hinomaru/40 bg-hinomaru/[0.08] text-hinomaru-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
            : 'border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,var(--paper-lift))] text-sumi-soft hover:border-[var(--line-strong)] hover:text-sumi',
          votable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default opacity-55',
        ].join(' ')}
      >
        <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden />
        <span className="text-[0.9375rem] font-semibold tabular-nums leading-none">
          {item.votes}
        </span>
        <span className="sr-only">{t('board.votes', { count: item.votes })}</span>
      </button>

      <div className="min-w-0 flex-1">
        {/* No status chip: the section heading above already names it. */}
        <h3 className="display-title text-[1rem] font-medium leading-snug text-sumi">
          {item.title}
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="mt-1.5 block w-full cursor-pointer text-left"
        >
          <p
            className={[
              'whitespace-pre-line text-[0.875rem] leading-[1.55] text-sumi-soft',
              expanded ? '' : 'line-clamp-2',
            ].join(' ')}
          >
            {item.body}
          </p>
        </button>
      </div>
    </article>
  )
}
