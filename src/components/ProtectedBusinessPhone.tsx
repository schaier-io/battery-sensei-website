import { useState } from 'react'

// Keep the public business number out of server-rendered HTML and avoid one
// scrape-ready literal in the client bundle. A browser bot can still click.
const PHONE_PARTS = ['+420', '704', '911', '233'] as const

export function ProtectedBusinessPhone({
  label,
  revealLabel,
  callLabel,
}: {
  label: string
  revealLabel: string
  callLabel: string
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span data-nosnippet>
      {label}:{' '}
      {revealed ? (
        <a
          className="legal-link"
          href={`tel:${PHONE_PARTS.join('')}`}
          aria-label={callLabel}
        >
          {PHONE_PARTS.join(' ')}
        </a>
      ) : (
        <button
          type="button"
          className="legal-link"
          onClick={() => setRevealed(true)}
          aria-label={revealLabel}
        >
          {revealLabel}
        </button>
      )}
    </span>
  )
}
