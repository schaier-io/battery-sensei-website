import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guards the `Polar-Version` pin.
 *
 * Polar versions its API by date (`YYYY-MM`). A request without the
 * header follows whichever version is Current, and Current changes at
 * each quarterly release, so every outbound Polar call in this repo
 * pins an explicit version instead. Probing the live API on 2026-09-11
 * showed exactly two versions in service — `2026-04` (Current, also
 * what an unpinned request gets) and `2026-10` (Next) — and every other
 * `YYYY-MM` answering `404 {"detail":"Not Found"}`.
 *
 * Three ways the pin can rot, none of which names itself in
 * production:
 *
 *   1. The copies drift. The version constant is duplicated per file
 *      (the api/ tree deliberately does not import from src/lib), so a
 *      partial bump leaves checkout creation on one contract and license
 *      validation on another.
 *   2. A call site loses its header while the constant stays declared.
 *      That endpoint silently follows Current again and changes contract
 *      at the next quarterly release.
 *   3. The pin outlives the version. An unknown version is that same
 *      `404 {"detail":"Not Found"}`, and no call site can tell it apart
 *      from a normal failure. api/checkout-session.ts logs
 *      `polar non-2xx` and answers 502, so purchases stop with the cause
 *      only in the function log; api/price.ts logs the same and serves
 *      static fallback prices. The rest say nothing at all:
 *      api/discount-availability.ts returns `polar-error`, which hides
 *      the scarcity bar; api/checkout/[id].ts and src/lib/polar-server.ts
 *      read the 404 as "no such checkout" and show the expired page; and
 *      lib/feature-board.ts reads it as "invalid license".
 *
 * This test turns all three into a failing test run. NOTE: the repo has
 * no CI workflow and no git hooks, so nothing runs it automatically —
 * `pnpm test` before a deploy is what makes the deadline check useful.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Every file that pins a Polar API version, with the number of `fetch(`
 * call sites it contains and the number of request header blocks that
 * carry the pin. The two differ where several fetches share one header
 * object (api/checkout/[id].ts builds `authHeaders` once and reuses it).
 * Call sites, not requests: api/checkout-session.ts re-invokes one of
 * its fetches when Polar rejects the discount.
 *
 * Both counts are deliberate. A dropped header fails the header count;
 * a new call site fails the fetch count, which is the prompt to pin it
 * if it talks to Polar. Refactoring the header blocks (a shared helper,
 * say) also fails here: update the counts once you have checked the pin
 * still reaches every call.
 */
const PINNED_FILES: ReadonlyArray<
  readonly [file: string, fetchCalls: number, headerBlocks: number]
> = [
  ['api/price.ts', 2, 2],
  ['api/checkout-session.ts', 2, 2],
  ['api/discount-availability.ts', 1, 1],
  ['api/checkout/[id].ts', 5, 2],
  ['lib/feature-board.ts', 1, 1],
  ['src/lib/polar-server.ts', 2, 2],
]

/**
 * When each pinned version stops being served. Polar names a release,
 * not a day: `2026-04` keeps its contract while Deprecated and is
 * removed at the January 2027 quarterly release, and releases land in
 * the first week of the month. So this date is the conservative first
 * of that month, not a date Polar published. Read the release notes for
 * the next one rather than extrapolating a cadence from this entry.
 *
 * Keyed by version, so bumping the pin without recording the new
 * version's removal date fails, and nobody can push the deadline out
 * without naming the version it belongs to. Add the next entry from
 * Polar's release notes when you bump.
 */
const VERSION_REMOVED_AT: Record<string, string> = {
  '2026-04': '2027-01-01',
}

/** Runway to test and migrate before the pinned version disappears. */
const BUMP_LEAD_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Server-side trees that may hold a Polar caller. Everything here that
 * names the Polar API has to be classified: pinned above, or listed as a
 * non-caller below.
 */
const SCANNED_DIRS = ['api', 'lib', 'src']

/** Matches a reference to the Polar REST API, in code or in a comment. */
const POLAR_REFERENCE = /POLAR_API_BASE|api\.polar\.sh/

/**
 * Files that name the Polar API but send it nothing: PolarInlineCheckout
 * compares the embed iframe's origin, use-polar-embed documents the
 * session URL its own /api call returns. Neither issues a request, so
 * neither can carry a header.
 */
