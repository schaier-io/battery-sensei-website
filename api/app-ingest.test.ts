import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockTx } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  })
  // A separate transaction client: work that must run under the admission
  // lock is asserted on `mockTx`, so moving it outside the lock fails a test.
  const mockTx = {
    crashReport: model(),
    $queryRaw: vi.fn(async () => [{ locked: true }]),
  }
  return {
    mockTx,
    mockPrisma: {
      featureRequest: model(),
      telemetryDailyCount: model(),
      crashReport: model(),
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    },
  }
})

vi.mock('../lib/db.js', () => ({ prisma: mockPrisma, db: mockPrisma }))

import { GET, POST } from './feature-requests/index'
import { FULL_REPORTS_DAILY_CAP, REPEAT_ROWS_DAILY_CAP } from '../lib/app-crash-reports'
import { isWellFormedText } from '../lib/app-ingest'

// What vercel.json rewrites /api/telemetry and /api/crash-reports to.
const TELEMETRY_URL = 'https://www.battery-sensei.app/api/feature-requests?ingest=telemetry'
const CRASH_URL = 'https://www.battery-sensei.app/api/feature-requests?ingest=crash'

// No Origin and no x-real-ip, like the app's URLSession behind no proxy.
// Without an IP the in-memory brake is skipped, so tests stay independent.
function appRequest(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const HEARTBEAT = { appVersion: '1.22.0', tier: 'paid', osMajor: 26 }

const IPS_HEADER = {
  app_name: 'Battery Sensei',
  app_version: '1.22.0',
  bundleID: 'io.schaier.battery-sensei',
  bug_type: '309',
  os_version: 'macOS 26.1 (25B78)',
}
// Real .ips files hold integers above 2^53. A JS number literal would round
// one before the handler ever saw it, so the fixture splices it in as text.
const BIG_INT_TEXT = '6917529027641081874'
const BIG_INT_PLACEHOLDER = '"__big_int__"'

const IPS_BODY = {
  exception: { type: 'EXC_BREAKPOINT', signal: 'SIGTRAP', rawCodes: ['__big_int__', 5] },
  faultingThread: 0,
  // How macOS itself writes a home folder path in .ips files.
  procPath: '/Users/USER/Applications/Battery Sensei.app/Contents/MacOS/Battery Sensei',
  threads: [
    {
      frames: [
        { imageOffset: 1234, symbol: 'AppModel.refresh()', imageIndex: 0 },
        { imageOffset: 99, imageIndex: 1 },
      ],
    },
  ],
  usedImages: [
    { name: 'Battery Sensei', base: 4294967296, path: '/Users/USER/Applications/Battery Sensei.app' },
    { name: 'libswiftCore.dylib', base: 7000000000, path: '/usr/lib/swift/libswiftCore.dylib' },
  ],
}

function ips(header: object = IPS_HEADER, body: object = IPS_BODY): string {
  return `${JSON.stringify(header)}\n${JSON.stringify(body).replace(BIG_INT_PLACEHOLDER, BIG_INT_TEXT)}`
}

function crashPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { appVersion: '1.22.0', tier: 'trial', osVersion: '26.1', ips: ips(), ...overrides }
}

/**
 * Answers crashReport.count by what the query asks for, so tests do not
 * depend on the order the handler runs its counts in.
 */
const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_TOLERANCE_MS = 60_000

function crashCounts({ all = 0, sameSignature = 0, sameSignatureRepeatRows = 0, full = 0, repeats = 0 } = {}): void {
  const answer = async ({ where }: { where: Record<string, unknown> }) => {
    // Every cap counts the last 24 hours. A wrong window must fail loudly:
    // without one, the endpoint would close for good after a busy month.
    const since = (where.createdAt as { gte?: unknown } | undefined)?.gte
    if (!(since instanceof Date) || Math.abs(Date.now() - DAY_MS - since.getTime()) > WINDOW_TOLERANCE_MS) {
      throw new Error(`crash count outside the last day: ${JSON.stringify(where)}`)
    }
    // Full-report counts must exclude exactly the repeat rows; any other
    // status filter is treated like none and counts repeat rows too.
    const excludesRepeats = (where.status as { not?: unknown } | undefined)?.not === 'duplicate'
    if ('signature' in where) return excludesRepeats ? sameSignature : sameSignature + sameSignatureRepeatRows
    if (where.status === 'duplicate') return repeats
    if ('status' in where) return excludesRepeats ? full : all
    return all
  }
  mockPrisma.crashReport.count.mockImplementation(answer)
  mockTx.crashReport.count.mockImplementation(answer)
}

