import { createFileRoute, notFound } from '@tanstack/react-router'
import { BlogPostPage } from '#/components/blog/BlogPost'
import { BLOG_POSTS, POSTS_BY_SLUG } from '#/data/blog'

const SITE_URL = 'https://www.battery-sensei.app'

export const Route = createFileRoute('/blog/$slug')({
  // Match the glossary pattern — resolve post per lifecycle from the static
  // map rather than passing it through the loader, since `body: () => JSX`
  // would break Tanstack's wire serializer.
  beforeLoad: ({ params }) => {
    if (!POSTS_BY_SLUG[params.slug]) throw notFound()
  },
  staticData: {
    paths: BLOG_POSTS.map((p) => ({ slug: p.slug })),
  },
  head: ({ params }) => {
    const post = params?.slug ? POSTS_BY_SLUG[params.slug] : undefined
    if (!post) return { meta: [{ title: 'Journal — Battery Sensei' }] }

    const pageUrl = `${SITE_URL}/blog/${post.slug}`

    const blogPostingLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${pageUrl}#post`,
      headline: post.title,
      description: post.description,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      inLanguage: 'en',
      keywords: post.tags?.join(', '),
      wordCount: estimateWords(post.readingMinutes),
      timeRequired: `PT${post.readingMinutes}M`,
      author: {
        '@type': 'Organization',
        name: 'Battery Sensei',
        url: SITE_URL,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Battery Sensei',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo-512.webp`,
        },
      },
      image: [`${SITE_URL}/share-card.png`],
    }

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Battery Sensei', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl },
      ],
    }

    const scripts: Array<{ type: string; children: string }> = [
      { type: 'application/ld+json', children: JSON.stringify(blogPostingLd) },
      { type: 'application/ld+json', children: JSON.stringify(breadcrumbLd) },
    ]

    if (post.faqs && post.faqs.length > 0) {
      const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((entry) => ({
          '@type': 'Question',
          name: entry.q,
          acceptedAnswer: { '@type': 'Answer', text: entry.a },
        })),
      }
      scripts.push({ type: 'application/ld+json', children: JSON.stringify(faqLd) })
    }

    return {
      meta: [
        { title: `${post.title} — Battery Sensei` },
        { name: 'description', content: post.description },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: pageUrl },
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.description },
        { property: 'article:published_time', content: post.publishedAt },
        { property: 'article:modified_time', content: post.updatedAt ?? post.publishedAt },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: post.title },
        { name: 'twitter:description', content: post.description },
      ],
      links: [{ rel: 'canonical', href: pageUrl }],
      scripts,
    }
  },
  component: BlogPostRoute,
})

function BlogPostRoute() {
  const { slug } = Route.useParams()
  const post = POSTS_BY_SLUG[slug]
  if (!post) return null
  return <BlogPostPage post={post} />
}

/** Rough word-count estimate for Schema.org `wordCount` — based on
 * ~225 wpm average reading speed. Off by 10–20%; good enough for SEO. */
function estimateWords(minutes: number): number {
  return Math.round(minutes * 225)
}
