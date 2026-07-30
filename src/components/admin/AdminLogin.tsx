import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Input } from '#/components/ui/input'

/** Single-key login for the moderation dashboard. English-only. */
export function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || key.trim().length === 0) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Forgive the obvious paste shapes: a full `.env` line
        // (`ADMIN_DASHBOARD_KEY=…`), surrounding quotes, stray whitespace.
        body: JSON.stringify({
          key: key
            .trim()
            .replace(/^ADMIN_DASHBOARD_KEY=/, '')
            .replace(/^["']|["']$/g, '')
            .trim(),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (response.ok && data.ok) {
        setKey('')
        onAuthed()
      } else {
        setError(data.error ?? 'Login failed.')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <form onSubmit={handleSubmit} className="paper-card flex flex-col gap-4 p-6">
        <header className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-hinomaru" strokeWidth={1.7} aria-hidden />
          <h1 className="display-title text-[1.0625rem] font-medium text-sumi">
            Feature board admin
          </h1>
        </header>
        <Input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Admin key"
          autoComplete="current-password"
          autoFocus
          aria-label="Admin key"
        />
        {error && (
          <p role="alert" className="text-[0.8125rem] text-hinomaru">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || key.trim().length === 0}
          className="btn-sumi inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
