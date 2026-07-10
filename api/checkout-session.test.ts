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
})
