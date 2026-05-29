import type { ReactNode } from 'react'

export type FaqEntry = {
  q: string
  a: string
}

export type BlogPost = {
  slug: string
  /** Headline (sentence case, ≤70 chars where possible for SERPs). */
  title: string
  /** Subhead used as the meta description (≤160 chars) + lead paragraph. */
  description: string
  /** Author + date metadata. ISO date for the schema; date string is what's
   * rendered on the page. */
  publishedAt: string
  updatedAt?: string
  /** Reading time hint (minutes). Computed by hand from the outline; we don't
   * surface this on the page but it's used in Schema.org `timeRequired`. */
  readingMinutes: number
  /** Long-form body. The heart of the post. */
  body: () => ReactNode
  /** Inline FAQ block (renders + serializes to Schema.org FAQPage). */
  faqs?: FaqEntry[]
  /** Tags for surfacing in the index and for `keywords` in schema. */
  tags?: ReadonlyArray<string>
}
