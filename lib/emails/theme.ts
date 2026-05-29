/**
 * Shared design tokens for transactional emails.
 *
 * Mirrors the site's washi/sumi/hinomaru palette so the inbox
 * experience feels continuous with battery-sensei.app.
 *
 * Kept inline (no Tailwind in emails) because Gmail/Outlook strip
 * <style> blocks and class names inconsistently — flat inline CSS
 * survives every client.
 */
export const palette = {
  washi: '#f4ede0',
  washiSoft: '#ece3d1',
  washiDeep: '#e2d6bd',
  sumi: '#1c1a17',
  sumiSoft: '#4a4540',
  nezumi: '#8a847c',
  hinomaru: '#bc002d',
  kin: '#c89b3c',
  line: 'rgba(28, 26, 23, 0.14)',
} as const

// Email clients rarely load web fonts, so the fallbacks carry the look across
// macOS / Windows / Android / iOS. The JP stack ends in sans-serif so kanji
// stay clean on clients without a Japanese serif installed.
export const fontStack =
  '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export const serifStack =
  '"Spectral", Georgia, Cambria, "Times New Roman", serif'

export const jpStack =
  '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", "Yu Gothic", Meiryo, sans-serif'
