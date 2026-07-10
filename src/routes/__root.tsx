import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights, computeRoute } from '@vercel/speed-insights/react'

import appCss from '../styles.css?url'
// Preload the fonts the above-fold render relies on. Imported as URLs so Vite
// hashes them the same way the @fontsource @import in styles.css does — the
// hashed URL is reused both in the preload links AND in the inline
// `criticalFontCss` @font-face block below so the browser dedupes the fetch.
import spectral500Url from '@fontsource/spectral/files/spectral-latin-500-normal.woff2?url'
import spectral600Url from '@fontsource/spectral/files/spectral-latin-600-normal.woff2?url'
import sourceSans400Url from '@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2?url'
import sourceSans600Url from '@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2?url'

/* Inline @font-face declarations for above-fold fonts. The external stylesheet
   takes ~570 ms to download on cold cache; until it parses, the browser does
   not know which font files to fetch. Inlining @font-face in the document
   head lets font discovery happen during HTML parse — paired with the
   <link rel="preload"> hints below this kicks the font fetches off before
   styles.css arrives. Noto Serif JP files live at /fonts/... (subsetted by
   scripts/subset-noto-jp.mjs); the Latin fonts use Vite-hashed @fontsource
   URLs so the inline declaration matches the URL the rest of the CSS uses. */
const criticalFontCss = `
@font-face{font-family:'Spectral';font-style:normal;font-weight:500;font-display:swap;src:url(${spectral500Url}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Spectral';font-style:normal;font-weight:600;font-display:swap;src:url(${spectral600Url}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Source Sans 3';font-style:normal;font-weight:400;font-display:swap;src:url(${sourceSans400Url}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Source Sans 3';font-style:normal;font-weight:600;font-display:swap;src:url(${sourceSans600Url}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Noto Serif JP';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/noto-serif-jp-400.woff2) format('woff2');}
@font-face{font-family:'Noto Serif JP';font-style:normal;font-weight:900;font-display:swap;src:url(/fonts/noto-serif-jp-900.woff2) format('woff2');}
`
import { FAQ_ITEMS } from '#/components/sections/FAQ'
import { RouteFade } from '#/components/RouteFade'
import { I18nProvider } from '#/lib/i18n/I18nProvider'
import i18n, { DEFAULT_LOCALE, HTML_LANG, isLocale, loadLocale, localeFromPath } from '#/lib/i18n'
import { RouteErrorBoundary, RouteNotFound } from '#/components/CatchBoundary'

