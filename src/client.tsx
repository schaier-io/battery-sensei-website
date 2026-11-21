import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { loadLocale, localeFromPath } from '#/lib/i18n'

// Same as TanStack Start's default client entry, plus one step: only English
// ships in the entry chunk, so a prerendered /de, /es, /fr or /ja page must
// fetch its locale chunk BEFORE hydrating, or React would hydrate German HTML
// with English strings (hydration error #418). English pages skip the wait.
const locale = localeFromPath(window.location.pathname)

// A failed chunk fetch is retried once. If it fails again, the page hydrates
// anyway: React then re-renders on the client (#418) rather than staying inert.
const ready = locale ? loadLocale(locale).catch(() => loadLocale(locale)) : Promise.resolve()

// catch: a second failure is expected here; hydration still runs below.
void ready.catch(() => {}).finally(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    )
  })
})
