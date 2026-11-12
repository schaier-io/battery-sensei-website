/**
 * The Battery Sensei versions telemetry accepts: the newest releases listed
 * in the public Sparkle appcast (every release is an item there).
 *
 * Only real versions are counted, and only the newest by name, so the set of
 * counter keys a flood can create stays small and fixed. The appcast ships in the same commit and deploy as each
 * release, but it is CDN-cached for up to 15 minutes, so pings from a
 * brand-new version can be dropped for that long after a release.
 */
import { siteUrl } from './resend.js'

/**
 * The newest this-many releases are counted by name; older releases share
 * the OLDER_RELEASES bucket, so Macs that stopped updating still show up.
 */
export const ACCEPTED_RELEASE_COUNT = 30
export const OLDER_RELEASES = 'older'
const CACHE_TTL_MS = 10 * 60 * 1000
/** An unknown version may trigger an early refresh, at most this often. */
const UNKNOWN_VERSION_REFRESH_MS = 60 * 1000
const FETCH_TIMEOUT_MS = 3000
const SHORT_VERSION_RE = /<sparkle:shortVersionString>([^<]+)<\/sparkle:shortVersionString>/g
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/

type Releases = { recent: Set<string>; all: Set<string> }
/** `releases` is null until the appcast has been read successfully once. */
let cache: { releases: Releases | null; fetchedAt: number } = { releases: null, fetchedAt: -Infinity }
/** Concurrent callers share one fetch instead of racing past it. */
let inFlight: Promise<void> | null = null

function compareSemverDesc(a: string, b: string): number {
  const pa = SEMVER_RE.exec(a)!.slice(1).map(Number)
  const pb = SEMVER_RE.exec(b)!.slice(1).map(Number)
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] !== pb[i]) return pb[i]! - pa[i]!
  }
  return 0
}

/** Every plain `x.y.z` version in the appcast, and the newest ACCEPTED_RELEASE_COUNT of them. */
export function parseReleases(appcast: string): Releases {
  const all = new Set(
    [...appcast.matchAll(SHORT_VERSION_RE)].map((m) => m[1]!.trim()).filter((v) => SEMVER_RE.test(v)),
  )
  return { all, recent: new Set([...all].sort(compareSemverDesc).slice(0, ACCEPTED_RELEASE_COUNT)) }
}

async function fetchReleases(): Promise<void> {
  // Stamp first: a failing appcast is retried once per interval, not once
  // per incoming ping. A failure keeps the previous set.
  cache = { releases: cache.releases, fetchedAt: Date.now() }
  try {
    const response = await fetch(`${siteUrl()}/appcast.xml`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return
    const releases = parseReleases(await response.text())
    if (releases.all.size > 0) cache = { releases, fetchedAt: cache.fetchedAt }
  } catch {
    // Keep the previous set (or null) until the next interval.
  }
}

function refresh(): Promise<void> {
  inFlight ??= fetchReleases().finally(() => {
    inFlight = null
  })
  return inFlight
}

/**
 * The counter key for `version`: itself if it is one of the newest
 * releases, OLDER_RELEASES if it is an older release, null if it was never
 * released. Fails closed: while the appcast has never been readable, nothing
 * is counted, because accepting every regex-valid version would let a flood
 * create unbounded counter rows.
 */
export async function releaseBucket(version: string): Promise<string | null> {
  const age = Date.now() - cache.fetchedAt
  if (age >= CACHE_TTL_MS) {
    await refresh()
  } else if (inFlight) {
    await inFlight
  } else if (!cache.releases?.all.has(version) && age >= UNKNOWN_VERSION_REFRESH_MS) {
    // Also retries early after a failed first fetch, instead of counting
    // nothing on this instance for a whole TTL.
    await refresh()
  }
  const releases = cache.releases
  if (releases?.recent.has(version)) return version
  return releases?.all.has(version) ? OLDER_RELEASES : null
}
