import { createFileRoute } from '@tanstack/react-router'
import { BlogIndex } from '#/components/blog/BlogIndex'
import { BLOG_POSTS } from '#/data/blog'

const SITE_URL = 'https://www.battery-sensei.app'
const SITE_OPERATOR = '41BIT LLC'
const CONTENT_AUTHOR = 'Sandro Thabiso Schaier'
const PATH = '/guides'
const PAGE_TITLE = 'Guides — Battery Sensei'
const PAGE_DESC =
  'Long-form notes on MacBook battery health, charging behavior, and the macOS settings that actually move the needle. Researched, sourced, plainly written.'

const blogLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': `${SITE_URL}${PATH}#blog`,
  name: 'Battery Sensei Guides',
  description: PAGE_DESC,
  url: `${SITE_URL}${PATH}`,
  inLanguage: 'en',
  publisher: {
    '@type': 'Organization',
    name: SITE_OPERATOR,
    url: SITE_URL,
  },
  blogPost: BLOG_POSTS.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt ?? p.publishedAt,
    url: `${SITE_URL}/guides/${p.slug}`,
    inLanguage: 'en',
    keywords: p.tags?.join(', '),
    author: {
      '@type': 'Person',
      name: CONTENT_AUTHOR,
      url: SITE_URL,
    },
  })),
}

export const Route = createFileRoute('/guides/')({
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
