/**
 * Text-only notification for a new crash report, sent to the support inbox.
 *
 * It carries technical facts only. The user's note and the full report stay
 * in Neon, where the retention job deletes them; the email says whether a
 * note exists. Every report-derived string is untrusted input, so it is
 * stripped of control characters and length-capped before use.
 */

import { fieldText, isObject, type JsonObject } from '../ips-report.js'

const EMAIL_FRAMES = 10
const FIELD_MAX_CHARS = 120

/**
 * C0/C1 controls, Unicode line and paragraph separators, and bidi overrides:
 * anything that could break a Subject line or make it read differently.
 */
const UNSAFE_TEXT_RE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]+/g

/** Single line, bounded: safe in a Subject header and a text body. */
function clean(value: unknown): string {
  const text = fieldText(value).replace(UNSAFE_TEXT_RE, ' ').trim()
  // By code point, so a cut cannot split a surrogate pair.
  return Array.from(text).slice(0, FIELD_MAX_CHARS).join('')
}

/**
 * Top frames of the faulting thread as `image + symbol` (or `image +
 * offset` when the frame is unsymbolicated). Missing pieces become `?`.
 */
export function topFrames(body: JsonObject, count: number): string[] {
  const threads = Array.isArray(body.threads) ? body.threads : []
  const index = typeof body.faultingThread === 'number' ? body.faultingThread : 0
  const thread = threads[index]
  const frames = isObject(thread) && Array.isArray(thread.frames) ? thread.frames : []
  const images = Array.isArray(body.usedImages) ? body.usedImages : []
  return frames.slice(0, count).map((frame) => {
    if (!isObject(frame)) return '?'
    const image = typeof frame.imageIndex === 'number' ? images[frame.imageIndex] : undefined
    const imageName = (isObject(image) && clean(image.name)) || '?'
    const where = clean(frame.symbol) || `+${clean(frame.imageOffset) || '?'}`
    return `${imageName} ${where}`
  })
}

export function buildCrashReportEmail(input: {
  reportId: string
  appVersion: string
  tier: string
  osVersion: string
  signature: string
  hasNote: boolean
  body: JsonObject
}): { subject: string; text: string } {
  const exception = isObject(input.body.exception) ? input.body.exception : {}
  const exceptionType = clean(exception.type) || 'unknown exception'
  const signal = clean(exception.signal)
  const frames = topFrames(input.body, EMAIL_FRAMES)

  const subject = `Crash ${input.reportId}: ${exceptionType} in ${input.appVersion}`
  const text = [
    `Crash report ${input.reportId}`,
    '',
    `App version: ${input.appVersion}`,
    `License state: ${input.tier}`,
    `macOS: ${input.osVersion}`,
    `Exception: ${exceptionType}${signal ? ` (${signal})` : ''}`,
    `Signature: ${input.signature}`,
    `User note attached: ${input.hasNote ? 'yes' : 'no'}`,
    '',
    'Faulting thread, top frames:',
    ...(frames.length > 0 ? frames.map((f, i) => `  ${i}  ${f}`) : ['  (none)']),
    '',
    'The full report and any note are in the CrashReport table.',
  ].join('\n')
  return { subject, text }
}
