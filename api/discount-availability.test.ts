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
