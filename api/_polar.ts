/**
 * Shared Polar helpers for API routes.
 *
 * Files in `api/` that begin with `_` are NOT deployed as Vercel
 * Functions (per Vercel's "paths and filenames" convention) — they're
 * just plain modules that other routes import.
 *
 * Why this exists
 * ---------------
 * Polar's `POST /v1/checkouts/` schema accepts `discount_id` (UUID) but
 * silently ignores `discount_code` (string). Each API route that wants
 * to attach the ZENMODE launch discount therefore has to resolve the
 * code → UUID via `GET /v1/discounts?query=ZENMODE` before creating the
 * session. We centralise that here so:
 *
 *   - checkout-session.ts attaches the right discount at session create
 *   - price.ts can quote the post-discount lifetime total Polar will
 *     actually charge (instead of deriving it from the yearly price)
 *   - discount-availability.ts shares the same single source of truth
 *     for the code, base URL, and redemption cap
 *
 * The resolved UUID is cached module-scope for 10 minutes — Polar
 * discount UUIDs don't change, but if the operator rotates the code we
 * don't want a stale UUID stuck in memory for a full deploy cycle.
 *
 * Why we do NOT import this from `src/lib/polar.ts`
 * --------------------------------------------------
 * Vercel's Vite-built serverless bundler has historically had trouble
 * following cross-tree imports from `api/` into `src/`. The constants
 * here are intentionally duplicated with `src/lib/polar.ts` to keep the
 * function bundles self-contained.
 */

export const POLAR_API_BASE = 'https://api.polar.sh/v1'

/** Launch discount auto-applied to every Lifetime checkout. */
export const LIFETIME_DISCOUNT_CODE = 'ZENMODE'

/** Default timeout for Polar API calls — Polar usually responds <500ms. */
export const POLAR_TIMEOUT_MS = 4_000

type DiscountIdEntry = {
  /** Cached UUID, or `null` when the most recent lookup found no match. */
  id: string | null
  /** Epoch ms at which this entry expires and we re-query Polar. */
  expiresAt: number
}

const DISCOUNT_ID_TTL_MS = 10 * 60 * 1000

const globalForDiscountCache = globalThis as unknown as {
  __polarDiscountIdCache?: Map<string, DiscountIdEntry>
}
const discountIdCache: Map<string, DiscountIdEntry> =
  globalForDiscountCache.__polarDiscountIdCache ??
  (globalForDiscountCache.__polarDiscountIdCache = new Map())

/**
 * Resolve a Polar discount **code** (e.g. "ZENMODE") to its UUID. Polar's
 * `POST /v1/checkouts/` schema only accepts the UUID via `discount_id`;
 * the string `discount_code` field on that schema is silently dropped.
 *
 * Returns `null` (and caches the null) when:
 *   - no `POLAR_ACCESS_TOKEN` is configured
 *   - Polar's list endpoint returns non-2xx
 *   - the code doesn't match any discount on the org
 *
 * The null caching is intentional: it stops every checkout click from
 * pummelling Polar's discounts endpoint when the operator hasn't created
 * the code yet (e.g. preview deployments).
 */
export async function resolveDiscountId(
  code: string,
  token: string,
): Promise<string | null> {
  const key = code.toUpperCase()
  const now = Date.now()
  const cached = discountIdCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.id
  }

  const url = new URL(`${POLAR_API_BASE}/discounts`)
  // Polar's `query` filter does a substring match against the code; we
  // narrow with a case-insensitive exact match on the response below in
  // case multiple discounts share a substring (e.g. ZENMODE + ZENMODE2).
  url.searchParams.set('query', code)
  url.searchParams.set('limit', '20')

  let id: string | null = null
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(POLAR_TIMEOUT_MS),
    })
    if (r.ok) {
      const body = (await r.json()) as {
        items?: Array<{ id?: string; code?: string }>
      }
      const items = Array.isArray(body.items) ? body.items : []
      const match = items.find(
        (d) => typeof d.code === 'string' && d.code.toUpperCase() === key,
      )
      id = typeof match?.id === 'string' ? match.id : null
    } else {
      console.warn('[polar:_polar] discount list non-2xx', { status: r.status })
    }
  } catch (err) {
    console.warn('[polar:_polar] discount list threw', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  discountIdCache.set(key, { id, expiresAt: now + DISCOUNT_ID_TTL_MS })
  return id
}

/** Test-only: clear the in-memory cache. */
export function __resetDiscountIdCache(): void {
  discountIdCache.clear()
}
