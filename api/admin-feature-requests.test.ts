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

import { GET, PATCH } from './admin/feature-requests'
import { DELETE as sessionDELETE, GET as sessionGET, POST as sessionPOST } from './admin/session'
import { createAdminToken } from '../lib/admin-session'

const ORIGIN = 'https://battery-sensei.app'
const SESSION_SECRET = 'admin-session-secret-0123456789abcdefgh'
const DASHBOARD_KEY = 'dashboard-key-with-plenty-of-length'

const PENDING_ROW = {
  id: 'r'.repeat(24),
  ticketId: '#abcdefg',
  status: 'pending',
  source: 'web',
  title: 'Menu bar percentage',
  body: 'Show the percentage in the menu bar so it is visible at a glance.',
  publicTitle: null,
  publicBody: null,
  email: 'user@example.com',
  name: '',
  locale: 'en',
  votesCount: 0,
  rejectionReason: null,
  adminNote: null,
  ipAddress: null,
  userAgent: null,
  origin: null,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  moderatedAt: null,
}

function authedHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    cookie: `bs_admin=${createAdminToken()}`,
    origin: ORIGIN,
    'content-type': 'application/json',
    ...extra,
  }
}

function stubResendOk(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ id: 'em_decision' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubEnv('ADMIN_SESSION_SECRET', SESSION_SECRET)
  vi.stubEnv('ADMIN_DASHBOARD_KEY', DASHBOARD_KEY)
  vi.stubEnv('RESEND_API_KEY', 'test-resend')
  vi.stubEnv('CONTACT_INBOX_FROM', 'Battery Sensei <contact@battery-sensei.app>')
  mockPrisma.adminLoginAttempt.count.mockResolvedValue(0)
  mockPrisma.adminLoginAttempt.create.mockResolvedValue({})
  mockPrisma.adminLoginAttempt.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.featureRequest.update.mockImplementation(
    async (args: { data: Record<string, unknown> }) => ({ ...PENDING_ROW, ...args.data }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('POST /api/admin/session', () => {
  function login(key: string): Request {
    return new Request(`${ORIGIN}/api/admin/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ key }),
    })
  }

  it('sets the session cookie on the correct key', async () => {
    const response = await sessionPOST(login(DASHBOARD_KEY))
    expect(response.status).toBe(200)
    const cookie = response.headers.get('set-cookie')
    expect(cookie).toContain('bs_admin=')
    expect(cookie).toContain('HttpOnly')
    const attempt = mockPrisma.adminLoginAttempt.create.mock.calls[0]![0]
    expect(attempt.data.success).toBe(true)
  })

  it('401s on a wrong key and records the failure', async () => {
    const response = await sessionPOST(login('wrong-key'))
    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mockPrisma.adminLoginAttempt.create.mock.calls[0]![0].data.success).toBe(false)
  })

  it('429s after repeated failures from one IP', async () => {
    mockPrisma.adminLoginAttempt.count.mockResolvedValue(5)
    const request = new Request(`${ORIGIN}/api/admin/session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: ORIGIN,
        'x-forwarded-for': '203.0.113.5',
      },
      body: JSON.stringify({ key: DASHBOARD_KEY }),
    })
    expect((await sessionPOST(request)).status).toBe(429)
  })

  it('checks and clears the session', async () => {
    const ok = await sessionGET(
      new Request(`${ORIGIN}/api/admin/session`, { headers: authedHeaders() }),
    )
    expect(ok.status).toBe(200)
    const anon = await sessionGET(new Request(`${ORIGIN}/api/admin/session`))
    expect(anon.status).toBe(401)
    const crossSite = await sessionDELETE(
      new Request(`${ORIGIN}/api/admin/session`, {
        method: 'DELETE',
        headers: { origin: 'https://evil.example' },
      }),
    )
    expect(crossSite.status).toBe(403)
    const out = await sessionDELETE(
      new Request(`${ORIGIN}/api/admin/session`, { method: 'DELETE', headers: { origin: ORIGIN } }),
    )
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})

describe('GET /api/admin/feature-requests', () => {
  it('401s without a session cookie', async () => {
    const response = await GET(new Request(`${ORIGIN}/api/admin/feature-requests`))
    expect(response.status).toBe(401)
  })

  it('lists with status filter and cursor pagination', async () => {
    mockPrisma.featureRequest.findMany.mockResolvedValue([PENDING_ROW])
    const response = await GET(
      new Request(`${ORIGIN}/api/admin/feature-requests?status=pending&limit=1`, {
        headers: authedHeaders(),
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { items: Array<{ votes: number }>; nextCursor: null }
    expect(body.items[0]!.votes).toBe(0)
    expect(body.nextCursor).toBeNull()
    const query = mockPrisma.featureRequest.findMany.mock.calls[0]![0]
    expect(query.where).toEqual({ status: 'pending' })
    expect(query.take).toBe(2)
  })

  it('coerces fractional limit params instead of crashing Prisma', async () => {
    mockPrisma.featureRequest.findMany.mockResolvedValue([])
    const response = await GET(
      new Request(`${ORIGIN}/api/admin/feature-requests?status=pending&limit=2.5`, {
        headers: authedHeaders(),
      }),
    )
    expect(response.status).toBe(200)
    expect(Number.isInteger(mockPrisma.featureRequest.findMany.mock.calls[0]![0].take)).toBe(true)
  })

  it('rejects unknown status filters', async () => {
    const response = await GET(
      new Request(`${ORIGIN}/api/admin/feature-requests?status=bogus`, {
        headers: authedHeaders(),
      }),
    )
    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/admin/feature-requests', () => {
  function patch(body: Record<string, unknown>, headers = authedHeaders()): Request {
    return new Request(`${ORIGIN}/api/admin/feature-requests`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
  }

  it('401s without a session', async () => {
    const response = await PATCH(
      patch({ id: PENDING_ROW.id, action: 'approve' }, { origin: ORIGIN, 'content-type': 'application/json' }),
    )
    expect(response.status).toBe(401)
  })

  it('approves a pending request, publishes copy, and emails the submitter', async () => {
    const fetchMock = stubResendOk()
    mockPrisma.featureRequest.findUnique.mockResolvedValue(PENDING_ROW)
    const response = await PATCH(
      patch({ id: PENDING_ROW.id, action: 'approve', publicTitle: 'Percentage in the menu bar' }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { emailSent: boolean; item: { status: string } }
    expect(body.emailSent).toBe(true)
    expect(body.item.status).toBe('open')

    const update = mockPrisma.featureRequest.update.mock.calls[0]![0]
    expect(update.data.status).toBe('open')
    expect(update.data.publicTitle).toBe('Percentage in the menu bar')
    expect(update.data.publicBody).toBe(PENDING_ROW.body)

    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    const email = JSON.parse(String(init.body)) as { to: string[]; subject: string }
    expect(email.to).toEqual(['user@example.com'])
    expect(email.subject).toContain('live')
  })

  it('refuses to approve a non-pending request', async () => {
    mockPrisma.featureRequest.findUnique.mockResolvedValue({ ...PENDING_ROW, status: 'open' })
    const response = await PATCH(patch({ id: PENDING_ROW.id, action: 'approve' }))
    expect(response.status).toBe(409)
  })

  it('requires a reason to reject and emails it', async () => {
    stubResendOk()
    mockPrisma.featureRequest.findUnique.mockResolvedValue(PENDING_ROW)
    const missing = await PATCH(patch({ id: PENDING_ROW.id, action: 'reject' }))
    expect(missing.status).toBe(400)

    const response = await PATCH(
      patch({ id: PENDING_ROW.id, action: 'reject', reason: 'Out of scope for a battery app.' }),
    )
    expect(response.status).toBe(200)
    const update = mockPrisma.featureRequest.update.mock.calls[0]![0]
    expect(update.data.status).toBe('rejected')
    expect(update.data.rejectionReason).toBe('Out of scope for a battery app.')
  })

  it('takes down an approved request without emailing the submitter', async () => {
    const fetchMock = stubResendOk()
    mockPrisma.featureRequest.findUnique.mockResolvedValue({ ...PENDING_ROW, status: 'open' })
    const response = await PATCH(
      patch({ id: PENDING_ROW.id, action: 'reject', reason: 'Duplicate of an existing request.' }),
    )
    expect(response.status).toBe(200)
    expect(mockPrisma.featureRequest.update.mock.calls[0]![0].data.status).toBe('rejected')
    expect(fetchMock).not.toHaveBeenCalled()

    mockPrisma.featureRequest.findUnique.mockResolvedValue({ ...PENDING_ROW, status: 'rejected' })
    const again = await PATCH(
      patch({ id: PENDING_ROW.id, action: 'reject', reason: 'Duplicate of an existing request.' }),
    )
    expect(again.status).toBe(409)
  })

  it('moves approved requests along the roadmap but never pending ones', async () => {
    mockPrisma.featureRequest.findUnique.mockResolvedValue({ ...PENDING_ROW, status: 'open' })
    const ok = await PATCH(patch({ id: PENDING_ROW.id, action: 'set_status', status: 'planned' }))
    expect(ok.status).toBe(200)

    mockPrisma.featureRequest.findUnique.mockResolvedValue(PENDING_ROW)
    const bad = await PATCH(patch({ id: PENDING_ROW.id, action: 'set_status', status: 'planned' }))
    expect(bad.status).toBe(409)
  })

  it('edits public copy in place', async () => {
    mockPrisma.featureRequest.findUnique.mockResolvedValue({ ...PENDING_ROW, status: 'open' })
    const response = await PATCH(
      patch({ id: PENDING_ROW.id, action: 'edit', publicTitle: 'Clearer public title' }),
    )
    expect(response.status).toBe(200)
    expect(mockPrisma.featureRequest.update.mock.calls[0]![0].data).toEqual({
      publicTitle: 'Clearer public title',
    })
  })
})
