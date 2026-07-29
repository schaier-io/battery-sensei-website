import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  })
  return {
    mockPrisma: {
      featureRequest: model(),
      featureVote: model(),
      licenseVoter: model(),
      adminLoginAttempt: model(),
      $transaction: vi.fn(),
    },
  }
})

vi.mock('../lib/db.js', () => ({ prisma: mockPrisma, db: mockPrisma }))

import { GET, POST } from './feature-requests/index'

const ORIGIN = 'https://battery-sensei.app'

function submitRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/feature-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  title: 'Menu bar percentage badge',
  body: 'Show the battery percentage directly in the menu bar icon so I can see it at a glance.',
  email: 'user@example.com',
  source: 'web',
}

function stubBatchOk(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ data: [{ id: 'em_1' }, { id: 'em_2' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 'test-resend')
  vi.stubEnv('CONTACT_INBOX_TO', 'inbox@battery-sensei.app')
  vi.stubEnv('CONTACT_INBOX_FROM', 'Battery Sensei <contact@battery-sensei.app>')
  mockPrisma.featureRequest.count.mockReset()
  mockPrisma.featureRequest.count.mockResolvedValue(0)
  mockPrisma.featureRequest.create.mockResolvedValue({ id: 'req_1' })
  mockPrisma.featureRequest.update.mockResolvedValue({ id: 'req_1' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('GET /api/feature-requests', () => {
  it('returns public copy, votes, and no submitter data', async () => {
    mockPrisma.featureRequest.findMany.mockResolvedValue([
      {
        id: 'a'.repeat(24),
        title: 'Original title',
        body: 'Original body',
        publicTitle: 'Edited title',
        publicBody: null,
        status: 'open',
        votesCount: 7,
        createdAt: new Date('2026-07-01T00:00:00Z'),
      },
    ])
    const response = await GET(new Request(`${ORIGIN}/api/feature-requests`))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('s-maxage=60')
    const body = (await response.json()) as { items: Array<Record<string, unknown>> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toEqual({
      id: 'a'.repeat(24),
      title: 'Edited title',
      body: 'Original body',
      status: 'open',
      votes: 7,
      createdAt: '2026-07-01T00:00:00.000Z',
    })
    expect(JSON.stringify(body)).not.toContain('example.com')
  })

  it('only queries publicly visible statuses', async () => {
    mockPrisma.featureRequest.findMany.mockResolvedValue([])
    await GET(new Request(`${ORIGIN}/api/feature-requests`))
    const arg = mockPrisma.featureRequest.findMany.mock.calls[0]![0]
    expect(arg.where.status.in).toEqual(['open', 'planned', 'in_progress', 'shipped'])
  })
})

describe('POST /api/feature-requests', () => {
  it('rejects foreign origins', async () => {
    const response = await POST(submitRequest(VALID_BODY, { origin: 'https://evil.example' }))
    expect(response.status).toBe(403)
  })

  it('rejects a missing origin for web submissions', async () => {
    const request = new Request(`${ORIGIN}/api/feature-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })
    expect((await POST(request)).status).toBe(403)
  })

  it('accepts a missing origin when source is app', async () => {
    stubBatchOk()
    const request = new Request(`${ORIGIN}/api/feature-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, source: 'app' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { ok: boolean }).ok).toBe(true)
    expect(mockPrisma.featureRequest.create).toHaveBeenCalled()
  })

  it('accepts non-ASCII text (Japanese)', async () => {
    stubBatchOk()
    const response = await POST(
      submitRequest({
        ...VALID_BODY,
        title: 'メニューバーにパーセント表示',
        body: 'バッテリー残量をメニューバーに直接表示してほしいです。一目でわかるようになります。',
        locale: 'ja',
      }),
    )
    expect(response.status).toBe(200)
  })

  it('rejects HTML-carrying text', async () => {
    const response = await POST(
      submitRequest({ ...VALID_BODY, body: '<script>alert(1)</script> please add this thing' }),
    )
    expect(response.status).toBe(400)
  })

  it('accepts everyday punctuation (apostrophe, %, &, °)', async () => {
    stubBatchOk()
    const response = await POST(
      submitRequest({
        ...VALID_BODY,
        title: "Don't drain below 20%",
        body: "It's too warm at 35°C — alerts & thresholds should adapt when the battery won't cool down.",
      }),
    )
    expect(response.status).toBe(200)
  })

  it('rejects line breaks in the title (email Subject safety)', async () => {
    const response = await POST(
      submitRequest({ ...VALID_BODY, title: 'First line\nSecond line' }),
    )
    expect(response.status).toBe(400)
  })

  it('rejects a too-short body', async () => {
    expect((await POST(submitRequest({ ...VALID_BODY, body: 'short' }))).status).toBe(400)
  })

  it('quarantines honeypot hits silently without email', async () => {
    const fetchMock = stubBatchOk()
    const response = await POST(submitRequest({ ...VALID_BODY, company: 'Acme' }))
    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
    const created = mockPrisma.featureRequest.create.mock.calls[0]![0]
    expect(created.data.adminNote).toBe('honeypot')
    expect(created.data.status).toBe('pending')
  })

  it('rate-limits per email (3/24h)', async () => {
    mockPrisma.featureRequest.count.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) => (where.email ? 3 : 0),
    )
    const response = await POST(submitRequest(VALID_BODY))
    expect(response.status).toBe(429)
    expect(mockPrisma.featureRequest.create.mock.calls[0]![0].data.adminNote).toBe(
      'rate_limited_email',
    )
  })

  it('rate-limits per IP (5/10min)', async () => {
    mockPrisma.featureRequest.count.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) => (where.ipAddress ? 5 : 0),
    )
    const response = await POST(
      submitRequest(VALID_BODY, { 'x-forwarded-for': '203.0.113.9' }),
    )
    expect(response.status).toBe(429)
    expect(mockPrisma.featureRequest.create.mock.calls[0]![0].data.adminNote).toBe(
      'rate_limited_ip',
    )
  })

  it('persists as pending and sends the notify+confirmation batch', async () => {
    const fetchMock = stubBatchOk()
    const response = await POST(submitRequest(VALID_BODY))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { ok: boolean; ticketId: string }
    expect(body.ok).toBe(true)
    expect(body.ticketId).toMatch(/^#[a-z2-9]{7}$/)

    const created = mockPrisma.featureRequest.create.mock.calls[0]![0]
    expect(created.data.status).toBe('pending')
    expect(created.data.email).toBe('user@example.com')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails/batch')
    const emails = JSON.parse(String(init.body)) as Array<{ to: string[]; subject: string }>
    expect(emails).toHaveLength(2)
    expect(emails[0]!.to).toEqual(['inbox@battery-sensei.app'])
    expect(emails[1]!.to).toEqual(['user@example.com'])

    const update = mockPrisma.featureRequest.update.mock.calls[0]![0]
    expect(update.data.adminNotifyEmailId).toBe('em_1')
    expect(update.data.confirmationEmailId).toBe('em_2')
    expect(update.data.adminNote).toBeNull()
  })

  it('keeps the row and still succeeds when Resend fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    const response = await POST(submitRequest(VALID_BODY))
    expect(response.status).toBe(200)
    const update = mockPrisma.featureRequest.update.mock.calls[0]![0]
    expect(update.data.adminNote).toBe('email_failed')
  })
})
