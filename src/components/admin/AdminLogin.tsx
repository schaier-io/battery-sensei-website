import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { HomeLink } from '#/components/HomeLink'

/** Errors we are willing to show a stranger. Anything else collapses to a
    generic line: `/admin` is on the public web, so the API response is not
    a safe thing to render verbatim if it ever grows more detail. */
const SAFE_ERRORS = new Set([
  'Invalid key.',
  'Invalid input.',
  'Too many attempts. Please wait a few minutes.',
])

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
        // Forgive the obvious paste shapes: a full `.env` line, surrounding
        // quotes, stray whitespace. The env var NAME is matched
        // case-insensitively via a character class so the literal string
        // never appears in the client bundle as free reconnaissance.
        body: JSON.stringify({
          key: key
            .trim()
            .replace(/^[A-Z_]+_KEY=/i, '')
            .replace(/^["']|["']$/g, '')
            .trim(),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (response.ok && data.ok) {
        setKey('')
        onAuthed()
      } else {
        const reported = data.error ?? ''
        setError(SAFE_ERRORS.has(reported) ? reported : 'Login failed.')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      {/* This URL is publicly reachable, so an accidental visitor should
          land on something that reads as a locked staff door in a building
          they recognise, not an unbranded password box on a blank page. */}
      <div className="mb-6 text-center">
        <HomeLink className="zen-link-lift text-[0.8125rem] tracking-[0.02em] text-sumi-soft hover:text-sumi">
          <span className="font-display text-[0.9375rem] tracking-[0.14em] uppercase">
            Battery Sensei
          </span>
        </HomeLink>
      </div>
      <form onSubmit={handleSubmit} className="paper-card flex flex-col gap-4 p-6">
        <header className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-hinomaru-ink" strokeWidth={1.7} aria-hidden />
          <h1 className="display-title text-h4 font-medium text-sumi">Feature board admin</h1>
        </header>
        {/* House input geometry (h-11, washi fill, ink focus ring) rather
            than the shadcn primitive, which is styled off --input/--ring and
            reads as a foreign control next to every other field on the site. */}
        <input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Admin key"
          autoComplete="current-password"
          autoFocus
          aria-label="Admin key"
          className="block h-11 w-full min-w-0 rounded-md border border-[color-mix(in_oklab,var(--sumi)_16%,transparent)] bg-[color-mix(in_oklab,var(--washi)_72%,var(--paper-lift))] px-3 text-[0.875rem] text-sumi placeholder:text-nezumi/70 focus:outline-none focus:ring-2 focus:ring-sumi/25"
        />
        {error && (
          <p role="alert" className="text-[0.8125rem] text-hinomaru-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || key.trim().length === 0}
          className="btn-sumi inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
