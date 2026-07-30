import { Link } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Download } from 'lucide-react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { Nav } from '#/components/sections/Nav'
import { Footer } from '#/components/sections/Footer'
import type { BlogPost } from '#/data/blog/types'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

type Props = {
  post: BlogPost
}

export function BlogPostPage({ post }: Props) {
  return (
    <>
      <Nav />
      <main>
        <section className="zen-section mx-auto max-w-3xl px-5 sm:px-6">
          <Reveal as="p" delay={80} className="mb-6">
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sumi-soft transition-colors duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:text-sumi"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              Guides
            </Link>
          </Reveal>

          <div className="flex flex-col items-start">
            <Hanko kanji="筆" className="mb-6" />
            <Reveal as="p" delay={140} className="kicker-row mb-4 flex items-center gap-2">
              <BookOpen className="h-3 w-3" strokeWidth={1.6} aria-hidden />
              <time dateTime={post.publishedAt}>
                {dateFormatter.format(new Date(post.publishedAt))}
              </time>
              <span aria-hidden className="text-[var(--line-strong)]">·</span>
              <span>{post.readingMinutes} min read</span>
            </Reveal>
            <Reveal
              as="h1"
              delay={220}
              className="display-title text-4xl font-semibold leading-[1.06] tracking-[-0.018em] text-sumi md:text-[3.25rem]"
            >
              {post.title}
            </Reveal>
            <Reveal
              as="p"
              delay={320}
              className="mt-6 max-w-2xl text-[1.125rem] italic leading-relaxed text-sumi-soft md:text-[1.25rem]"
            >
              {post.description}
            </Reveal>
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-5 pb-2 pt-10 sm:px-6 md:pt-12">
          <Reveal delay={420} className="space-y-6">
            {post.body()}
          </Reveal>
        </article>

        {post.faqs && post.faqs.length > 0 && (
          <section className="zen-section mx-auto max-w-3xl px-5 pt-6 sm:px-6">
            <Reveal delay={520}>
              <h2 className="display-title mb-7 text-[1.5rem] font-semibold leading-[1.18] tracking-[-0.012em] text-sumi md:text-[1.75rem]">
                Frequently asked.
              </h2>
              <dl className="space-y-7">
                {post.faqs.map((entry) => (
                  <div
                    key={entry.q}
                    className="rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--washi)_70%,var(--paper-lift))] px-5 py-4 md:px-6 md:py-5"
                  >
                    <dt className="display-title text-[1.0625rem] font-medium text-sumi md:text-[1.125rem]">
                      {entry.q}
                    </dt>
                    <dd className="mt-2 text-[1rem] leading-relaxed text-sumi-soft md:text-[1.0625rem]">
                      {entry.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </section>
        )}

        <section className="zen-section mx-auto max-w-3xl px-5 pt-6 sm:px-6">
          <Reveal delay={620} className="mt-2">
            <a
              href="/#free-download-email"
              className="btn-sumi group inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]"
            >
              <Download
                className="h-4 w-4 transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
              Try Battery Sensei free
            </a>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}
