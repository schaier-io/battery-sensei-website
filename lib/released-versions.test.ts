import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCEPTED_RELEASE_COUNT, parseReleases } from './released-versions'

const item = (version: string) =>
  `<item><sparkle:shortVersionString>${version}</sparkle:shortVersionString></item>`
const appcastOf = (versions: string[]) => versions.map(item).join('')

describe('parseReleases', () => {
  it('orders by version number, not text, and drops non-release strings', () => {
    const { recent, all } = parseReleases(appcastOf(['1.9.0', '1.10.0', '1.10.0', '2.0.0-beta', ' 1.2.3 ']))
    expect([...recent]).toEqual(['1.10.0', '1.9.0', '1.2.3'])
    expect(all.has('2.0.0-beta')).toBe(false)
  })

  it(`keeps the newest ${ACCEPTED_RELEASE_COUNT} as recent, whatever the appcast order`, () => {
    const versions = Array.from({ length: ACCEPTED_RELEASE_COUNT + 5 }, (_, i) => `1.${i}.0`)
    const { recent, all } = parseReleases(appcastOf(versions.reverse()))
    expect(recent.size).toBe(ACCEPTED_RELEASE_COUNT)
    expect(recent.has(`1.${ACCEPTED_RELEASE_COUNT + 4}.0`)).toBe(true)
    expect(recent.has('1.4.0')).toBe(false)
    expect(all.has('1.4.0')).toBe(true)
  })
})

describe('releaseBucket', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.resetModules()
  })

  async function freshModule() {
    vi.resetModules()
    return import('./released-versions')
  }

  it('names a recent release, buckets an older one, and drops an unreleased one', async () => {
    const versions = Array.from({ length: ACCEPTED_RELEASE_COUNT + 1 }, (_, i) => `1.${i}.0`)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(appcastOf(versions))))
    const { releaseBucket, OLDER_RELEASES } = await freshModule()
    expect(await releaseBucket(`1.${ACCEPTED_RELEASE_COUNT}.0`)).toBe(`1.${ACCEPTED_RELEASE_COUNT}.0`)
    expect(await releaseBucket('1.0.0')).toBe(OLDER_RELEASES)
    expect(await releaseBucket('9.9.9')).toBeNull()
  })

  it('counts nothing while the appcast has never been readable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    const { releaseBucket } = await freshModule()
    expect(await releaseBucket('1.21.1')).toBeNull()
  })

  it('retries a failed first fetch after a minute, not after the whole cache period', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-12T12:00:00Z'), toFake: ['Date'] })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValue(new Response(item('1.21.1')))
    vi.stubGlobal('fetch', fetchMock)
    const { releaseBucket } = await freshModule()
    expect(await releaseBucket('1.21.1')).toBeNull()

    vi.setSystemTime(new Date('2026-11-12T12:01:01Z'))
    expect(await releaseBucket('1.21.1')).toBe('1.21.1')
  })

  it('shares one appcast fetch between concurrent callers', async () => {
    const fetchMock = vi.fn(async () => new Response(item('1.21.1')))
    vi.stubGlobal('fetch', fetchMock)
    const { releaseBucket } = await freshModule()
    expect(await Promise.all([releaseBucket('1.21.1'), releaseBucket('1.21.1')])).toEqual(['1.21.1', '1.21.1'])
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