/**
 * Released versions the telemetry endpoint reads from the public appcast:
 * 1.0.0 to 1.30.0 plus 1.21.1, so 1.0.0 and 1.1.0 fall outside the newest 30.
 */
const APPCAST = [
  '<rss><channel>',
  ...[...Array.from({ length: 31 }, (_, i) => `1.${i}.0`), '1.21.1'].map(
    (v) => `<item><sparkle:shortVersionString>${v}</sparkle:shortVersionString></item>`,
  ),
  '</channel></rss>',
].join('')

/**
 * Stubs fetch: the appcast URL answers APPCAST, everything else (Resend)
 * answers a fresh copy of `resend`. Returns a mock of the Resend calls only.
 */
function stubResend(resend: Response): ReturnType<typeof vi.fn> {
  const resendCalls = vi.fn(async (_url: string, _init?: RequestInit) => resend.clone())
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) =>
      String(url).endsWith('/appcast.xml') ? new Response(APPCAST) : resendCalls(String(url), init),
    ),
  )
  return resendCalls
}

beforeEach(() => {
  vi.stubEnv('APP_INGEST_ENABLED', '1')
  vi.stubEnv('RESEND_API_KEY', 'test-resend')
  vi.stubEnv('CONTACT_INBOX_TO', 'inbox@battery-sensei.app')
  vi.stubEnv('CONTACT_INBOX_FROM', 'Battery Sensei <contact@battery-sensei.app>')
  for (const model of [
    mockPrisma.telemetryDailyCount,
    mockPrisma.crashReport,
    mockPrisma.featureRequest,
    mockTx.crashReport,
  ]) {
    for (const fn of Object.values(model)) fn.mockReset()
  }
  mockTx.$queryRaw.mockClear()
  mockPrisma.$transaction.mockClear()
  stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
  mockPrisma.telemetryDailyCount.updateMany.mockResolvedValue({ count: 1 })
  mockPrisma.telemetryDailyCount.count.mockResolvedValue(0)
  crashCounts()
  mockTx.crashReport.create.mockResolvedValue({ id: 'cr_1' })
  mockPrisma.crashReport.update.mockResolvedValue({})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ingest dispatch', () => {
  it('answers 404 for both endpoints until the kill switch is on', async () => {
    vi.stubEnv('APP_INGEST_ENABLED', '')
    for (const [url, body] of [[TELEMETRY_URL, HEARTBEAT], [CRASH_URL, crashPayload()]] as const) {
      const response = await POST(appRequest(url, body))
      expect(response.status).toBe(404)
    }
    expect(mockPrisma.telemetryDailyCount.updateMany).not.toHaveBeenCalled()
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
  })

  it('routes every vercel.json ingest rewrite to a handler', async () => {
    const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
      rewrites: Array<{ source: string; destination: string }>
    }
    const ingestRewrites = config.rewrites.filter((r) => r.destination.includes('?ingest='))
    expect(ingestRewrites.map((r) => r.source).sort()).toEqual(['/api/crash-reports', '/api/telemetry'])
    // Each handler answers its own valid payload with a status only it uses.
    const expected: Record<string, [unknown, number]> = {
      '/api/telemetry': [HEARTBEAT, 204],
      '/api/crash-reports': [crashPayload(), 201],
    }
    for (const rewrite of ingestRewrites) {
      const [body, status] = expected[rewrite.source]!
      const response = await POST(appRequest(`https://www.battery-sensei.app${rewrite.destination}`, body))
      expect(response.status).toBe(status)
    }
  })

  it('answers a GET 404 while switched off, so the dark endpoint looks absent', async () => {
    vi.stubEnv('APP_INGEST_ENABLED', '')
    expect((await GET(new Request(TELEMETRY_URL))).status).toBe(404)
  })

  it('never serves the cacheable board list on a rewritten GET', async () => {
    const response = await GET(new Request(TELEMETRY_URL))
    expect(response.status).toBe(405)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mockPrisma.featureRequest.findMany).not.toHaveBeenCalled()
  })

  it('rejects an unknown ingest kind instead of falling through to the board', async () => {
    const response = await POST(
      appRequest('https://www.battery-sensei.app/api/feature-requests?ingest=other', HEARTBEAT),
    )
    expect(response.status).toBe(404)
    expect(mockPrisma.featureRequest.create).not.toHaveBeenCalled()
  })

  it('rejects browser requests, which always carry an Origin', async () => {
    const response = await POST(
      appRequest(TELEMETRY_URL, HEARTBEAT, { origin: 'https://www.battery-sensei.app' }),
    )
    expect(response.status).toBe(403)
  })
})

