import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import { BLOG_POSTS } from '#/data/blog'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function BlogIndex() {
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex flex-col items-start">
            <Hanko kanji="筆" className="mb-6" />
            <Reveal as="p" delay={120} className="kicker-row mb-4">
              Guides · 手引
            </Reveal>
            <Reveal
              as="h1"
              delay={200}
              className="display-title text-4xl font-semibold leading-[1.04] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              Field notes on MacBook batteries.
              <span className="block italic text-sumi-soft font-normal">
                Long-form guides, plainly written.
              </span>
            </Reveal>
            <Reveal
              as="p"
              delay={300}
              className="mt-6 max-w-2xl text-base leading-relaxed text-sumi-soft md:text-[1.0625rem]"
            >
              The longer reads from Battery Sensei. Each post is researched
              from Apple’s own documentation, independent cycling tests, and
              the way real MacBooks behave day to day. No vendor jargon, no
              affiliate links, just the answers we’d give a friend.
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-2 pt-10 sm:px-6 md:pt-14">
          <Reveal delay={380}>
            <ul className="space-y-10">
              {BLOG_POSTS.map((post) => (
                <li key={post.slug}>
                  <Link
                    to="/guides/$slug"
                    params={{ slug: post.slug }}
                    className="group/post block transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]"
                  >
                    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-nezumi">
                      <BookOpen
                        className="h-3 w-3"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                      <time dateTime={post.publishedAt}>
                        {dateFormatter.format(new Date(post.publishedAt))}
                      </time>
                      <span aria-hidden className="text-[var(--line-strong)]">·</span>
                      <span>{post.readingMinutes} min read</span>
                    </p>
                    <h2 className="display-title mt-2 text-[1.5rem] font-semibold leading-[1.18] tracking-[-0.012em] text-sumi transition-colors group-hover/post:text-hinomaru-ink md:text-[1.875rem]">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-[1rem] leading-relaxed text-sumi-soft md:text-[1.0625rem]">
                      {post.description}
                    </p>
                    {/* Tags were authored on every post and never rendered.
                        With only three posts the index reads as thin; the
                        tags are the one piece of real information already
                        available to tell them apart at a glance. */}
                    {post.tags && post.tags.length > 0 && (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_82%,var(--paper-lift))] px-2.5 py-0.5 text-[11px] text-sumi-soft"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-hinomaru-ink/85 transition-colors group-hover/post:text-hinomaru-ink">
                      Read post
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover/post:translate-x-0.5"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={500} className="mt-14">
            <p className="text-[0.9375rem] leading-relaxed text-sumi-soft">
              Need a quick reference rather than a long read? The{' '}
              <Link
                to="/glossary"
                className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru-ink hover:decoration-hinomaru/40"
              >
                glossary
              </Link>{' '}
              defines the vocabulary that comes up across these posts:
              cycle count, optimized battery charging, calibration, and so
              on.
            </p>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}
