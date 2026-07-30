import { useCallback, useEffect, useState } from 'react'
import { LogOut, RefreshCw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { AdminLogin } from './AdminLogin'
import { RequestDetail, STATUS_BADGE, type AdminItem } from './RequestDetail'

/**
 * Moderation dashboard shell: session gate, status filter, request
 * table, and the detail dialog. All data flows through /api/admin/*
 * with the httpOnly session cookie; any 401 collapses back to login.
 */

type Session = 'checking' | 'anonymous' | 'authed'

const FILTERS = ['pending', 'open', 'planned', 'in_progress', 'shipped', 'rejected', 'all'] as const
type Filter = (typeof FILTERS)[number]

export function AdminArea() {
  const [session, setSession] = useState<Session>('checking')

  useEffect(() => {
    let cancelled = false
    void fetch('/api/admin/session')
      .then((response) => {
        if (!cancelled) setSession(response.ok ? 'authed' : 'anonymous')
      })
      .catch(() => {
        if (!cancelled) setSession('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (session === 'checking') {
    return <p className="mt-24 text-center text-sm text-nezumi">Checking session…</p>
  }
  if (session === 'anonymous') {
    return <AdminLogin onAuthed={() => setSession('authed')} />
  }
  return <Dashboard onSessionExpired={() => setSession('anonymous')} />
}

function Dashboard({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [filter, setFilter] = useState<Filter>('pending')
  const [items, setItems] = useState<AdminItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AdminItem | null>(null)

  const load = useCallback(
    async (status: Filter, cursor: string | null) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ status })
        if (cursor) params.set('cursor', cursor)
        const response = await fetch(`/api/admin/feature-requests?${params.toString()}`)
        if (response.status === 401) {
          onSessionExpired()
          return
        }
        const data = (await response.json().catch(() => null)) as {
          ok?: boolean
          items?: AdminItem[]
          nextCursor?: string | null
          error?: string
        } | null
        if (!response.ok || !data?.ok || !data.items) {
          setError(data?.error ?? 'Failed to load requests.')
          return
        }
        setItems((prev) => (cursor ? [...prev, ...data.items!] : data.items!))
        setNextCursor(data.nextCursor ?? null)
      } catch {
        setError('Network error.')
      } finally {
        setLoading(false)
      }
    },
    [onSessionExpired],
  )

  useEffect(() => {
    setItems([])
    setNextCursor(null)
    void load(filter, null)
  }, [filter, load])

  const handleUpdated = useCallback((item: AdminItem) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)))
    setSelected(item)
  }, [])

  async function handleLogout() {
    await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => undefined)
    onSessionExpired()
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-title text-[1.25rem] font-medium text-sumi">
          Feature board admin
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load(filter, null)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--line)] px-3 text-[0.8125rem] font-medium text-sumi-soft transition-colors hover:text-sumi disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.7} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--line)] px-3 text-[0.8125rem] font-medium text-sumi-soft transition-colors hover:text-sumi"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            Log out
          </button>
        </div>
      </header>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList className="flex-wrap">
          {FILTERS.map((value) => (
            <TabsTrigger key={value} value={value} className="capitalize">
              {value.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <p role="alert" className="text-[0.8125rem] text-hinomaru-ink">
          {error}
        </p>
      )}

      <div className="paper-card overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Votes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-nezumi">
                  Nothing here.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-[0.75rem] text-nezumi">
                    {item.ticketId}
                  </TableCell>
                  <TableCell className="max-w-64 truncate font-medium text-sumi">
                    {item.publicTitle ?? item.title}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-sumi-soft">{item.email}</TableCell>
                  <TableCell className="text-sumi-soft">{item.source}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.votes}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_BADGE[item.status] ?? ''}`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[0.75rem] text-nezumi">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {nextCursor && (
        <button
          type="button"
          onClick={() => void load(filter, nextCursor)}
          disabled={loading}
          className="mx-auto inline-flex h-9 items-center rounded-md border border-[var(--line)] px-4 text-[0.8125rem] font-medium text-sumi-soft transition-colors hover:text-sumi disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <RequestDetail
        item={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onSessionExpired={onSessionExpired}
      />
    </div>
  )
}
