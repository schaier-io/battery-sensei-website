import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

import appCss from '../styles.css?url'
import { FAQ_ITEMS } from '#/components/sections/FAQ'
import { I18nProvider } from '#/lib/i18n/I18nProvider'

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
    // Schema.org consumers (Google, Bing) only need a representative
    // square mark; the 264 KB `app-icon.png` was overkill. The
    // 256-square WebP-converted PNG is ~38 KB and still well above the
    // 112×112 Google Rich Results minimum.
    `${SITE_URL}/app-icon-256.png`,
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

// ISO date of the last meaningful page edit. Injected at build time by
// vite.config.ts (`__LAST_UPDATED__`), which reads the most recent commit
// date that touched routes/components/i18n/public docs. Falls back to today
// if git is unavailable (e.g. sandbox builds), so the schema always carries
// a valid YYYY-MM-DD without manual maintenance.
declare const __LAST_UPDATED__: string
const LAST_UPDATED: string =
  typeof __LAST_UPDATED__ !== 'undefined'
    ? __LAST_UPDATED__
    : new Date().toISOString().slice(0, 10)

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
  tool: [{ '@type': 'HowToTool', name: 'Battery Sensei (free .pkg installer)' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Download Battery Sensei',
      text: 'Download the notarized .pkg installer from battery-sensei.app and run it. macOS installs the app to Applications. No account needed.',
      url: `${SITE_URL}#download`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Set a charge limit',
      text: 'Open Battery Sensei from the menu bar and pick a cap (the default 80% slows chemical aging per Apple guidance). Sensei holds the limit in the background.',
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
      // PNG only: tried a WebP-first multi-image set but TanStack Start's meta
      // manager collapses duplicate `property` entries, keeping only the last.
      // PNG is universally supported by every OG card consumer (iMessage, Slack,
      // Discord, Twitter, Facebook, LinkedIn); the ~80 KB WebP saving isn't
      // worth the risk of one client rendering a broken card. Revisit if/when
      // TanStack Start supports preserving duplicate-property meta tags.
      { property: 'og:image', content: `${SITE_URL}/share-card.png` },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Battery Sensei — quiet power for your MacBook' },
      { property: 'og:locale', content: 'en_US' },
      // No og:locale:alternate declared: site translations share one URL with
      // `lang="en"` SSR. Advertising alternates that resolve to the same page
      // is a misleading signal. Revisit when /de/, /fr/, etc. exist as crawlable URLs.
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
      // Preload the Nav logo — it's the first above-fold <img> and a likely
      // LCP candidate. Paired with `fetchpriority="high"` + `loading="eager"`
      // on the <img> itself; the preload kicks the request off before React
      // has hydrated the tree. `imagesrcset` matches the Nav's srcSet so the
      // browser picks the right DPI.
      // Note: passing `imageSrcSet` / `fetchPriority` (React 19 camelCase) here
      // tripped a "did you mean imageSrcSet?" warning under TanStack Start's
      // link spreader. Sticking to `href` + `type` keeps the preload effective
      // (browser fetches the WebP at 1x DPR) without the false-positive devtool
      // noise; HiDPI DPR will request via the Nav's srcSet on hydration.
      { rel: 'preload', as: 'image', href: '/logo-256.webp', type: 'image/webp' },
      // Fonts: preconnect first, then the stylesheet itself — loading it from
      // <head> (instead of a CSS @import inside styles.css) lets the browser
      // fetch fonts in parallel with the app CSS instead of chaining the two.
      // Weights trimmed to what the design uses: Spectral 400/500/600 + 400i,
      // Source Sans 3 400/500/600/700, Noto Serif JP 400/700/900.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      // Polar preconnect trio:
      //   - api.polar.sh: client POSTs to /api/checkout-session which
      //     proxies to api.polar.sh, AND the embed iframe loads pages
      //     that postMessage from polar.sh after the session URL renders
      //   - polar.sh: postMessage origin for the embed's success/close
      //     events; also the cookie domain Polar uses
      //   - buy.polar.sh: the fallback Checkout Link domain we
      //     full-page-redirect to if the session-create API is down
      // All three are TLS-warmed up-front so the Buy click feels instant.
      { rel: 'preconnect', href: 'https://api.polar.sh' },
      { rel: 'preconnect', href: 'https://polar.sh' },
      { rel: 'preconnect', href: 'https://buy.polar.sh' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Source+Sans+3:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;700;900&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
    scripts: [
      // Polar's checkout is a plain hosted page (buy.polar.sh/...) — no
      // overlay JS to load. The click is a normal navigation, which is why
      // we only preconnect to buy.polar.sh above and ship no extra script.
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
        <I18nProvider>{children}</I18nProvider>
        {/* Vercel Web Analytics — cookieless, no PII, aggregate counts only.
            No-op outside Vercel (dev console logs a notice and does nothing). */}
        <Analytics />
        {/* Vercel Speed Insights — Core Web Vitals from real visits.
            Cookieless, sampled, no PII. No-op outside production. */}
        <SpeedInsights />
        {/* No DEV guard — `@tanstack/devtools-vite` strips this entire
            element (and its imports) from production builds automatically.
            Wrapping it in `import.meta.env.DEV && (...)` breaks the plugin's
            transform on devtools-vite >= 0.7 because the strip leaves
            `&& ()` behind. */}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
