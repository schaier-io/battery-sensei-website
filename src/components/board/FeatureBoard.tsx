import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { Reveal } from '#/components/zen/Reveal'
import {
  clearStoredLicenseKey,
  getStoredLicenseKey,
  storeLicenseKey,
} from '#/lib/board-license'
import { BoardSubmitForm } from './BoardSubmitForm'
import { FeatureCard, type BoardItem, type BoardStatus } from './FeatureCard'
import { LicenseKeyDialog } from './LicenseKeyDialog'

/**
 * The public feature board. Fetches the approved list, checks the stored
 * license key (if any) for existing votes, and drives optimistic
 * vote/unvote with server reconciliation.
 *
 * The license key lives in localStorage (see board-license.ts) and is
 * only ever sent inside POST bodies to /api/feature-requests/vote.
 */

const SECTION_ORDER: ReadonlyArray<BoardStatus> = ['in_progress', 'planned', 'open', 'shipped']

type VoteResponse = {
  ok?: boolean
  valid?: boolean
  votedIds?: string[]
  votes?: number
  error?: string
}

async function postVote(body: Record<string, unknown>): Promise<{ status: number; data: VoteResponse }> {
  const response = await fetch('/api/feature-requests/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as VoteResponse
  return { status: response.status, data }
}

export function FeatureBoard() {
  const { t } = useTranslation()
  const [items, setItems] = useState<BoardItem[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [votedIds, setVotedIds] = useState<ReadonlySet<string>>(new Set())
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [voteError, setVoteError] = useState('')
  // Vote the visitor asked for before we had a key — fired right after
  // the dialog validates one.
  const pendingVoteIdRef = useRef<string | null>(null)
  const inFlightRef = useRef<Set<string>>(new Set())
  // Mirror of `votedIds` for async callbacks: castVote must decide
  // vote-vs-unvote from the LATEST state, not the render it was created
  // in (deferred votes after re-keying would otherwise invert).
  const votedIdsRef = useRef<ReadonlySet<string>>(votedIds)
  useEffect(() => {
    votedIdsRef.current = votedIds
  }, [votedIds])

  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  type ListResponse = {
    items?: BoardItem[]
    hasMore?: boolean
    nextCursor?: string | null
  }

  const fetchPage = useCallback(async (cursor?: string): Promise<ListResponse | null> => {
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      const response = await fetch(`/api/feature-requests${query}`, {
        headers: { accept: 'application/json' },
      })
      const data = (await response.json().catch(() => null)) as ListResponse | null
      if (!response.ok || !data?.items) return null
      return data
    } catch {
      return null
    }
  }, [])

  const loadBoard = useCallback(async () => {
    setLoadError(false)
    setItems(null)
    setNextCursor(null)
    const data = await fetchPage()
    if (!data) {
      setLoadError(true)
      setItems([])
      return
    }
    setItems(data.items ?? [])
    setNextCursor(data.hasMore ? (data.nextCursor ?? null) : null)
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    const data = await fetchPage(nextCursor)
    setIsLoadingMore(false)
    if (!data) return
    setItems((current) => {
      const seen = new Set((current ?? []).map((item) => item.id))
      return [...(current ?? []), ...(data.items ?? []).filter((item) => !seen.has(item.id))]
    })
    setNextCursor(data.hasMore ? (data.nextCursor ?? null) : null)
  }, [fetchPage, nextCursor, isLoadingMore])

  useEffect(() => {
    void loadBoard()
  }, [loadBoard])

  // Infinite load: the sentinel at the bottom of the list's own scroll
  // region fetches the next page as it scrolls into view.
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !nextCursor) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore()
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [nextCursor, loadMore])

  // Arm voting from a previously stored key (checkout auto-save or a
  // prior dialog entry). Invalid keys are silently forgotten.
  useEffect(() => {
    const key = getStoredLicenseKey()
    if (!key) return
    let cancelled = false
    void postVote({ action: 'check', licenseKey: key }).then(({ status, data }) => {
      if (cancelled) return
      if (status === 200 && data.ok && data.valid) {
        setHasStoredKey(true)
        setVotedIds(new Set(data.votedIds ?? []))
      } else if (status === 200 && data.valid === false) {
        clearStoredLicenseKey()
      }
      // 5xx: leave the key alone; voting will retry the check implicitly.
    })
    return () => {
      cancelled = true
    }
  }, [])

  const applyServerState = useCallback((requestId: string, data: VoteResponse) => {
    // Per-id delta, NOT a wholesale replace: concurrent votes on other
    // ids resolve out of order, and an older full snapshot would erase a
    // newer vote's checkmark.
    if (data.votedIds) {
      const isVoted = data.votedIds.includes(requestId)
      setVotedIds((prev) => {
        if (prev.has(requestId) === isVoted) return prev
        const next = new Set(prev)
        if (isVoted) next.add(requestId)
        else next.delete(requestId)
        return next
      })
    }
    if (typeof data.votes === 'number') {
      setItems((prev) =>
        prev
          ? prev.map((item) => (item.id === requestId ? { ...item, votes: data.votes! } : item))
          : prev,
      )
    }
  }, [])

  const castVote = useCallback(
    async (item: BoardItem, key: string) => {
      if (inFlightRef.current.has(item.id)) return
      inFlightRef.current.add(item.id)
      setVoteError('')

      // Latest state via ref — the closure may be stale (deferred vote
      // fired from the key dialog after a re-key).
      const wasVoted = votedIdsRef.current.has(item.id)
      const action = wasVoted ? 'unvote' : 'vote'

      // Optimistic flip; reconciled (or rolled back) below.
      setVotedIds((prev) => {
        const next = new Set(prev)
        if (wasVoted) next.delete(item.id)
        else next.add(item.id)
        return next
      })
      setItems((prev) =>
        prev
          ? prev.map((it) =>
              it.id === item.id ? { ...it, votes: it.votes + (wasVoted ? -1 : 1) } : it,
            )
          : prev,
      )

      const rollback = () => {
        setVotedIds((prev) => {
          const next = new Set(prev)
          if (wasVoted) next.add(item.id)
          else next.delete(item.id)
          return next
        })
        setItems((prev) =>
          prev
            ? prev.map((it) =>
                it.id === item.id ? { ...it, votes: it.votes + (wasVoted ? 1 : -1) } : it,
              )
            : prev,
        )
      }

      try {
        const { status, data } = await postVote({ action, licenseKey: key, requestId: item.id })
        if (status === 200 && data.ok && data.valid) {
          applyServerState(item.id, data)
        } else if (status === 200 && data.valid === false) {
          // Key no longer valid — forget it and re-prompt.
          rollback()
          clearStoredLicenseKey()
          setHasStoredKey(false)
          pendingVoteIdRef.current = item.id
          setDialogOpen(true)
        } else if (status === 404) {
          // The request vanished (moderation) — refresh the whole board.
          void loadBoard()
        } else {
          rollback()
          setVoteError(data.error ?? t('board.error'))
        }
      } catch {
        rollback()
        setVoteError(t('board.error'))
      } finally {
        inFlightRef.current.delete(item.id)
      }
    },
    [applyServerState, loadBoard, t, votedIds],
  )

  const handleVoteClick = useCallback(
    (item: BoardItem) => {
      // A stored key is used immediately even if the mount-time `check`
      // hasn't resolved — the server validates on every call anyway, and
      // the invalid path re-prompts. Only a missing key needs the dialog.
      const key = getStoredLicenseKey()
      if (!key) {
        pendingVoteIdRef.current = item.id
        setDialogOpen(true)
        return
      }
      void castVote(item, key)
    },
    [castVote],
  )

  const handleKeyValidated = useCallback(
    (key: string, checkedVotedIds: string[]) => {
      storeLicenseKey(key)
      setHasStoredKey(true)
      const next = new Set(checkedVotedIds)
      // Sync the ref immediately — the deferred castVote below runs
      // before React re-renders and must see the new key's vote state.
      votedIdsRef.current = next
      setVotedIds(next)
      setDialogOpen(false)
      const pendingId = pendingVoteIdRef.current
      pendingVoteIdRef.current = null
      if (pendingId) {
        const item = items?.find((it) => it.id === pendingId)
        // Skip the deferred vote if the check shows it already exists.
        if (item && !checkedVotedIds.includes(pendingId)) void castVote(item, key)
      }
    },
    [castVote, items],
  )

  const handleForgetKey = useCallback(() => {
    clearStoredLicenseKey()
    setHasStoredKey(false)
    setVotedIds(new Set())
  }, [])

  const sections = useMemo(() => {
    if (!items) return []
    return SECTION_ORDER.map((status) => ({
      status,
      items: items.filter((item) => item.status === status),
    })).filter((section) => section.items.length > 0)
  }, [items])

  return (
    <div className="flex flex-col gap-10">
      {items === null ? (
        <p className="text-center text-[0.9375rem] text-nezumi" role="status">
          {t('board.loading')}
        </p>
      ) : loadError || sections.length === 0 ? (
        // A failed load and an empty board look the same to the visitor:
        // nothing to show. The calm empty state covers both — an error
        // banner with a Try-again button reads as "the site is broken"
        // when the board is merely young. The quiet retry link below is
        // enough for the genuine-outage case.
        <div className="paper-card flex flex-col items-center gap-2 p-8 text-center">
          <p className="display-title text-[1.0625rem] font-medium text-sumi">
            {t('board.empty.title')}
          </p>
          <p className="text-[0.9375rem] text-sumi-soft">{t('board.empty.message')}</p>
          {loadError && (
            <button
              type="button"
              onClick={() => void loadBoard()}
              className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] text-nezumi transition-colors hover:text-sumi"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              {t('board.retry')}
            </button>
          )}
        </div>
      ) : (
        // The board scrolls inside its own region so a long list never
        // swallows the page — the submit form below stays reachable.
        <div className="flex max-h-[560px] flex-col gap-10 overflow-y-auto overscroll-contain pr-1.5">
          {sections.map((section) => (
            <section key={section.status} aria-label={t(`board.sections.${section.status}`)}>
              <h2 className="display-title mb-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">
                {t(`board.sections.${section.status}`)}
              </h2>
              <div className="flex flex-col gap-3">
                {section.items.map((item) => (
                  <FeatureCard
                    key={item.id}
                    item={item}
                    hasVoted={votedIds.has(item.id)}
                    onVote={() => handleVoteClick(item)}
                  />
                ))}
              </div>
            </section>
          ))}

          {nextCursor && (
            <div ref={loadMoreRef} className="flex justify-center py-2" aria-hidden>
              {isLoadingMore && (
                <RefreshCw className="h-4 w-4 animate-spin text-nezumi motion-reduce:animate-none" strokeWidth={1.7} />
              )}
            </div>
          )}
        </div>
      )}

      {voteError && (
        <p role="alert" className="text-center text-[0.8125rem] text-hinomaru">
          {voteError}
        </p>
      )}

      <Reveal delay={120}>
        <BoardSubmitForm />
      </Reveal>

      {hasStoredKey && (
        <p className="text-center text-[0.75rem] text-nezumi">
          {t('board.license.armedNote')}{' '}
          <button
            type="button"
            onClick={handleForgetKey}
            className="underline decoration-[var(--line-strong)] underline-offset-2 transition-colors hover:text-sumi"
          >
            {t('board.license.changeAction')}
          </button>
        </p>
      )}

      <LicenseKeyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) pendingVoteIdRef.current = null
        }}
        onValidated={handleKeyValidated}
      />
    </div>
  )
}
