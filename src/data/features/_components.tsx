import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

/** Shared building blocks for the extended-guide section that appears
 * below "Why it matters" on /features/* pages. Same vocabulary as the
 * blog post components (P / H2 / UL / G / A / Apple) — copied here
 * instead of imported so the feature pages don't depend on the blog
 * data module. */

export const P = ({ children }: { children: ReactNode }) => (
  <p className="text-[1rem] leading-[1.75] text-sumi md:text-[1.0625rem]">
    {children}
  </p>
)

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="display-title mt-10 mb-4 text-[1.375rem] font-semibold leading-[1.2] tracking-[-0.01em] text-sumi md:mt-12 md:text-[1.625rem]">
    {children}
  </h2>
)

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="ml-1 list-outside list-disc space-y-2 pl-5 text-[1rem] leading-[1.7] text-sumi marker:text-nezumi md:text-[1.0625rem]">
    {children}
  </ul>
)

const linkClass =
  'underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru hover:decoration-hinomaru/40'

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

export const A = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className={linkClass}>
    {children}
  </Link>
)

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
