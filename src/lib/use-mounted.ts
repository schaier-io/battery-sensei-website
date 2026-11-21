import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** False during SSR and hydration, true after. Lets heavy decorative markup
 *  (procedural brush SVGs) skip the prerendered HTML, which is on the
 *  first-paint path, without a hydration mismatch. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
