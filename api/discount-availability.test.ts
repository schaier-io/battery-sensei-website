import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './discount-availability'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GET /api/discount-availability organization migration', () => {
  it('never reads the legacy discount count', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', '')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'NEWCODE')
    vi.stubEnv('POLAR_DISCOUNT_CODE', 'LEGACYCODE')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/discount-availability'))
    const body = await response.json() as Record<string, unknown>

    expect(body).toMatchObject({ ok: false, reason: 'no-token' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/discount-availability during Black Friday', () => {
  it('falls back to the launch code when Polar does not know the Black Friday code', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'ZENMODE')
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', 'BLACKFRIDAY')
    const fetchMock = vi.fn(async (input: URL | string) => {
      const query = new URL(String(input)).searchParams.get('query')
      const items = query === 'ZENMODE'
        ? [{ code: 'ZENMODE', redemptions_count: 12, max_redemptions: 500 }]
        : []
      return new Response(JSON.stringify({ items }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/discount-availability'))
    const body = await response.json() as Record<string, unknown>
    vi.useRealTimers()

    expect(body).toMatchObject({ ok: true, used: 12, max: 500 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
