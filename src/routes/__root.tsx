import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'
import { FAQ_ITEMS } from '#/components/sections/FAQ'

const SITE_URL = 'https://battery-sensei.app'

// Title: 58 chars. Primary kw ("MacBook Battery") at the front, value-pop
// after, brand at the end. Punctuation chosen to render as a compact title
// in SERPs without dropping the brand on truncation.
const TITLE =
  'MacBook Battery Health, Limits & Alerts · Battery Sensei'

// Description: 156 chars. Hook + the three concrete benefits + trial/price
// + privacy/performance trust signal. Reads as a single sentence in SERPs.
const DESCRIPTION =
  'macOS menu-bar app for MacBook battery health. Smart alerts, charge limit, Travel Mode, cycle tracking. 5-day free trial (no card), $3.99 once. Native, <1% impact.'

// Kept for legacy crawlers — Google ignores `keywords`, Bing weighs it lightly.
const KEYWORDS =
  'MacBook battery, macOS battery monitor, battery health app, smart battery warnings, charge limit Mac, travel mode Mac, battery cycle count, low battery alert, menu bar app, optimised battery charging, AlDente alternative, MacBook battery percentage, battery saver Mac'

const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Battery Sensei',
  alternateName: '電池先生',
  applicationCategory: 'UtilitiesApplication',
  applicationSubCategory: 'BatteryUtility',
  operatingSystem: 'macOS 13.0',
  description: DESCRIPTION,
  url: SITE_URL,
  downloadUrl: `${SITE_URL}/download/latest`,
  installUrl: `${SITE_URL}/download/latest`,
  fileSize: '12 MB',
  softwareRequirements: 'macOS 13 Ventura or later. Apple Silicon or Intel.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free trial',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: '5-day free trial of Battery Sensei Premium. No card required.',
    },
    {
      '@type': 'Offer',
      name: 'Sensei Premium',
      price: '3.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'One-time purchase. Lifetime license, all future Premium features.',
      url: `${SITE_URL}#pricing`,
    },
  ],
  featureList: [
    'Smart low-battery alerts (Zen, Regular, Senpai presets)',
    'Charge limit with one-click Travel Mode',
    'Battery cycle and capacity tracking',
    'Personal battery history with plain-English timeline',
    'Menu-bar live charge and watts readout',
    'Heat-throttling awareness',
    'Privacy-first, runs entirely on your Mac',
  ],
  inLanguage: ['en', 'de', 'es', 'fr', 'ja'],
  image: [
    `${SITE_URL}/app-icon.png`,
    `${SITE_URL}/share-card.png`,
  ],
  screenshot: `${SITE_URL}/share-card.png`,
  author: {
    '@type': 'Organization',
    name: 'Battery Sensei',
    url: SITE_URL,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Battery Sensei',
    url: SITE_URL,
  },
}

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Battery Sensei',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  sameAs: ['https://github.com/schaier-io/battery-sensei-releases'],
}

const webSiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE_URL,
  name: 'Battery Sensei',
  inLanguage: 'en',
  publisher: { '@type': 'Organization', name: 'Battery Sensei', url: SITE_URL },
}

const faqPageLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: a,
    },
  })),
}

// ISO date of the last meaningful page edit. Bumped manually when content
// (not just code) changes so AI systems can see freshness.
const LAST_UPDATED = '2026-05-20'

// HowTo schema — eligible for Google's "HowTo" rich result + frequently
// reused by AI Overviews for procedural queries like "How to limit charge
// on Mac" or "How to extend MacBook battery life".
const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to extend MacBook battery life with Battery Sensei',
  description:
    'Install Battery Sensei, set a charge limit, configure low-battery alerts, and keep a personal battery history. Free, native macOS, runs entirely on your Mac.',
  totalTime: 'PT3M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
  supply: [
    { '@type': 'HowToSupply', name: 'MacBook running macOS 13 or later' },
  ],
  tool: [{ '@type': 'HowToTool', name: 'Battery Sensei (free .dmg)' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Download Battery Sensei',
      text: 'Download the notarized .dmg from battery-sensei.app and drag the app into Applications. No account needed.',
      url: `${SITE_URL}#download`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Set a charge limit',
      text: 'Open Battery Sensei from the menu bar and pick a cap (the default 85% slows chemical aging per Apple guidance). Sensei holds the limit in the background.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Pick a warning preset',
      text: 'Choose Zen, Regular, or Senpai. Each preset escalates differently as battery drops; Regular fires Info at 15%, Warning at 5%, and Alert at 2%.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Use Travel Mode before a trip',
      text: 'Click Travel Mode to top up to 100% for one cycle. Sensei drops back to your normal cap once you are home.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Read your battery history',
      text: 'Open the Saga view to see cycles, capacity, and plateaus in plain English. Everything stays on your Mac.',
    },
  ],
}

// WebPage schema with author + dates so freshness is unambiguous to AI.
const webPageLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}#webpage`,
  url: SITE_URL,
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: 'en',
  isPartOf: { '@id': SITE_URL },
  primaryImageOfPage: `${SITE_URL}/share-card.png`,
  datePublished: '2025-09-01',
  dateModified: LAST_UPDATED,
  author: {
    '@type': 'Organization',
    name: 'Battery Sensei',
    url: SITE_URL,
  },
  about: { '@type': 'SoftwareApplication', name: 'Battery Sensei' },
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#f4ede0' },
      { name: 'color-scheme', content: 'light dark' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'keywords', content: KEYWORDS },
      { name: 'application-name', content: 'Battery Sensei' },
      { name: 'apple-mobile-web-app-title', content: 'Battery Sensei' },
      { name: 'author', content: 'Battery Sensei' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' },
      { name: 'format-detection', content: 'telephone=no' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'Battery Sensei' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: `${SITE_URL}/share-card.png` },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Battery Sensei — quiet power for your MacBook' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:locale:alternate', content: 'de_DE' },
      { property: 'og:locale:alternate', content: 'es_ES' },
      { property: 'og:locale:alternate', content: 'fr_FR' },
      { property: 'og:locale:alternate', content: 'ja_JP' },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/share-card.png` },
      { name: 'twitter:image:alt', content: 'Battery Sensei — quiet power for your MacBook' },
    ],
    links: [
      { rel: 'canonical', href: SITE_URL },
      { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
      { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/favicon.png' },
      { rel: 'shortcut icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
      // Connection setup for the Google Fonts the styles import — saves
      // ~100ms on first paint on cold connections.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'preconnect', href: 'https://app.lemonsqueezy.com' },
      { rel: 'stylesheet', href: appCss },
    ],
    scripts: [
      // Lemon.js — powers the overlay checkout for the Premium tier.
      // Defers so it never blocks first paint; the inline initializer below
      // calls `createLemonSqueezy()` once the global is ready, which then
      // intercepts clicks on anchors with class="lemonsqueezy-button".
      {
        src: 'https://app.lemonsqueezy.com/js/lemon.js',
        defer: true,
      },
      {
        children:
          '(function(){function r(){if(window.createLemonSqueezy){window.createLemonSqueezy()}else{setTimeout(r,80)}}if(document.readyState!=="loading"){r()}else{document.addEventListener("DOMContentLoaded",r)}})();',
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(softwareApplicationLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(organizationLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(webSiteLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(faqPageLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(howToLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(webPageLd),
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
