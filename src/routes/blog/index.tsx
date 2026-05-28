import { createFileRoute } from '@tanstack/react-router'
import { BlogIndex } from '#/components/blog/BlogIndex'
import { BLOG_POSTS } from '#/data/blog'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/blog'
const PAGE_TITLE = 'Journal — Battery Sensei'
const PAGE_DESC =
  'Long-form notes on MacBook battery health, charging behavior, and the macOS settings that actually move the needle. Researched, sourced, plainly written.'

const blogLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': `${SITE_URL}${PATH}#blog`,
  name: 'Battery Sensei Journal',
  description: PAGE_DESC,
  url: `${SITE_URL}${PATH}`,
  inLanguage: 'en',
  publisher: {
    '@type': 'Organization',
    name: 'Battery Sensei',
    url: SITE_URL,
  },
  blogPost: BLOG_POSTS.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt ?? p.publishedAt,
    url: `${SITE_URL}/blog/${p.slug}`,
    inLanguage: 'en',
    keywords: p.tags?.join(', '),
    author: {
      '@type': 'Organization',
      name: 'Battery Sensei',
      url: SITE_URL,
    },
  })),
}

export const Route = createFileRoute('/blog/')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESC },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESC },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(blogLd) }],
  }),
  component: BlogIndex,
})
