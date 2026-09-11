import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guards the `Polar-Version` pin.
 *
 * Polar versions its API by date (`YYYY-MM`) and keeps three versions
 * alive: Current, Deprecated and Next. A new one ships in the first week
 * of January, April, July and October, and each is supported for about
 * nine months. Requests without the header follow Current, so every
 * outbound Polar call in this repo pins an explicit version instead.
 *
 * Three ways that pin can rot, all silent in production:
 *
 *   1. The copies drift. The version constant is duplicated per file
 *      (the api/ tree deliberately does not import from src/lib), so a
 *      partial bump leaves checkout creation on one contract and license
 *      validation on another.
 *   2. A call site loses its header while the constant stays declared.
 *      That endpoint silently follows Current again and changes contract
 *      at the next quarterly release.
 *   3. The pin outlives the version. Polar answers an unknown version
 *      with `404 {"detail":"Not Found"}` and no `polar-version` response
 *      header — verified against the live API. A 404 is indistinguishable
 *      from "no such checkout" or "no such license key" at every call
 *      site, so a removed version does not surface as an outage: buyers
 *      get the "expired" page and licence holders are told their key is
 *      invalid.
 *
 * This test turns all three into a failing test run. NOTE: the repo has
 * no CI workflow and no git hooks, so nothing runs it automatically —
 * `pnpm test` before a deploy is what makes the deadline check useful.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Every file that pins a Polar API version, with the number of request
 * header blocks it must carry the pin in. The counts are deliberate: a
 * new Polar call has to come here and say so, and dropping the header
 * from one of two call sites in a file cannot pass unnoticed.
 */
const PINNED_FILES: ReadonlyArray<readonly [file: string, headerCount: number]> = [
  ['api/price.ts', 2],
  ['api/checkout-session.ts', 2],
  ['api/discount-availability.ts', 1],
  // One inline block plus the shared `authHeaders` object.
  ['api/checkout/[id].ts', 2],
  ['lib/feature-board.ts', 1],
  ['src/lib/polar-server.ts', 2],
]

/**
 * Months of support Polar gives a version: Current for two quarters,
 * then Deprecated until the following quarterly release. `2026-04` is
 * Current until `2026-10` ships on 2026-10-01 and is removed at the
 * January 2027 release.
 */
const SUPPORT_MONTHS = 9
/** Runway to test and migrate before the pinned version disappears. */
const BUMP_LEAD_MONTHS = 1

function sourceOf(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

function pinnedVersion(relativePath: string): string | null {
  const match = /const POLAR_API_VERSION = '([^']+)'/.exec(sourceOf(relativePath))
  return match?.[1] ?? null
}

function headerOccurrences(relativePath: string): number {
  return sourceOf(relativePath).match(/'Polar-Version': POLAR_API_VERSION,/g)?.length ?? 0
}

/**
 * Derived from the pin itself, never hand-maintained: a bumped pin moves
 * its own deadline, and moving the deadline without bumping the pin is
 * not possible.
 */
function bumpDeadline(version: string): number {
  const [year, month] = version.split('-').map(Number)
  return Date.UTC(year, month - 1 + SUPPORT_MONTHS - BUMP_LEAD_MONTHS, 1)
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

  it('sends the pin on every Polar request', () => {
    for (const [file, expected] of PINNED_FILES) {
      expect(
        headerOccurrences(file),
        `${file} should pass 'Polar-Version': POLAR_API_VERSION in ${expected} request `
          + 'header block(s). A Polar call without it follows whatever version is '
          + 'Current, which changes each quarter.',
      ).toBe(expected)
    }
  })

  it('has not outlived the pinned version', () => {
    const version = pinnedVersion(PINNED_FILES[0][0]) ?? ''
    const deadline = bumpDeadline(version)
    expect(
      Date.now(),
      `Polar version ${version} is due for a bump (deadline `
        + `${new Date(deadline).toISOString().slice(0, 10)}, removal about a month later). `
        + 'Test the next version against staging, then update POLAR_API_VERSION in '
        + `${PINNED_FILES.map(([file]) => file).join(', ')}. `
        + 'Leaving the pin stale makes Polar return 404 on every request, which this '
        + 'codebase reports as an expired checkout or an invalid license.',
    ).toBeLessThan(deadline)
  })
})
