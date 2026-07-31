import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './checkout/[id]'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GET /api/checkout/[id] organization migration', () => {
  it('falls back to the legacy token for an old checkout id', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_CUSTOMER_PORTAL_URL_NEW', 'https://polar.sh/new/portal')
    vi.stubEnv('POLAR_CUSTOMER_PORTAL_URL', 'https://polar.sh/legacy/portal')
    const authorizations: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('authorization') ?? ''
      authorizations.push(authorization)
      if (authorization === 'Bearer new-token') {
        return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 })
      }
      return new Response(JSON.stringify({
        id: 'checkout-old',
        created_at: new Date().toISOString(),
        customer_email: 'buyer@example.com',
        license_key: { key: 'OLD-LICENSE-KEY' },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }))

    const response = await GET(new Request('https://battery-sensei.app/api/checkout/checkout-old'))
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body.licenseKey).toBe('OLD-LICENSE-KEY')
    expect(body.customerPortalUrl).toBe('https://polar.sh/legacy/portal')
    expect(authorizations).toEqual(['Bearer new-token', 'Bearer legacy-token'])
  })

  it('does not use the legacy token for a transient new-org failure', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ detail: 'Unavailable' }), { status: 503 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/checkout/checkout-new'))

    expect(response.status).toBe(410)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not hide a new-token permission failure behind legacy fallback', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ detail: 'Forbidden' }), { status: 403 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/checkout/checkout-new'))

    expect(response.status).toBe(410)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
