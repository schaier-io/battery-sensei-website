import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './checkout-session'

describe('checkout session currency', () => {
  beforeEach(() => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'test-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', 'support-product')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('falls back to USD when the caller provides no currency', async () => {
    let polarPayload: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      polarPayload = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/session' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'support' }),
    }))

    expect(response.ok).toBe(true)
    expect(polarPayload?.currency).toBe('usd')
  })

  it('keeps an explicitly selected currency', async () => {
    let polarPayload: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      polarPayload = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/session' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'support', currency: 'EUR' }),
    }))

    expect(response.ok).toBe(true)
    expect(polarPayload?.currency).toBe('eur')
  })

  it('prefers the new organization token and product for new purchases', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', 'new-support-product')
    let authorization: string | null = null
    let polarPayload: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      authorization = new Headers(init?.headers).get('authorization')
      polarPayload = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/new-session' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'support' }),
    }))

    expect(response.ok).toBe(true)
    expect(authorization).toBe('Bearer new-token')
    expect(polarPayload?.products).toEqual(['new-support-product'])
  })

  it('resolves a new-organization discount without comparing it to the cache key', async () => {
    // Outside the Black Friday window, so only the launch code is looked up.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'new-lifetime-product')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'NEWCODE')
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/discounts')) {
        return new Response(JSON.stringify({
          items: [{ id: 'new-discount-id', code: 'newcode' }],
        }), { status: 200 })
      }
      const payload = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(payload.discount_id).toBe('new-discount-id')
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/new-session' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'lifetime' }),
    }))

    vi.useRealTimers()
    expect(response.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Both Polar calls carry the pinned API version. Asserted on the
    // recorded calls, not inside the mock: production wraps these fetches
    // in try/catch, which would swallow an assertion thrown in there.
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get('polar-version')).toBe('2026-04')
    }
  })

  it('fails closed instead of mixing a new token with a legacy product', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'support' }),
    }))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, reason: 'missing-config' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails closed instead of mixing a new product with a legacy token', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', '')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', 'new-support-product')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'support' }),
    }))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never creates a new purchase with a complete legacy pair', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', '')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT_NEW', '')
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'legacy-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT', 'legacy-support-product')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'support' }),
    }))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('auto-applies the Black Friday code to Lifetime inside the window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'new-lifetime-product')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'LAUNCHCODE')
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', 'BFCODE')
    let discountId: unknown
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const query = url.searchParams.get('query')
        const items = query === 'BFCODE' ? [{ id: 'bf-id', code: 'BFCODE' }] : [{ id: 'launch-id', code: 'LAUNCHCODE' }]
        return new Response(JSON.stringify({ items }), { status: 200 })
      }
      discountId = (JSON.parse(String(init?.body)) as Record<string, unknown>).discount_id
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'lifetime' }),
    }))
    vi.useRealTimers()

    expect(response.ok).toBe(true)
    expect(discountId).toBe('bf-id')
  })
  it('refuses checkout instead of falling back when the Black Friday lookup fails', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'new-lifetime-product')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'LAUNCHERR')
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', 'BFERR')
    const checkoutCalls: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        if (url.searchParams.get('query') === 'BFERR') return new Response('', { status: 429 })
        return new Response(JSON.stringify({ items: [{ id: 'launch-id', code: 'LAUNCHERR' }] }), { status: 200 })
      }
      checkoutCalls.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'lifetime' }),
    }))
    vi.useRealTimers()

    expect(response.status).toBe(503)
    expect(checkoutCalls).toEqual([])
  })

  it('falls back to the launch code when Polar has no Black Friday code', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'new-lifetime-product')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'LAUNCHMISS')
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', 'BFMISS')
    let discountId: unknown
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const items = url.searchParams.get('query') === 'LAUNCHMISS' ? [{ id: 'launch-id', code: 'LAUNCHMISS' }] : []
        return new Response(JSON.stringify({ items }), { status: 200 })
      }
      discountId = (JSON.parse(String(init?.body)) as Record<string, unknown>).discount_id
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'lifetime' }),
    }))
    vi.useRealTimers()

    expect(response.ok).toBe(true)
    expect(discountId).toBe('launch-id')
  })

  it('does not retry at full price when Polar rejects the Black Friday code', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'new-lifetime-product')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', 'LAUNCH422')
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', 'BF422')
    const checkoutCalls: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        return new Response(JSON.stringify({ items: [{ id: 'bf-422-id', code: 'BF422' }] }), { status: 200 })
      }
      checkoutCalls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response('{}', { status: 422 })
    }))

    const response = await POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'lifetime' }),
    }))
    vi.useRealTimers()

    expect(response.status).toBe(503)
    expect(checkoutCalls.map((c) => c.discount_id)).toEqual(['bf-422-id'])
  })
  function stubLifetime(suffix: string, now: string) {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(now))
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
    vi.stubEnv('POLAR_PRODUCT_ID_LIFETIME_NEW', 'new-lifetime-product')
    vi.stubEnv('POLAR_DISCOUNT_CODE_NEW', `LAUNCH${suffix}`)
    vi.stubEnv('POLAR_DISCOUNT_CODE_BLACKFRIDAY_NEW', `BF${suffix}`)
  }

  function postLifetime(extra: Record<string, unknown> = {}) {
    return POST(new Request('https://battery-sensei.app/api/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'lifetime', ...extra }),
    }))
  }

  it('ignores a typed Black Friday code after the sale', async () => {
    stubLifetime('LATE', '2026-12-03T12:00:00Z')
    const checkoutCalls: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const q = url.searchParams.get('query') ?? ''
        return new Response(JSON.stringify({ items: [{ id: `${q}-id`, code: q }] }), { status: 200 })
      }
      checkoutCalls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await postLifetime({ discountCode: 'bflate' })
    vi.useRealTimers()

    expect(response.ok).toBe(true)
    expect(checkoutCalls.map((c) => c.discount_id)).toEqual(['LAUNCHLATE-id'])
  })

  it('does not retry at full price when a typed Black Friday code is rejected', async () => {
    stubLifetime('TYPED', '2026-11-28T12:00:00Z')
    const checkoutCalls: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        return new Response(JSON.stringify({ items: [{ id: 'bf-typed-id', code: 'BFTYPED' }] }), { status: 200 })
      }
      checkoutCalls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response('{}', { status: 422 })
    }))

    const response = await postLifetime({ discountCode: 'BFTYPED' })
    vi.useRealTimers()

    expect(response.status).toBe(503)
    expect(checkoutCalls.map((c) => c.discount_id)).toEqual(['bf-typed-id'])
  })

  it('treats a Black Friday match without an id as a failed lookup', async () => {
    stubLifetime('NOID', '2026-11-28T12:00:00Z')
    const checkoutCalls: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const q = url.searchParams.get('query')
        const items = q === 'BFNOID' ? [{ code: 'BFNOID' }] : [{ id: 'launch-id', code: 'LAUNCHNOID' }]
        return new Response(JSON.stringify({ items }), { status: 200 })
      }
      checkoutCalls.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await postLifetime()
    vi.useRealTimers()

    expect(response.status).toBe(503)
    expect(checkoutCalls).toEqual([])
  })
  it('falls back to the launch code when a typed Black Friday code is missing in Polar', async () => {
    stubLifetime('TMISS', '2026-11-28T12:00:00Z')
    let discountId: unknown
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const items = url.searchParams.get('query') === 'LAUNCHTMISS' ? [{ id: 'launch-id', code: 'LAUNCHTMISS' }] : []
        return new Response(JSON.stringify({ items }), { status: 200 })
      }
      discountId = (JSON.parse(String(init?.body)) as Record<string, unknown>).discount_id
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await postLifetime({ discountCode: 'BFTMISS' })
    vi.useRealTimers()

    expect(response.ok).toBe(true)
    expect(discountId).toBe('launch-id')
  })

  it('treats malformed discount rows as a failed Black Friday lookup', async () => {
    stubLifetime('ROWS', '2026-11-28T12:00:00Z')
    const checkoutCalls: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/discounts')) {
        const items = url.searchParams.get('query') === 'BFROWS' ? [{}] : [{ id: 'launch-id', code: 'LAUNCHROWS' }]
        return new Response(JSON.stringify({ items }), { status: 200 })
      }
      checkoutCalls.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ url: 'https://buy.polar.sh/s' }), { status: 201 })
    }))

    const response = await postLifetime()
    vi.useRealTimers()

    expect(response.status).toBe(503)
    expect(checkoutCalls).toEqual([])
  })
})