const NON_CALLERS = [
  'src/components/PolarInlineCheckout.tsx',
  'src/lib/use-polar-embed.ts',
]

/** Files that assert the pinned value on the wire; bump them together. */
const WIRE_ASSERTION_FILES = [
  'api/checkout-session.test.ts',
  'api/checkout-id.test.ts',
]

function sourceOf(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

function pinnedVersion(relativePath: string): string | null {
  const match = /const POLAR_API_VERSION = '([^']+)'/.exec(sourceOf(relativePath))
  return match?.[1] ?? null
}

function countMatches(relativePath: string, pattern: RegExp): number {
  return sourceOf(relativePath).match(pattern)?.length ?? 0
}

/** Every .ts/.tsx source under `dir`, tests excluded, repo-relative. */
function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(join(repoRoot, dir), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue
    const absolute = join(entry.parentPath, entry.name)
    found.push(relative(repoRoot, absolute).split(sep).join('/'))
  }
  return found
}

describe('Polar API version pin', () => {
  it('pins the same version in every file that calls Polar', () => {
    const versions = PINNED_FILES.map(([file]) => [file, pinnedVersion(file)] as const)
    for (const [file, version] of versions) {
      expect(version, `${file} has no POLAR_API_VERSION constant`).not.toBeNull()
      expect(version, `${file} pins a malformed version`).toMatch(/^\d{4}-\d{2}$/)
    }
    const distinct = new Set(versions.map(([, version]) => version))
    expect(
      distinct.size,
      `Polar version pins drifted: ${versions.map(([f, v]) => `${f}=${v}`).join(', ')}`,
    ).toBe(1)
  })

  it('keeps the pin on every Polar request', () => {
    for (const [file, fetchCalls, headerBlocks] of PINNED_FILES) {
      expect(
        countMatches(file, /['"]Polar-Version['"]\s*:\s*POLAR_API_VERSION/g),
        `${file} should carry the pin in ${headerBlocks} request header block(s). `
          + 'A Polar call without it follows whatever version is Current, which '
          + 'changes each quarter. If you refactored the header blocks, check the '
          + 'pin still reaches every call and update PINNED_FILES.',
      ).toBe(headerBlocks)
      expect(
        countMatches(file, /\bfetch\(/g),
        `${file} has a different number of fetch( call sites. If the new one talks `
          + "to Polar, pin it with 'Polar-Version': POLAR_API_VERSION. Either way, "
          + 'update PINNED_FILES.',
      ).toBe(fetchCalls)
    }
  })

  it('knows about every file that talks to Polar', () => {
    const referencing = SCANNED_DIRS
      .flatMap(sourceFiles)
      .filter((file) => POLAR_REFERENCE.test(sourceOf(file)))
      .sort()
    const classified = [...PINNED_FILES.map(([file]) => file), ...NON_CALLERS].sort()
    expect(
      referencing,
      'A file references the Polar API without being classified here. If it sends '
        + "a request, pin it with 'Polar-Version': POLAR_API_VERSION and add it to "
        + 'PINNED_FILES; if it only names the API, add it to NON_CALLERS.',
    ).toEqual(classified)
  })

  it('has not outlived the pinned version', () => {
    const version = pinnedVersion(PINNED_FILES[0][0]) ?? ''
    const removedAt = VERSION_REMOVED_AT[version]
    expect(
      removedAt,
      `No removal date recorded for Polar version ${version}. Take it from Polar's `
        + 'release notes (a version is removed at a quarterly release) and add it to '
        + 'VERSION_REMOVED_AT.',
    ).toBeDefined()
    const deadline = Date.parse(`${removedAt}T00:00:00Z`) - BUMP_LEAD_MS
    expect(
      Date.now(),
      `Polar version ${version} is removed on ${removedAt}. Test the next version `
        + 'against staging, then update POLAR_API_VERSION in '
        + `${PINNED_FILES.map(([file]) => file).join(', ')} and the asserted value in `
        + `${WIRE_ASSERTION_FILES.join(', ')}. Leaving the pin stale makes Polar `
        + 'return 404 on every request: checkout creation answers 502, the license '
        + 'paths report an expired checkout or an invalid license.',
    ).toBeLessThan(deadline)
  })
})