const SITE_URL = 'https://www.battery-sensei.app'

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
  operatingSystem: 'macOS 14.0',
  description: DESCRIPTION,
  url: SITE_URL,
  downloadUrl: `${SITE_URL}/download/latest`,
  installUrl: `${SITE_URL}/download/latest`,
  fileSize: '12 MB',
  softwareRequirements: 'macOS 14 Sonoma or later. Apple Silicon or Intel.',
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
  // `a` is an array of paragraphs with `**bold**` Markdown emphasis.
  // Strip the markers + join with double newlines so the schema
  // serves a clean, fully-resolved answer to Google's rich-result
  // crawler. (The on-page renderer keeps the emphasis visually.)
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: a.map((p) => p.replace(/\*\*/g, '')).join('\n\n'),
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
    { '@type': 'HowToSupply', name: 'MacBook running macOS 14 or later' },
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
  // Locale is encoded in the URL path (/de, /es, /fr, /ja); English lives at the
  // root. Resolve it here so SSR/prerender renders <html lang> and the body in
  // the right language for every page (English for non-localized subpages), and
  // so client navigations between language URLs switch the active locale too.
  beforeLoad: async ({ location }) => {
    const fromPath = localeFromPath(location.pathname)
    if (fromPath) {
      // Home variant (/de, /es, /fr, /ja): the URL is authoritative.
      await loadLocale(fromPath)
      if (i18n.language !== fromPath) await i18n.changeLanguage(fromPath)
      return { locale: fromPath }
    }
    // No locale prefix (/, /checkout, /privacy, …). On the server, render the
    // English static HTML. On the client, keep the visitor's active language
    // (cookie-driven via I18nProvider) so a German reader isn't bounced to
    // English when opening a subpage — and their email-signup locale stays put.
    if (typeof window === 'undefined') {
      if (i18n.language !== DEFAULT_LOCALE) await i18n.changeLanguage(DEFAULT_LOCALE)
      return { locale: DEFAULT_LOCALE }
    }
    return { locale: i18n.language }
  },
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
      { property: 'og:image:alt', content: 'Battery Sensei: quiet battery care for your MacBook' },
      { property: 'og:locale', content: 'en_US' },
      // No og:locale:alternate declared: site translations share one URL with
      // `lang="en"` SSR. Advertising alternates that resolve to the same page
      // is a misleading signal. Revisit when /de/, /fr/, etc. exist as crawlable URLs.
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/share-card.png` },
      { name: 'twitter:image:alt', content: 'Battery Sensei: quiet battery care for your MacBook' },
    ],
    links: [
      // Canonical is set per-route (index = "/", $lang = "/<locale>"); other
      // pages self-canonicalize to their own URL. A single site-wide canonical
      // here would wrongly point every subpage at the homepage.
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
      { rel: 'preload', as: 'image', href: '/logo-mark.svg', type: 'image/svg+xml' },
      // Fonts are now self-hosted via @fontsource (see styles.css). No
      // preconnect to fonts.googleapis / fonts.gstatic — those origins are
      // never contacted. Removing the render-blocking Google stylesheet was
      // the biggest single LCP win (Lighthouse flagged ~240 ms render block
      // and ~92 KB of @font-face CSS that was almost entirely unused).
      //
      // Preload the two weights every above-fold page renders: Spectral 500
      // (H1 / section headings) and Source Sans 3 400 (body). The browser
      // can start the fetch in parallel with CSS parsing instead of waiting
      // for the @font-face declaration to be discovered.
      { rel: 'preload', as: 'font', href: spectral500Url, type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', as: 'font', href: sourceSans400Url, type: 'font/woff2', crossOrigin: 'anonymous' },
      // Noto Serif JP 400: hero kanji rail (電池先生 / 静かな力) is above the fold.
      // Self-hosted at /fonts/ so no Vite hashing — plain absolute path.
      { rel: 'preload', as: 'font', href: '/fonts/noto-serif-jp-400.woff2', type: 'font/woff2', crossOrigin: 'anonymous' },
      //
      // `buy.polar.sh` keeps its preconnect: that's the one origin a
      // visitor's BROWSER actually hits directly (the Buy click is a
      // full-page navigation to the hosted Polar checkout).
      { rel: 'preconnect', href: 'https://buy.polar.sh' },
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
  errorComponent: RouteErrorBoundary,
  notFoundComponent: RouteNotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG[isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE]}>
      <head>
        <HeadContent />
        {/* Inline @font-face for above-fold weights. Parsed during HTML load,
            before styles.css arrives — pairs with the preload hints to start
            font fetches immediately on cold cache. */}
        <style dangerouslySetInnerHTML={{ __html: criticalFontCss }} />
      </head>
      <body>
        <I18nProvider>
          <RouteFade>{children}</RouteFade>
        </I18nProvider>
        {/* Vercel Web Analytics — cookieless, no PII, aggregate counts only.
            No-op outside Vercel (dev console logs a notice and does nothing). */}
        <Analytics />
        {/* Vercel Speed Insights — Core Web Vitals from real visits.
            Cookieless, sampled, no PII. No-op outside production. */}
        <VercelSpeedInsights />
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

function VercelSpeedInsights() {
  const route = useRouterState({
    select: (state) => {
      const match = state.matches[state.matches.length - 1]
      return computeRoute(
        state.location.pathname,
        (match?.params ?? null) as Record<string, string | string[]> | null,
      )
    },
  })

  return <SpeedInsights route={route} />
}
