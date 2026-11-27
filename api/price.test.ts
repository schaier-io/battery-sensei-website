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

  it('does not preview a complete legacy sales configuration', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', '')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', '')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT', 'legacy-support')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('https://battery-sensei.app/api/price?country=ZX'))
    const body = await response.json() as Record<string, unknown>

    expect(body.ok).toBe(false)
    expect(body.reason).toBe('unconfigured')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/price Black Friday campaign', () => {
  function stubPolar(lookup: (query: string) => Response) {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) return lookup(url.searchParams.get('query') ?? '')
      const body = JSON.parse(String(init?.body)) as { discount_id?: string }
      const total = body.discount_id === 'bf-id' ? 1000 : body.discount_id === 'launch-id' ? 1700 : 2000
      return new Response(
        JSON.stringify({ total_amount: total, subtotal_amount: total, tax_amount: 0, currency: 'usd' }),
        { status: 201 },
      )
    }))
  }

  function configure(suffix: string) {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', 'support')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'lifetime')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', `LAUNCH${suffix}`)
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', `BF${suffix}`)
  }

  async function lifetimeFor(country: string) {
    const response = await GET(new Request(`https://battery-sensei.app/api/price?country=${country}`))
    vi.useRealTimers()
    const body = (await response.json()) as { lifetime?: Record<string, unknown> }
    return body.lifetime
  }

  it('reports the Black Friday campaign and code when Polar applies it', async () => {
    configure('A')
    stubPolar((q) => new Response(JSON.stringify({ items: q === 'BFA' ? [{ id: 'bf-id', code: 'BFA' }] : [] }), { status: 200 }))

    const lifetime = await lifetimeFor('US')

    expect(lifetime?.campaign).toBe('black-friday')
    expect(lifetime?.code).toBe('BFA')
    expect(lifetime?.discounted_amount).toBe(1000)
  })

  it('quotes the launch code without a campaign when Black Friday is missing in Polar', async () => {
    configure('B')
    stubPolar((q) => new Response(JSON.stringify({ items: q === 'LAUNCHB' ? [{ id: 'launch-id', code: 'LAUNCHB' }] : [] }), { status: 200 }))

    const lifetime = await lifetimeFor('CA')

    expect(lifetime?.campaign).toBeNull()
    expect(lifetime?.code).toBe('LAUNCHB')
  })

  it('does not quote the launch code when the Black Friday lookup fails', async () => {
    configure('C')
    stubPolar((q) =>
      q === 'BFC'
        ? new Response('', { status: 429 })
        : new Response(JSON.stringify({ items: [{ id: 'launch-id', code: 'LAUNCHC' }] }), { status: 200 }),
    )

    const lifetime = await lifetimeFor('MX')

    expect(lifetime?.campaign).toBeNull()
    expect(lifetime?.code).toBeNull()
    expect(lifetime?.has_discount).toBe(false)
  })
  it('does not call a discount under half price Black Friday', async () => {
    configure('D')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        return new Response(JSON.stringify({ items: [{ id: 'bf-d-id', code: 'BFD' }] }), { status: 200 })
      }
      const body = JSON.parse(String(init?.body)) as { discount_id?: string }
      const total = body.discount_id ? 1500 : 2000
      return new Response(JSON.stringify({ total_amount: total, subtotal_amount: total, tax_amount: 0, currency: 'usd' }), { status: 201 })
    }))

    const lifetime = await lifetimeFor('BR')

    expect(lifetime?.has_discount).toBe(true)
    expect(lifetime?.campaign).toBeNull()
  })

  it('asks Polar again within minutes for a Black Friday quote', async () => {
    configure('E')
    stubPolar((q) => new Response(JSON.stringify({ items: q === 'BFE' ? [{ id: 'bf-id', code: 'BFE' }] : [] }), { status: 200 }))
    const fetchMock = vi.mocked(fetch)

    await GET(new Request('https://battery-sensei.app/api/price?country=AR'))
    const callsAfterFirst = fetchMock.mock.calls.length
    vi.setSystemTime(new Date('2026-11-28T12:06:00Z'))
    await GET(new Request('https://battery-sensei.app/api/price?country=AR'))
    vi.useRealTimers()

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst)
  })
})
