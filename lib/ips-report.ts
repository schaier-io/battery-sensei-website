/**
 * Parsing and privacy checks for macOS `.ips` crash report text.
 *
 * The crash endpoint stores the `.ips` text verbatim (it holds 64-bit
 * integers a JSON parse would round), so every check here must hold for the
 * raw text, not only for one parsed reading of it. That is why duplicate
 * keys are rejected: `JSON.parse` keeps the last copy of a key, so a hidden
 * earlier copy would reach storage unchecked.
 */

export type JsonObject = Record<string, unknown>

export const isObject = (v: unknown): v is JsonObject =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * A report field as text. Only strings and numbers count: `String()` on an
 * attacker-shaped object (`{"toString":1}`, a 60k-deep array) throws.
 */
export function fieldText(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : ''
}

/**
 * Keys that identify a Mac, a user, or one boot or incident. Compared
 * case-insensitively at any depth. The app must strip every one of these
 * that real reports contain, or every report is rejected.
 *
 * The timing keys are banned because they give the boot or wake instant
 * (captureTime minus uptime, or minus procExitAbsTime in mach ticks).
 *
 * Accepted by the owner (2026-11-12): reports from one boot stay linkable
 * through shared-cache addresses (sharedCache.base, threadState registers,
 * system image bases), which are randomized once per boot. They name no
 * user or Mac. Removing them would mean an allow-listed, address-free report.
 */
const FORBIDDEN_KEYS = new Set(
  [
    'crashReporterKey',
    'userID',
    'incident',
    'incident_id',
    'sleepWakeUUID',
    'bootSessionUUID',
    'deviceIdentifierForVendor',
    'storeInfo',
    'trialInfo',
    'uptime',
    'wakeTime',
    'procStartAbsTime',
    'procExitAbsTime',
    'logWritingSignature',
  ].map((k) => k.toLowerCase()),
)

/**
 * macOS itself writes the home folder as `/Users/USER` in .ips files (47 of
 * 81 real reports measured). Exact case only: that spelling names no one.
 */
const APPLE_ANONYMIZED_HOME_RE = /\/Users\/USER(?=\/|$)/g
/**
 * A home folder path. The app rewrites these to `~`. /Users/Shared names no
 * user. Case-insensitive because APFS is, so `/users/alice` is the same path.
 * The exemption needs a path or prose boundary right after `Shared`: macOS
 * short names may contain a period, so `/Users/Shared.bob` is a home folder.
 */
const HOME_PATH_RE = /\/Users\/(?!Shared(?=[/\s"'),;:\]]|$))[^/\s]+/i
const USERS_DIR_RE = /\/Users\//i
/**
 * A `..` path segment. Next to `/Users/` it can climb from /Users/Shared
 * into a home folder (`/Users/Shared/a b/../../alice`), so such strings are
 * rejected outright: real crash reports have no reason to contain both.
 */
const PARENT_SEGMENT_RE = /(?:^|\/)\.\.(?:\/|$)/

/**
 * `/var/folders/<xx>/<hash>` is the per-user temp dir (DARWIN_USER_DIR):
 * stable per user and Mac, so a pseudonymous id. The app writes `$TMPDIR`.
 * macOS itself writes it as `/var/folders/*` (measured), which is allowed.
 */
const USER_TEMP_DIR_RE = /\/var\/folders\/(?!\*\/)[^/\s]+\/[^/\s]+/i

function hasHomePath(text: string): boolean {
  // `/Users//alice` is the same path as `/Users/alice`.
  const collapsed = text.replace(/\/{2,}/g, '/')
  const anonymized = collapsed.replace(APPLE_ANONYMIZED_HOME_RE, '~')
  if (HOME_PATH_RE.test(anonymized) || USER_TEMP_DIR_RE.test(anonymized)) return true
  // The climb check runs on the text before that rewrite, so
  // `/Users/USER/../alice` is still rejected.
  return USERS_DIR_RE.test(collapsed) && PARENT_SEGMENT_RE.test(collapsed)
}

/**
 * True when any object in this valid JSON text repeats a key. Call only on
 * text `JSON.parse` accepted; the scanner relies on that for structure.
 * Keys are decoded before comparing, so `"\u0061"` and `"a"` collide.
 */
function hasDuplicateKeys(text: string): boolean {
  // One entry per open container: the keys seen so far, or null for arrays.
  const open: Array<Set<string> | null> = []
  let expectKey = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      let end = i + 1
      while (text[end] !== '"') end += text[end] === '\\' ? 2 : 1
      const keys = open[open.length - 1]
      if (expectKey && keys) {
        const key = JSON.parse(text.slice(i, end + 1)) as string
        if (keys.has(key)) return true
        keys.add(key)
      }
      expectKey = false
      i = end
    } else if (c === '{') {
      open.push(new Set())
      expectKey = true
    } else if (c === '[') {
      open.push(null)
    } else if (c === '}' || c === ']') {
      open.pop()
    } else if (c === ',') {
      expectKey = open[open.length - 1] != null
    }
  }
  return false
}

export type IpsParseResult =
  | { ok: true; header: JsonObject; body: JsonObject }
  | { ok: false; error: 'unsupported_report' | 'duplicate_key' }

/** Splits `.ips` text into its header line and body, both JSON objects. */
export function parseIps(ips: string): IpsParseResult {
  const newline = ips.indexOf('\n')
  if (newline < 0) return { ok: false, error: 'unsupported_report' }
  const headerText = ips.slice(0, newline)
  const bodyText = ips.slice(newline + 1)
  let header: unknown
  let body: unknown
  try {
    header = JSON.parse(headerText)
    body = JSON.parse(bodyText)
  } catch {
    return { ok: false, error: 'unsupported_report' }
  }
  if (!isObject(header) || !isObject(body)) return { ok: false, error: 'unsupported_report' }
  if (hasDuplicateKeys(headerText) || hasDuplicateKeys(bodyText)) {
    return { ok: false, error: 'duplicate_key' }
  }
  return { ok: true, header, body }
}

export type PrivacyViolation =
  | { error: 'identifier_present'; key: string }
  | { error: 'home_path_present' }

/**
 * Walks every key and string value (iteratively, so hostile nesting or huge
 * arrays cannot overflow the stack) and reports the first identifier key or
 * home folder path. Identifier checks apply to object keys, where macOS puts
 * these values; a key's name quoted inside free text is not an identifier.
 */
export function findPrivacyViolation(roots: unknown[]): PrivacyViolation | null {
  const stack = [...roots]
  while (stack.length > 0) {
    const value = stack.pop()
    if (typeof value === 'string') {
      if (hasHomePath(value)) return { error: 'home_path_present' }
    } else if (Array.isArray(value)) {
      // A loop, not push(...value): spreading a huge array overflows the stack.
      for (const item of value) stack.push(item)
    } else if (isObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) return { error: 'identifier_present', key }
        if (hasHomePath(key)) return { error: 'home_path_present' }
        stack.push(child)
      }
    }
  }
  return null
}
