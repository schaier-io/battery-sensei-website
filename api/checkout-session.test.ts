import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './checkout-session'

describe('checkout session currency', () => {
  beforeEach(() => {
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'test-token')
    vi.stubEnv('POLAR_PRODUCT_ID_SUPPORT', 'support-product')
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

    expect(response.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fails closed instead of mixing a new token with a legacy product', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_NEW', 'new-token')
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
})
