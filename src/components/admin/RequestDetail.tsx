import { useEffect, useState } from 'react'
import { Check, Mail, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export type AdminItem = {
  id: string
  ticketId: string
  status: string
  source: string
  title: string
  body: string
  publicTitle: string | null
  publicBody: string | null
  email: string
  name: string
  locale: string
  votes: number
  rejectionReason: string | null
  adminNote: string | null
  ipAddress: string | null
  userAgent: string | null
  origin: string | null
  createdAt: string
  moderatedAt: string | null
}

export const STATUS_BADGE: Record<string, string> = {
  pending: 'text-kin border-kin/40 bg-kin/[0.08]',
  open: 'text-sumi-soft border-[var(--line-strong)]',
  planned: 'text-kin border-kin/40 bg-kin/[0.06]',
  in_progress: 'text-hinomaru-ink border-hinomaru/40 bg-hinomaru/[0.06]',
  shipped: 'text-matcha border-matcha/40 bg-matcha/[0.06]',
  rejected: 'text-nezumi border-[var(--line)] opacity-70',
}

const ROADMAP_STATUSES = ['open', 'planned', 'in_progress', 'shipped'] as const

type PatchBody = Record<string, unknown>

/**
 * Detail dialog for a single request: full record, editable public
 * copy, approve / reject-with-reason / roadmap-status actions. Every
 * mutation is a PATCH to /api/admin/feature-requests.
 */
export function RequestDetail({
  item,
  onClose,
  onUpdated,
  onSessionExpired,
}: {
  item: AdminItem | null
  onClose: () => void
  onUpdated: (item: AdminItem) => void
  onSessionExpired: () => void
}) {
  const [publicTitle, setPublicTitle] = useState('')
  const [publicBody, setPublicBody] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!item) return
    setPublicTitle(item.publicTitle ?? item.title)
    setPublicBody(item.publicBody ?? item.body)
    setReason(item.rejectionReason ?? '')
    setError('')
    setNotice('')
  }, [item])

  if (!item) return null

  async function patch(body: PatchBody): Promise<void> {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/feature-requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean
        item?: AdminItem
        emailSent?: boolean
        error?: string
      } | null
      if (!response.ok || !data?.ok || !data.item) {
        setError(data?.error ?? 'Update failed.')
        return
      }
      onUpdated(data.item)
      if (data.emailSent === true) setNotice('Saved — decision email sent.')
      else if (data.emailSent === false) setNotice('Saved, but the decision email failed to send.')
      else setNotice('Saved.')
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  const isPending = item.status === 'pending'
  const isApproved = (ROADMAP_STATUSES as readonly string[]).includes(item.status)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-[var(--line)] bg-[var(--washi)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="display-title flex flex-wrap items-center gap-2.5 text-[1.125rem] font-medium text-sumi">
            <span className="font-mono text-[0.8125rem] text-nezumi">{item.ticketId}</span>
            {item.title}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_BADGE[item.status] ?? ''}`}
            >
              {item.status.replace('_', ' ')}
            </span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-nezumi">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" strokeWidth={1.7} aria-hidden />
                {item.name ? `${item.name} · ` : ''}
                {item.email}
              </span>
              <span>source: {item.source}</span>
              <span>locale: {item.locale}</span>
              <span>votes: {item.votes}</span>
              <span>received: {new Date(item.createdAt).toLocaleString()}</span>
              {item.adminNote && <span className="text-hinomaru-ink">note: {item.adminNote}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,var(--paper-lift))] p-3.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-nezumi">
            As submitted
          </p>
          <p className="whitespace-pre-line text-[0.875rem] leading-[1.55] text-sumi">
            {item.body}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-public-title">Public title</Label>
            <Input
              id="admin-public-title"
              value={publicTitle}
              onChange={(event) => setPublicTitle(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-public-body">Public description</Label>
            <Textarea
              id="admin-public-body"
              value={publicBody}
              onChange={(event) => setPublicBody(event.target.value)}
              maxLength={4000}
              rows={4}
            />
          </div>
        </section>

        {isPending && (
          <section className="flex flex-col gap-3 rounded-md border border-dashed border-[var(--line-strong)] p-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-reason">Rejection reason (emailed to the submitter)</Label>
              <Textarea
                id="admin-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Honest, kind, specific."
              />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void patch({ id: item.id, action: 'approve', publicTitle, publicBody })
                }
                className="btn-sumi inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium disabled:opacity-50"
              >
                <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Approve & publish
              </button>
              <button
                type="button"
                disabled={busy || reason.trim().length < 4}
                onClick={() => void patch({ id: item.id, action: 'reject', reason: reason.trim() })}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-hinomaru/40 px-5 text-sm font-medium text-hinomaru-ink transition-colors hover:bg-hinomaru/[0.06] disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Reject & notify
              </button>
            </div>
          </section>
        )}

        {isApproved && (
          <>
            <section className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1.5">
                <Label>Roadmap status</Label>
                <Select
                  value={item.status}
                  onValueChange={(value) =>
                    void patch({ id: item.id, action: 'set_status', status: value })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROADMAP_STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void patch({ id: item.id, action: 'edit', publicTitle, publicBody })}
                className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm font-medium text-sumi-soft transition-colors hover:text-sumi disabled:opacity-50"
              >
                Save public copy
              </button>
            </section>

            <section className="flex flex-col gap-2 rounded-md border border-dashed border-hinomaru/40 p-3.5">
              <Label htmlFor="admin-takedown-reason">
                Take down (removes it from the public board; no email is sent)
              </Label>
              <Textarea
                id="admin-takedown-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Internal reason for the record."
              />
              <button
                type="button"
                disabled={busy || reason.trim().length < 4}
                onClick={() => void patch({ id: item.id, action: 'reject', reason: reason.trim() })}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-hinomaru/40 px-5 text-sm font-medium text-hinomaru-ink transition-colors hover:bg-hinomaru/[0.06] disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Take down
              </button>
            </section>
          </>
        )}

        {item.status === 'rejected' && item.rejectionReason && (
          <p className="text-[0.8125rem] text-nezumi">
            Rejected with: <span className="text-sumi-soft">{item.rejectionReason}</span>
          </p>
        )}

        {(error || notice) && (
          <p
            role={error ? 'alert' : 'status'}
            className={`text-[0.8125rem] ${error ? 'text-hinomaru-ink' : 'text-matcha'}`}
          >
            {error || notice}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
