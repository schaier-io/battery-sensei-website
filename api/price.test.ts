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
  function stubPolar(lookup: (query: string, url: URL) => Response) {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) return lookup(url.searchParams.get('query') ?? '', url)
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

  it('quotes the launch code with the launch campaign when Black Friday is missing in Polar', async () => {
    configure('B')
    stubPolar((q) => new Response(JSON.stringify({ items: q === 'LAUNCHB' ? [{ id: 'launch-id', code: 'LAUNCHB' }] : [] }), { status: 200 }))

    const lifetime = await lifetimeFor('CA')

    expect(lifetime?.campaign).toBe('launch')
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
  it('caches a settled launch quote for a day outside the sale', async () => {
    configure('S')
    vi.setSystemTime(new Date('2026-12-05T12:00:00Z'))
    stubPolar((q) => new Response(JSON.stringify({ items: q === 'LAUNCHS' ? [{ id: 'launch-id', code: 'LAUNCHS' }] : [] }), { status: 200 }))
    const fetchMock = vi.mocked(fetch)

    await GET(new Request('https://battery-sensei.app/api/price?country=EC'))
    const callsAfterFirst = fetchMock.mock.calls.length
    vi.setSystemTime(new Date('2026-12-06T11:00:00Z'))
    await GET(new Request('https://battery-sensei.app/api/price?country=EC'))
    const callsAfter23h = fetchMock.mock.calls.length
    vi.setSystemTime(new Date('2026-12-06T13:00:00Z'))
    await GET(new Request('https://battery-sensei.app/api/price?country=EC'))
    vi.useRealTimers()

    expect(callsAfterFirst).toBeGreaterThan(0)
    expect(callsAfter23h).toBe(callsAfterFirst)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfter23h)
  })

  it('does not call a 49% discount half price', async () => {
    configure('F')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        return new Response(JSON.stringify({ items: [{ id: 'bf-f-id', code: 'BFF' }] }), { status: 200 })
      }
      const body = JSON.parse(String(init?.body)) as { discount_id?: string }
      const total = body.discount_id ? 1020 : 2000
      return new Response(JSON.stringify({ total_amount: total, subtotal_amount: total, tax_amount: 0, currency: 'usd' }), { status: 201 })
    }))

    const lifetime = await lifetimeFor('CL')

    expect(lifetime?.campaign).toBeNull()
  })

  it('does not treat malformed discount rows as a missing Black Friday code', async () => {
    configure('G')
    stubPolar((q) =>
      q === 'BFG'
        ? new Response(JSON.stringify({ items: [{}] }), { status: 200 })
        : new Response(JSON.stringify({ items: [{ id: 'launch-id', code: 'LAUNCHG' }] }), { status: 200 }),
    )

    const lifetime = await lifetimeFor('PE')

    expect(lifetime?.code).toBeNull()
    expect(lifetime?.has_discount).toBe(false)
  })
  it('quotes the launch code when Polar rejects the Black Friday code', async () => {
    configure('H')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const q = url.searchParams.get('query') ?? ''
        return new Response(JSON.stringify({ items: [{ id: `${q}-id`, code: q }] }), { status: 200 })
      }
      const body = JSON.parse(String(init?.body)) as { discount_id?: string }
      if (body.discount_id === 'BFH-id') return new Response('{}', { status: 422 })
      const total = body.discount_id === 'LAUNCHH-id' ? 1700 : 2000
      return new Response(JSON.stringify({ total_amount: total, subtotal_amount: total, tax_amount: 0, currency: 'usd' }), { status: 201 })
    }))

    const lifetime = await lifetimeFor('UY')

    expect(lifetime?.code).toBe('LAUNCHH')
    expect(lifetime?.campaign).toBe('launch')
    expect(lifetime?.discounted_amount).toBe(1700)
  })
  it('asks Polar for the full price once when every code is rejected', async () => {
    configure('J')
    const lifetimeCalls: Array<string | undefined> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const q = url.searchParams.get('query') ?? ''
        return new Response(JSON.stringify({ items: [{ id: `${q}-id`, code: q }] }), { status: 200 })
      }
      const body = JSON.parse(String(init?.body)) as { product_id: string; discount_id?: string }
      if (body.product_id === 'lifetime') lifetimeCalls.push(body.discount_id)
      if (body.discount_id) return new Response('{}', { status: 422 })
      return new Response(JSON.stringify({ total_amount: 2000, subtotal_amount: 2000, tax_amount: 0, currency: 'usd' }), { status: 201 })
    }))

    const lifetime = await lifetimeFor('PY')

    expect(lifetime?.has_discount).toBe(false)
    expect(lifetime?.campaign).toBeNull()
    expect(lifetimeCalls.filter((id) => id === undefined)).toHaveLength(1)
    expect(lifetimeCalls.filter(Boolean)).toEqual(['BFJ-id', 'LAUNCHJ-id'])
  })

  it('does not loop when Polar answers a preview with a non-object body', async () => {
    configure('K')
    let checkoutPosts = 0
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const q = url.searchParams.get('query') ?? ''
        return new Response(JSON.stringify({ items: [{ id: `${q}-id`, code: q }] }), { status: 200 })
      }
      checkoutPosts++
      const body = JSON.parse(String(init?.body)) as { discount_id?: string }
      if (body.discount_id) return new Response(JSON.stringify('rejected'), { status: 200 })
      return new Response(JSON.stringify({ total_amount: 2000, subtotal_amount: 2000, tax_amount: 0, currency: 'usd' }), { status: 201 })
    }))

    await lifetimeFor('BO')

    expect(checkoutPosts).toBe(3)
  })

  it('finds the Black Friday code next to a codeless discount row', async () => {
    configure('N')
    stubPolar((q) =>
      new Response(
        JSON.stringify({
          items: q === 'BFN' ? [{ id: 'codeless-id', code: null }, { id: 'bf-id', code: 'BFN' }] : [],
        }),
        { status: 200 },
      ),
    )

    const lifetime = await lifetimeFor('UY')

    expect(lifetime?.campaign).toBe('black-friday')
    expect(lifetime?.discounted_amount).toBe(1000)
  })

  it('finds the Black Friday code on the second page of discounts', async () => {
    configure('P')
    stubPolar((q, url) => {
      if (q !== 'BFP') return new Response(JSON.stringify({ items: [] }), { status: 200 })
      const page = url.searchParams.get('page')
      const items =
        page === '2'
          ? [{ id: 'bf-id', code: 'BFP' }]
          : Array.from({ length: 100 }, (_, i) => ({ id: `other-${i}`, code: `BFP${i}` }))
      return new Response(JSON.stringify({ items, pagination: { max_page: 2 } }), { status: 200 })
    })

    const lifetime = await lifetimeFor('PY')

    expect(lifetime?.campaign).toBe('black-friday')
    expect(lifetime?.discounted_amount).toBe(1000)
  })

  function pagedLookup(code: string, pages: (page: number) => { items: unknown[]; max_page: number }) {
    const pagesRead: number[] = []
    stubPolar((q, url) => {
      if (q !== code) return new Response(JSON.stringify({ items: [{ id: 'launch-id', code: q }] }), { status: 200 })
      const page = Number(url.searchParams.get('page'))
      pagesRead.push(page)
      const { items, max_page } = pages(page)
      return new Response(JSON.stringify({ items, pagination: { max_page } }), { status: 200 })
    })
    return pagesRead
  }

  const otherRows = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, code: `${prefix}${i}` }))

  it('treats a result longer than the page cap as a failed lookup', async () => {
    configure('Q')
    const pagesRead = pagedLookup('BFQ', () => ({ items: otherRows(100, 'BFQ'), max_page: 7 }))

    const lifetime = await lifetimeFor('EC')

    expect(pagesRead).toEqual([1, 2, 3, 4, 5])
    expect(lifetime?.code).toBeNull()
    expect(lifetime?.has_discount).toBe(false)
  })

  it('follows max_page when Polar returns fewer rows than the page limit', async () => {
    configure('R')
    const pagesRead = pagedLookup('BFR', (page) =>
      page === 1 ? { items: otherRows(50, 'BFR'), max_page: 2 } : { items: [{ id: 'bf-id', code: 'BFR' }], max_page: 2 },
    )

    const lifetime = await lifetimeFor('VE')

    expect(pagesRead).toEqual([1, 2])
    expect(lifetime?.campaign).toBe('black-friday')
  })

  it('reports missing after a full last page without a match', async () => {
    configure('S')
    const pagesRead = pagedLookup('BFS', () => ({ items: otherRows(100, 'BFS'), max_page: 2 }))

    const lifetime = await lifetimeFor('GY')

    expect(pagesRead).toEqual([1, 2])
    expect(lifetime?.code).toBe('LAUNCHS')
  })
})