describe('POST /api/telemetry', () => {
  it.each([
    ['an install id', { ...HEARTBEAT, installId: 'abc' }],
    ['a two-part version', { ...HEARTBEAT, appVersion: '1.2' }],
    ['a leading-zero version', { ...HEARTBEAT, appVersion: '01.0.0' }],
    ['a macOS major below range', { ...HEARTBEAT, osMajor: 12 }],
    ['a macOS major above range', { ...HEARTBEAT, osMajor: 99 }],
    ['a macOS major Apple skipped', { ...HEARTBEAT, osMajor: 20 }],
    ['an unknown tier', { ...HEARTBEAT, tier: 'lifetime' }],
  ])('rejects %s without touching the database', async (_label, body) => {
    const response = await POST(appRequest(TELEMETRY_URL, body))
    expect(response.status).toBe(400)
    expect(mockPrisma.telemetryDailyCount.updateMany).not.toHaveBeenCalled()
    expect(mockPrisma.telemetryDailyCount.create).not.toHaveBeenCalled()
  })

  it.each([
    ['2026-11-12T23:59:59.000Z', '2026-11-12T00:00:00.000Z'],
    ['2026-11-13T00:00:01.000Z', '2026-11-13T00:00:00.000Z'],
  ])('counts a ping at %s into the UTC day %s, keyed by exactly the reported fields', async (now, day) => {
    vi.useFakeTimers({ now: new Date(now), toFake: ['Date'] })
    const response = await POST(appRequest(TELEMETRY_URL, HEARTBEAT))

    expect(response.status).toBe(204)
    expect(mockPrisma.telemetryDailyCount.updateMany).toHaveBeenCalledWith({
      where: { day: new Date(day), appVersion: '1.22.0', tier: 'paid', osMajor: 26 },
      data: { count: { increment: 1 } },
    })
  })

  it('creates the counter for a new combination with only the key fields and a count', async () => {
    mockPrisma.telemetryDailyCount.updateMany.mockResolvedValue({ count: 0 })
    const response = await POST(appRequest(TELEMETRY_URL, HEARTBEAT))

    expect(response.status).toBe(204)
    const data = mockPrisma.telemetryDailyCount.create.mock.calls[0]?.[0].data
    expect(Object.keys(data).sort()).toEqual(['appVersion', 'count', 'day', 'osMajor', 'tier'])
    expect(data.count).toBe(1)
  })

  it('increments instead of failing when a concurrent first ping created the row', async () => {
    mockPrisma.telemetryDailyCount.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
    mockPrisma.telemetryDailyCount.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    )
    const response = await POST(appRequest(TELEMETRY_URL, HEARTBEAT))

    expect(response.status).toBe(204)
    expect(mockPrisma.telemetryDailyCount.updateMany).toHaveBeenCalledTimes(2)
  })

  it('drops a version that was never released, so invented versions cannot create rows', async () => {
    const response = await POST(appRequest(TELEMETRY_URL, { ...HEARTBEAT, appVersion: '99.0.0' }))
    expect(response.status).toBe(204)
    expect(mockPrisma.telemetryDailyCount.updateMany).not.toHaveBeenCalled()
  })

  it('answers 204 when the database fails, so the app is not invited to retry', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockPrisma.telemetryDailyCount.updateMany.mockRejectedValueOnce(new Error('timeout exceeded when trying to connect'))
    const response = await POST(appRequest(TELEMETRY_URL, HEARTBEAT))

    expect(response.status).toBe(204)
    expect(log).toHaveBeenCalledWith('[telemetry] count failed', { code: undefined, name: 'Error' })
    log.mockRestore()
  })

  it('counts a release older than the newest 30 under one shared key', async () => {
    await POST(appRequest(TELEMETRY_URL, { ...HEARTBEAT, appVersion: '1.0.0' }))
    expect(mockPrisma.telemetryDailyCount.updateMany.mock.calls[0]?.[0].where.appVersion).toBe('older')
  })

  it('silently drops pings past the hourly brake for one client', async () => {
    const fromOneIp = () => appRequest(TELEMETRY_URL, HEARTBEAT, { 'x-real-ip': '198.51.100.8' })
    for (let i = 0; i < 30; i++) await POST(fromOneIp())
    expect(mockPrisma.telemetryDailyCount.updateMany).toHaveBeenCalledTimes(30)

    const response = await POST(fromOneIp())
    expect(response.status).toBe(204)
    expect(mockPrisma.telemetryDailyCount.updateMany).toHaveBeenCalledTimes(30)
  })
})

