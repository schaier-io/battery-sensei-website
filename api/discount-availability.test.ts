import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './discount-availability'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GET /api/discount-availability organization migration', () => {
  it('ignores an empty new token and uses the legacy token', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', '')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'NEWCODE')
    vi.stubEnv('POLAR_DISCOUNT_CODE', 'LEGACYCODE')
    let authorization: string | null = null
    let query: string | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      authorization = new Headers(init?.headers).get('authorization')
      query = new URL(String(input)).searchParams.get('query')
      return new Response(JSON.stringify({
        items: [{ code: 'legacycode', redemptions_count: 12, max_redemptions: 500 }],
      }), { status: 200 })
    }))

    const response = await GET(new Request('https://battery-sensei.app/api/discount-availability'))
    const body = await response.json() as Record<string, unknown>

    expect(authorization).toBe('Bearer legacy-token')
    expect(query).toBe('LEGACYCODE')
    expect(body).toMatchObject({ ok: true, used: 12, max: 500, remaining: 488 })
  })
})
