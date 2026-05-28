import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

/** Shared building blocks used by every blog post. Kept thin: one styled
 * paragraph, one section heading, one inline-emphasis pull, plus typed
 * link helpers for the three internal-link shapes (glossary term, app
 * route, external URL). Posts compose these directly. */

export const P = ({ children }: { children: ReactNode }) => (
  <p className="text-[1.0625rem] leading-[1.78] text-sumi md:text-[1.125rem]">
    {children}
  </p>
)

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="display-title mt-12 mb-5 text-[1.625rem] font-semibold leading-[1.18] tracking-[-0.012em] text-sumi md:mt-14 md:mb-6 md:text-[1.875rem]">
    {children}
  </h2>
)

export const Pull = ({ children }: { children: ReactNode }) => (
  <p className="my-8 border-l-2 border-hinomaru/40 pl-5 text-[1.125rem] italic leading-[1.55] text-sumi-soft md:pl-6 md:text-[1.25rem]">
    {children}
  </p>
)

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="ml-1 list-outside list-disc space-y-2 pl-5 text-[1.0625rem] leading-[1.7] text-sumi marker:text-nezumi md:text-[1.125rem]">
    {children}
  </ul>
)

export const OL = ({ children }: { children: ReactNode }) => (
  <ol className="ml-1 list-outside list-decimal space-y-2 pl-5 text-[1.0625rem] leading-[1.7] text-sumi marker:text-nezumi md:text-[1.125rem]">
    {children}
  </ol>
)

const linkClass =
  'underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru hover:decoration-hinomaru/40'

/** Link to a /glossary/<slug> page. */
export const G = ({
  slug,
  children,
}: {
  slug: string
  children: ReactNode
}) => (
  <Link to="/glossary/$slug" params={{ slug }} className={linkClass}>
    {children}
  </Link>
)

/** Link to any in-app path (feature route, other blog post, anchor). */
export const A = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className={linkClass}>
    {children}
  </Link>
)

/** External link (Apple Support, etc). Always `noreferrer` for non-Apple. */
export const Ext = ({
  href,
  children,
  noreferrer = true,
}: {
  href: string
  children: ReactNode
  noreferrer?: boolean
}) => (
  <a
    href={href}
    target="_blank"
    rel={noreferrer ? 'noreferrer' : undefined}
    className={linkClass}
  >
    {children}
  </a>
)

/** Apple Support page shorthand: pass the 6-digit numeric id. */
export const Apple = ({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) => (
  <a
    href={`https://support.apple.com/en-us/${id}`}
    target="_blank"
    rel="noreferrer"
    className={linkClass}
  >
    {children}
  </a>
)
