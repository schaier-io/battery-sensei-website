/** Client-only. SSR always returns false (no transitions run on server). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Run `callback` inside a view transition when motion is allowed. */
export function runViewTransition(callback: () => void | Promise<void>): void {
  if (prefersReducedMotion()) {
    void callback()
    return
  }
  const startVT = document.startViewTransition?.bind(document)
  if (startVT) startVT(callback)
  else void callback()
}
