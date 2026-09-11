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
 * Two ways that pin can rot, both silent in production:
 *
 *   1. The copies drift. The version constant is duplicated per file
 *      (the api/ tree deliberately does not import from src/lib), so a
 *      partial bump leaves checkout creation on one contract and license
 *      validation on another.
 *   2. The pin outlives the version. Polar answers an unknown version
 *      with `404 {"detail":"Not Found"}` and no `polar-version` response
 *      header — verified against the live API. A 404 is indistinguishable
 *      from "no such checkout" or "no such license key" at every call
 *      site, so a removed version does not surface as an outage: buyers
 *      get the "expired" page and licence holders are told their key is
 *      invalid.
 *
 * This test turns both into a red build.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/** Every file that pins a Polar API version. */
const PINNED_FILES = [
  'api/price.ts',
  'api/checkout-session.ts',
  'api/discount-availability.ts',
  'api/checkout/[id].ts',
  'lib/feature-board.ts',
  'src/lib/polar-server.ts',
]

/**
 * Bump-by date for the version currently pinned. `2026-04` becomes
 * Deprecated when `2026-10` ships on 2026-10-01 and is removed at the
 * January 2027 release, so this leaves a month of runway to test and
 * migrate. Move it forward together with the pin.
 */
const BUMP_DEADLINE = Date.parse('2026-12-01T00:00:00Z')

function pinnedVersion(relativePath: string): string | null {
  const source = readFileSync(join(repoRoot, relativePath), 'utf8')
  const match = /const POLAR_API_VERSION = '([^']+)'/.exec(source)
  return match?.[1] ?? null
}

describe('Polar API version pin', () => {
  it('pins the same version in every file that calls Polar', () => {
    const versions = PINNED_FILES.map((file) => [file, pinnedVersion(file)] as const)
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

  it('has not outlived the pinned version', () => {
    const version = pinnedVersion(PINNED_FILES[0])
    expect(
      Date.now(),
      `Polar version ${version} is due for a bump. Test the next version `
        + '(send Polar-Version: <next> against staging), update the constant in '
        + `${PINNED_FILES.join(', ')}, then move BUMP_DEADLINE forward. `
        + 'Leaving the pin stale makes Polar return 404 on every request, which '
        + 'this codebase reports as an expired checkout or an invalid license.',
    ).toBeLessThan(BUMP_DEADLINE)
  })
})
