import { createFileRoute } from '@tanstack/react-router'
import { GlossaryIndex } from '#/components/glossary/GlossaryIndex'
import { GLOSSARY_TERMS } from '#/data/glossary/terms'

const SITE_URL = 'https://www.battery-sensei.app'
const PATH = '/glossary'
const PAGE_TITLE = 'Glossary — MacBook battery terms, in plain English'
const PAGE_DESC =
  'Short, sourced definitions of MacBook battery vocabulary: cycle count, optimized battery charging, thermal throttling, calibration, and the rest. Read it as a reference or end-to-end.'

const definedTermSetLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  '@id': `${SITE_URL}${PATH}#termset`,
  name: 'Battery Sensei Glossary',
  description: PAGE_DESC,
  url: `${SITE_URL}${PATH}`,
  inLanguage: 'en',
  hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
    '@type': 'DefinedTerm',
    name: t.title,
    description: t.shortDef,
    url: `${SITE_URL}${PATH}/${t.slug}`,
  })),
}

export const Route = createFileRoute('/glossary/')({
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
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(definedTermSetLd),
      },
    ],
  }),
  component: GlossaryIndex,
})