describe('POST /api/crash-reports', () => {
  it('stores the ips text verbatim, so 64-bit integers are not rounded', async () => {
    stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ ok: true, reportId: expect.stringMatching(/^#/) })
    const [lockSql] = mockTx.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray]
    expect(lockSql.join('?')).toContain('pg_try_advisory_xact_lock(')
    // The lock must be held before the cap counts, or they can race.
    const lockedAt = mockTx.$queryRaw.mock.invocationCallOrder[0]!
    expect(Math.min(...mockTx.crashReport.count.mock.invocationCallOrder)).toBeGreaterThan(lockedAt)
    const data = mockTx.crashReport.create.mock.calls[0]?.[0].data
    expect(data.ips).toBe(ips())
    expect(data.ips).toContain(`[${BIG_INT_TEXT},5]`)
    expect(data.status).toBe('received')
    expect(mockPrisma.crashReport.update).toHaveBeenCalledWith({
      where: { id: 'cr_1' },
      data: { status: 'notified', notifyEmailId: 'em_1' },
    })
  })

  it('keeps the note out of the notification email', async () => {
    const fetchMock = stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    await POST(appRequest(CRASH_URL, crashPayload({ note: 'Crashed after unplugging the charger' })))

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const sent = JSON.parse(String(init.body))
    expect(sent.text).not.toContain('unplugging')
    expect(sent.text).toContain('User note attached: yes')
    expect(sent.text).toContain('Battery Sensei AppModel.refresh()')
    expect(sent.subject).toBe(`Crash ${mockTx.crashReport.create.mock.calls[0]?.[0].data.reportId}: EXC_BREAKPOINT in 1.22.0`)
  })

  it.each([
    ['in the header', { ...IPS_HEADER, incident_id: 'X' }, IPS_BODY, 'incident_id'],
    ['at the body top level', IPS_HEADER, { ...IPS_BODY, crashReporterKey: 'K' }, 'crashReporterKey'],
    ['in another case', IPS_HEADER, { ...IPS_BODY, USERID: 501 }, 'USERID'],
    [
      'deep in a thread',
      IPS_HEADER,
      { ...IPS_BODY, threads: [{ frames: [], extra: [{ sleepWakeUUID: 'S' }] }] },
      'sleepWakeUUID',
    ],
    [
      'nested in store info',
      IPS_HEADER,
      { ...IPS_BODY, store: { deviceIdentifierForVendor: 'D' } },
      'deviceIdentifierForVendor',
    ],
    // Boot time is captureTime minus these, which links reports of one boot.
    ['for system uptime', IPS_HEADER, { ...IPS_BODY, uptime: 86_000 }, 'uptime'],
    ['for process mach time', IPS_HEADER, { ...IPS_BODY, procExitAbsTime: 9_876_543_210 }, 'procExitAbsTime'],
  ])('rejects an identifier key %s and stores nothing', async (_label, header, body, key) => {
    const fetchMock = stubResend(new Response('{}'))
    const response = await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(header, body) })))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'identifier_present', key })
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['a frame path', { ...IPS_BODY, procPath: '/Users/alice/Applications/Battery Sensei.app' }, undefined],
    ['lower case, which APFS treats as the same path', { ...IPS_BODY, procPath: '/users/alice/x' }, undefined],
    ['a doubled slash', { ...IPS_BODY, procPath: '/Users//alice/x' }, undefined],
    ['a climb out of the shared folder', { ...IPS_BODY, procPath: '/Users/Shared/../alice/x' }, undefined],
    ['a user whose short name starts with Shared and a period', { ...IPS_BODY, procPath: '/Users/Shared.bob/x' }, undefined],
    ['a climb out of the anonymized home', { ...IPS_BODY, procPath: '/Users/USER/../alice/x' }, undefined],
    ['a real user named in upper case', { ...IPS_BODY, procPath: '/Users/USERNAME/x' }, undefined],
    ['the anonymized form in lower case, which names a real user', { ...IPS_BODY, procPath: '/Users/user/x' }, undefined],
    ['a climb through a folder name with a space', { ...IPS_BODY, procPath: '/Users/Shared/My Folder/../../alice/x' }, undefined],
    ['the per-user temp folder', { ...IPS_BODY, procPath: '/private/var/folders/x7/abc123/T/AppTranslocation/U/d/a.app' }, undefined],
  ])('rejects a home folder path in %s', async (_label, body, note) => {
    const response = await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(IPS_HEADER, body), note })))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'home_path_present' })
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
  })

  it('names the note when only the note holds a home path, so the app can ask the user to edit it', async () => {
    const response = await POST(appRequest(CRASH_URL, crashPayload({ note: 'see /Users/alice/Desktop/log.txt' })))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'home_path_in_note' })
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
  })

  it.each([
    ['a path inside it', '/Users/Shared/Battery Sensei.app'],
    ['the folder named in prose', 'wrote /Users/Shared and exited'],
    ['the temp folder as macOS anonymizes it', '/private/var/folders/*/Battery Sensei'],
  ])('accepts a path that names no user: %s', async (_label, procPath) => {
    stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    const body = { ...IPS_BODY, procPath }
    const response = await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(IPS_HEADER, body) })))
    expect(response.status).toBe(201)
  })

  it.each([
    ['the note', { note: 'broken \uD800 text' }],
    ['the report text', { ips: `${ips()}\uDC00` }],
  ])('rejects a lone surrogate in %s, which would not survive storage as UTF-8', async (_label, override) => {
    const response = await POST(appRequest(CRASH_URL, crashPayload(override)))
    expect(response.status).toBe(400)
  })

  it('asks the app to retry soon instead of waiting when another request holds the lock', async () => {
    mockTx.$queryRaw.mockResolvedValueOnce([{ locked: false }])
    const response = await POST(appRequest(CRASH_URL, crashPayload()))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(mockTx.crashReport.count).not.toHaveBeenCalled()
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
  })

  it('asks the app to retry soon when no database connection opens in time, and logs no report text', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    // What adapter-pg surfaces for a pool connect timeout: no code (measured).
    const timeout = new Error('Connection terminated due to connection timeout; note: private words')
    mockPrisma.crashReport.count.mockRejectedValueOnce(timeout)
    const response = await POST(appRequest(CRASH_URL, crashPayload({ note: 'private words' })))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
    expect(JSON.stringify(log.mock.calls)).not.toContain('private words')
    log.mockRestore()
  })

  it('asks the app to retry soon when the transaction cannot start in time', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('timed out'), { code: 'P2028' }))
    const response = await POST(appRequest(CRASH_URL, crashPayload()))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
  })

  it.each([
    ['another app', { ...IPS_HEADER, bundleID: 'com.example.other' }],
    ['a non-crash report', { ...IPS_HEADER, bug_type: '288' }],
    ['an app version mismatch', { ...IPS_HEADER, app_version: '1.21.0' }],
    ['a macOS version mismatch', { ...IPS_HEADER, os_version: 'macOS 26.2 (25C1)' }],
  ])('rejects %s', async (_label, header) => {
    const response = await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(header) })))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'unsupported_report' })
  })

  it('counts the size cap in bytes, not characters', async () => {
    // 60k three-byte characters: 180 KB of UTF-8 but about 60k UTF-16 units,
    // under the 128 KiB cap if counted as characters. No Content-Length.
    const body = JSON.stringify(crashPayload({ note: '電'.repeat(60_000) }))
    const response = await POST(appRequest(CRASH_URL, body))
    expect(response.status).toBe(413)
  })

  it('keeps the report when the notification email fails', async () => {
    stubResend(new Response('upstream error', { status: 500 }))
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(201)
    expect(mockTx.crashReport.create).toHaveBeenCalledOnce()
    expect(mockPrisma.crashReport.update).toHaveBeenCalledWith({
      where: { id: 'cr_1' },
      data: { status: 'notify_failed' },
    })
  })

  it('stores a repeat of a recent crash as a row without text, and sends no email', async () => {
    const fetchMock = stubResend(new Response('{}'))
    // The full-report cap is reached, but repeats do not count against it.
    crashCounts({ all: 30, sameSignature: 1, full: FULL_REPORTS_DAILY_CAP })
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(201)
    const data = mockTx.crashReport.create.mock.calls[0]?.[0].data
    expect(data.status).toBe('duplicate')
    expect(data.ips).toBe('')
    expect(data.note).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps a repeat that carries a note as a full report, so the note is read', async () => {
    const fetchMock = stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    crashCounts({ all: 30, sameSignature: 1, full: 1 })
    const response = await POST(appRequest(CRASH_URL, crashPayload({ note: 'happens every unplug' })))

    expect(response.status).toBe(201)
    const data = mockTx.crashReport.create.mock.calls[0]?.[0].data
    expect(data).toMatchObject({ status: 'received', note: 'happens every unplug', ips: ips() })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    ['a different note', { note: 'other words' }, true],
    ['a different non-faulting thread', { ips: ips(IPS_HEADER, { ...IPS_BODY, threads: [...IPS_BODY.threads, { frames: [{ imageOffset: 7, imageIndex: 1 }] }] }) }, true],
    ['a different faulting frame', { ips: ips(IPS_HEADER, { ...IPS_BODY, threads: [{ frames: [{ imageOffset: 1, symbol: 'Other.run()', imageIndex: 0 }] }] }) }, false],
    ['a different exception', { ips: ips(IPS_HEADER, { ...IPS_BODY, exception: { type: 'EXC_BAD_ACCESS', signal: 'SIGSEGV' } }) }, false],
  ])('groups a crash with %s as the same crash: %s', async (_label, override, same) => {
    await POST(appRequest(CRASH_URL, crashPayload()))
    await POST(appRequest(CRASH_URL, crashPayload(override)))
    const [first, second] = mockTx.crashReport.create.mock.calls.map((call) => call[0].data.signature)
    expect(first).toMatch(/^[0-9a-f]{16}$/)
    expect(first === second).toBe(same)
  })

  it('stores a fresh full report when only repeat rows exist in the last day', async () => {
    // Regression: counting repeat rows chained dedupe forever, so a crash
    // recurring daily stored one report and sent one email for its lifetime.
    const fetchMock = stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    crashCounts({ all: 5, sameSignature: 0, sameSignatureRepeatRows: 5 })
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(201)
    expect(mockTx.crashReport.create.mock.calls[0]?.[0].data.status).toBe('received')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('still answers 201 when a report field is an object that cannot become text', async () => {
    // Regression: String({toString: 1}) throws, which turned a stored report
    // into a 500, so the app would re-send it.
    const body = { ...IPS_BODY, exception: { type: { toString: 1 }, signal: [[[]]] } }
    const response = await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(IPS_HEADER, body) })))

    expect(response.status).toBe(201)
    expect(mockPrisma.crashReport.update).toHaveBeenCalledWith({
      where: { id: 'cr_1' },
      data: { status: 'notified', notifyEmailId: 'em_1' },
    })
  })

  it('keeps line breaks and bidi overrides from the report out of the email subject', async () => {
    const fetchMock = stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    const body = { ...IPS_BODY, exception: { type: 'EXC\r\nBcc: x@example.com\u202Egnp.exe', signal: 'S' } }
    await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(IPS_HEADER, body) })))

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const subject: string = JSON.parse(String(init.body)).subject
    expect(subject).not.toMatch(/[\r\n\u202E]/)
    expect(subject).toContain('EXC Bcc: x@example.com gnp.exe')
  })

  it('never cuts a long report field inside an emoji, which would leave broken text', async () => {
    const fetchMock = stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    // The field limit is 120: a cut by UTF-16 unit would split this emoji.
    const body = { ...IPS_BODY, exception: { type: `${'E'.repeat(119)}\u{1F600}tail`, signal: 'S' } }
    await POST(appRequest(CRASH_URL, crashPayload({ ips: ips(IPS_HEADER, body) })))

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const { subject, text } = JSON.parse(String(init.body))
    expect(isWellFormedText(subject) && isWellFormedText(text)).toBe(true)
  })

  it('brakes a single client after three reports in an hour', async () => {
    stubResend(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    const fromOneIp = () => appRequest(CRASH_URL, crashPayload(), { 'x-real-ip': '198.51.100.7' })
    for (let i = 0; i < 3; i++) expect((await POST(fromOneIp())).status).toBe(201)

    const response = await POST(fromOneIp())
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('3600')
  })

  it('asks the app to retry later once the full-report cap is reached, without taking the lock', async () => {
    crashCounts({ all: FULL_REPORTS_DAILY_CAP, full: FULL_REPORTS_DAILY_CAP })
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe(String(6 * 60 * 60))
    // A flood of new crashes past the cap must not queue on the lock.
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('does not count repeat rows against the full-report cap', async () => {
    crashCounts({ all: FULL_REPORTS_DAILY_CAP * 5, full: FULL_REPORTS_DAILY_CAP - 1 })
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(201)
    expect(mockTx.crashReport.create.mock.calls[0]?.[0].data.status).toBe('received')
  })

  it('stops storing repeats once the repeat cap is reached', async () => {
    crashCounts({ repeats: REPEAT_ROWS_DAILY_CAP, sameSignature: 1 })
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(429)
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
  })

  it('still stores a different crash after a flood of repeats fills the repeat cap', async () => {
    crashCounts({ all: REPEAT_ROWS_DAILY_CAP + 1, repeats: REPEAT_ROWS_DAILY_CAP, full: 1 })
    const response = await POST(appRequest(CRASH_URL, crashPayload()))

    expect(response.status).toBe(201)
    expect(mockTx.crashReport.create.mock.calls[0]?.[0].data.status).toBe('received')
  })

  it('rejects duplicate keys, which would hide a value from the check but not from storage', async () => {
    // JSON.parse keeps the last copy of a key; the stored text keeps both.
    const body = '{"procPath":"/Users/alice/x","procPath":"~/x","x":{"crashReporterKey":"K"},"x":1}'
    const response = await POST(
      appRequest(CRASH_URL, crashPayload({ ips: `${JSON.stringify(IPS_HEADER)}\n${body}` })),
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'duplicate_key' })
    expect(mockTx.crashReport.create).not.toHaveBeenCalled()
  })

  it('treats escaped and plain spellings of one key as duplicates', async () => {
    const body = '{"a":1,"\\u0061":2}'
    const response = await POST(
      appRequest(CRASH_URL, crashPayload({ ips: `${JSON.stringify(IPS_HEADER)}\n${body}` })),
    )
    expect(await response.json()).toEqual({ error: 'duplicate_key' })
  })
})
