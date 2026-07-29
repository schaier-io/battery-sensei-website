import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockTx } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  })
  const mockTx = { featureVote: model(), featureRequest: model() }
  return {
    mockTx,
    mockPrisma: {
      featureRequest: model(),
      featureVote: model(),
      licenseVoter: model(),
      adminLoginAttempt: model(),
      $transaction: vi.fn(async (arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: typeof mockTx) => unknown)(mockTx),
      ),
    },
  }
})

vi.mock('../lib/db.js', () => ({ prisma: mockPrisma, db: mockPrisma }))

import { POST } from './feature-requests/vote'

const ORIGIN = 'https://battery-sensei.app'
const KEY = 'ABCD1234-EF56-7890-ABCD-1234567890EF'
const REQUEST_ID = 'c'.repeat(24)

function voteRequest(body: Record<string, unknown>, ip = '203.0.113.10'): Request {
  return new Request(`${ORIGIN}/api/feature-requests/vote`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      // Unique per-test IPs sidestep the module-level in-memory throttle.
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

function stubPolar(status: number, body: unknown = { status: 'granted' }): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

let ipCounter = 0
function nextIp(): string {
  ipCounter += 1
  return `198.51.100.${ipCounter}`
}

beforeEach(() => {
  vi.stubEnv('FEATURE_VOTE_HASH_SECRET', 'vote-hash-secret-0123456789abcdefghij')
  vi.stubEnv('POLAR_ORGANIZATION_ID', 'org_test')
  mockPrisma.licenseVoter.findUnique.mockResolvedValue(null)
  mockPrisma.licenseVoter.upsert.mockResolvedValue({})
  mockPrisma.licenseVoter.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.featureVote.findMany.mockResolvedValue([])
  mockPrisma.featureVote.count.mockResolvedValue(0)
  mockPrisma.featureVote.create.mockResolvedValue({})
  mockPrisma.featureRequest.update.mockResolvedValue({})
  mockPrisma.featureRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, status: 'open' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('POST /api/feature-requests/vote', () => {
  it('returns valid:false on an unknown key without treating it as an error', async () => {
    stubPolar(404, { detail: 'Not found' })
    const response = await POST(voteRequest({ action: 'check', licenseKey: KEY }, nextIp()))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, valid: false })
  })

  it('treats disabled/revoked keys as invalid', async () => {
    stubPolar(200, { status: 'revoked' })
    const response = await POST(voteRequest({ action: 'check', licenseKey: KEY }, nextIp()))
    expect(((await response.json()) as { valid: boolean }).valid).toBe(false)
  })

  it('returns 502 when Polar is down', async () => {
    stubPolar(500, { detail: 'boom' })
    const response = await POST(voteRequest({ action: 'check', licenseKey: KEY }, nextIp()))
    expect(response.status).toBe(502)
  })

  it('treats Polar throttling (429) as an outage, never as an invalid key', async () => {
    stubPolar(429, { detail: 'slow down' })
    const response = await POST(voteRequest({ action: 'check', licenseKey: KEY }, nextIp()))
    // 502, NOT { valid: false } — valid:false makes clients discard
    // their stored key.
    expect(response.status).toBe(502)
  })

  it('skips the Polar round-trip on a fresh cache entry', async () => {
    const fetchMock = stubPolar(500) // would fail if called
    mockPrisma.licenseVoter.findUnique.mockResolvedValue({
      voterHash: 'x',
      lastValidatedAt: new Date(),
    })
    mockPrisma.featureVote.findMany.mockResolvedValue([{ requestId: REQUEST_ID }])
    const response = await POST(voteRequest({ action: 'check', licenseKey: KEY }, nextIp()))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, valid: true, votedIds: [REQUEST_ID] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('casts a vote transactionally and returns the fresh count', async () => {
    stubPolar(200)
    mockPrisma.featureRequest.findUnique
      .mockResolvedValueOnce({ id: REQUEST_ID, status: 'open' })
      .mockResolvedValueOnce({ votesCount: 8 })
    mockPrisma.featureVote.findMany.mockResolvedValue([{ requestId: REQUEST_ID }])
    const response = await POST(
      voteRequest({ action: 'vote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      valid: true,
      votedIds: [REQUEST_ID],
      votes: 8,
    })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('is idempotent on double-vote (P2002)', async () => {
    stubPolar(200)
    mockPrisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    )
    mockPrisma.featureRequest.findUnique
      .mockResolvedValueOnce({ id: REQUEST_ID, status: 'open' })
      .mockResolvedValueOnce({ votesCount: 8 })
    const response = await POST(
      voteRequest({ action: 'vote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(response.status).toBe(200)
  })

  it('rejects voting on non-votable statuses', async () => {
    stubPolar(200)
    mockPrisma.featureRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, status: 'shipped' })
    const response = await POST(
      voteRequest({ action: 'vote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(response.status).toBe(409)
  })

  it('404s on a missing request', async () => {
    stubPolar(200)
    mockPrisma.featureRequest.findUnique.mockResolvedValue(null)
    const response = await POST(
      voteRequest({ action: 'vote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(response.status).toBe(404)
    expect(((await response.json()) as { error: string }).error).toBe('not_found')
  })

  it('unvotes idempotently and only decrements when a row was removed', async () => {
    stubPolar(200)
    mockTx.featureVote.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.featureRequest.findUnique
      .mockResolvedValueOnce({ id: REQUEST_ID, status: 'open' })
      .mockResolvedValueOnce({ votesCount: 7 })
    const response = await POST(
      voteRequest({ action: 'unvote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(response.status).toBe(200)
    expect(mockTx.featureRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { votesCount: { decrement: 1 } } }),
    )

    // Second unvote: nothing to delete, no decrement.
    mockTx.featureRequest.update.mockClear()
    mockTx.featureVote.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.featureRequest.findUnique
      .mockResolvedValueOnce({ id: REQUEST_ID, status: 'open' })
      .mockResolvedValueOnce({ votesCount: 7 })
    const second = await POST(
      voteRequest({ action: 'unvote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(second.status).toBe(200)
    expect(mockTx.featureRequest.update).not.toHaveBeenCalled()
  })

  it('rate-limits vote mutations per IP', async () => {
    stubPolar(200)
    mockPrisma.featureVote.count.mockResolvedValue(30)
    const response = await POST(
      voteRequest({ action: 'vote', licenseKey: KEY, requestId: REQUEST_ID }, nextIp()),
    )
    expect(response.status).toBe(429)
  })

  it('rejects malformed keys before any network call', async () => {
    const fetchMock = stubPolar(200)
    const response = await POST(
      voteRequest({ action: 'check', licenseKey: 'no spaces allowed!' }, nextIp()),
    )
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
