/**
 * One long-date formatter for every "last updated" line on the site.
 *
 * The footer's build-time site date, the /privacy notice date and the
 * /legal imprint date all render on the same screen, so they have to agree
 * on shape: "31 May 2026", never "May 31, 2026" beside "31. Mai 2026".
 * What they must NOT share is the value — /privacy §changes promises the
 * date at the top of that page tracks the document, not the deploy.
 */

// Map i18n language codes to Intl locale tags. Keeps the date format
// idiomatic in each locale ("28 May 2026" / "28. Mai 2026" / "2026年5月28日")
// without baking the date into the translation string.
const INTL_LOCALES: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
}

/**
 * `YYYY-MM-DD` → long day/month/year in the visitor's language.
 *
 * Parsed as UTC noon to dodge timezone day-boundary skew (no DST math
 * needed at noon) — a bare `new Date('2026-05-31')` is UTC midnight and
 * renders as the 30th for anyone west of Greenwich. Falls back to the raw
 * ISO string if the input or the locale tag is unusable.
 */
export function formatLongDate(iso: string, lang: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  const tag = INTL_LOCALES[lang.split('-')[0]] ?? 'en-GB'
  try {
    return new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}
