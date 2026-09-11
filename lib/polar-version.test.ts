import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
 * Three ways the pin can rot, all silent in production:
 *
 *   1. The copies drift. The version constant is duplicated per file
 *      (the api/ tree deliberately does not import from src/lib), so a
 *      partial bump leaves checkout creation on one contract and license
 *      validation on another.
 *   2. A call site loses its header while the constant stays declared.
 *      That endpoint silently follows Current again and changes contract
 *      at the next quarterly release.
 *   3. The pin outlives the version. An unknown version is that same
 *      `404 {"detail":"Not Found"}`, which is indistinguishable from "no
 *      such checkout" or "no such license key" at every call site, so a
 *      removed version does not surface as an outage: buyers get the
 *      "expired" page and licence holders are told their key is invalid.
 *
 * This test turns all three into a failing test run. NOTE: the repo has
 * no CI workflow and no git hooks, so nothing runs it automatically —
 * `pnpm test` before a deploy is what makes the deadline check useful.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Every file that pins a Polar API version, with the number of `fetch(`
 * calls it makes and the number of request header blocks that carry the
 * pin. The two differ where several fetches share one header object
 * (api/checkout/[id].ts builds `authHeaders` once and reuses it).
 *
 * Both counts are deliberate. A dropped header fails the header count;
 * a new Polar call fails the fetch count, which is the prompt to pin it
 * and update this map. Refactoring the header blocks (a shared helper,
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
 * When each pinned version stops being served, taken from Polar's own
 * announcement rather than from a guessed cadence: `2026-04` stays on
 * its contract while Deprecated and "is removed at the January 2027
 * quarterly release".
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
        `${file} now makes a different number of requests. Pin any new Polar call `
          + "with 'Polar-Version': POLAR_API_VERSION, then update PINNED_FILES.",
      ).toBe(fetchCalls)
    }
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
        + 'return 404 on every request, which this codebase reports as an expired '
        + 'checkout or an invalid license.',
    ).toBeLessThan(deadline)
  })
})
