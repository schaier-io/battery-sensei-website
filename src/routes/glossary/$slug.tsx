import { createFileRoute, notFound } from '@tanstack/react-router'
import { GlossaryTermPage } from '#/components/glossary/GlossaryTerm'
import { GLOSSARY_TERMS, TERMS_BY_SLUG } from '#/data/glossary/terms'

const SITE_URL = 'https://www.battery-sensei.app'

export const Route = createFileRoute('/glossary/$slug')({
  // The TanStack Start streamer can't serialize the term object because
  // it carries a `body: () => ReactNode` factory. We resolve the term in
  // each lifecycle (beforeLoad / head / component) directly from the
  // static map keyed by params.slug, so nothing crosses the wire.
  beforeLoad: ({ params }) => {
    if (!TERMS_BY_SLUG[params.slug]) throw notFound()
  },
  staticData: {
    // Prerender hint: enumerate every concrete slug so the Vite crawler
    // can ship them as static HTML even if the index ever skips a row.
    paths: GLOSSARY_TERMS.map((t) => ({ slug: t.slug })),
  },
  head: ({ params }) => {
    const term = params?.slug ? TERMS_BY_SLUG[params.slug] : undefined
    if (!term) {
      return {
        meta: [{ title: 'Glossary — Battery Sensei' }],
      }
    }
    const pageUrl = `${SITE_URL}/glossary/${term.slug}`
    const pageTitle = `${term.title} — Battery Sensei glossary`
    const pageDesc = term.shortDef
    const definedTermLd = {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': `${pageUrl}#term`,
      name: term.title,
      description: pageDesc,
      url: pageUrl,
      inLanguage: 'en',
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        '@id': `${SITE_URL}/glossary#termset`,
        name: 'Battery Sensei Glossary',
        url: `${SITE_URL}/glossary`,
      },
    }
    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Battery Sensei',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Glossary',
          item: `${SITE_URL}/glossary`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: term.title,
          item: pageUrl,
        },
      ],
    }
    return {
      meta: [
        { title: pageTitle },
        { name: 'description', content: pageDesc },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: pageUrl },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: pageDesc },
      ],
      links: [{ rel: 'canonical', href: pageUrl }],
      scripts: [
        { type: 'application/ld+json', children: JSON.stringify(definedTermLd) },
        { type: 'application/ld+json', children: JSON.stringify(breadcrumbLd) },
      ],
    }
  },
  component: GlossaryTermRoute,
})

function GlossaryTermRoute() {
  const { slug } = Route.useParams()
  const term = TERMS_BY_SLUG[slug]
  if (!term) {
    return null
  }
  return <GlossaryTermPage term={term} />
}
