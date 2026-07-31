import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './price'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GET /api/price organization migration', () => {
  it('does not mix a new token with legacy products', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT', 'legacy-support')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/price?country=ZZ'))
    const body = await response.json() as Record<string, unknown>

    expect(body.ok).toBe(false)
    expect(body.reason).toBe('unconfigured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not mix a new product with the legacy token', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', 'new-support')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/price?country=ZY'))
    const body = await response.json() as Record<string, unknown>

    expect(body.ok).toBe(false)
    expect(body.reason).toBe('unconfigured')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
