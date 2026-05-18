import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

const SITE_URL = 'https://battery-sensei.app'
const TITLE =
  'Battery Sensei — MacBook battery warnings, charge limits & history for macOS'
const DESCRIPTION =
  'A calm macOS menu-bar app for MacBook battery health. Smart low-battery warnings, one-click charge limits with Travel Mode, cycle tracking, and a personal battery history. Free, notarized, privacy-first. macOS 13+.'
const KEYWORDS =
  'MacBook battery, macOS battery monitor, battery health app, smart battery warnings, charge limit Mac, travel mode Mac, battery cycle count, low battery alert, menu bar app, optimised battery charging, AlDente alternative, MacBook battery percentage, battery saver Mac'

const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Battery Sensei',
  alternateName: '電池先生',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'macOS 13.0',
  description: DESCRIPTION,
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Smart low-battery warnings (Zen / Alert / Critical modes)',
    'Charge limit control with one-click Travel Mode',
    'Battery cycle count tracking',
    'Personal battery history and capacity timeline',
    'Menu-bar live battery readout',
    'Privacy-first — runs entirely on your Mac',
  ],
  inLanguage: ['en', 'de', 'es', 'fr', 'ja'],
  image: `${SITE_URL}/app-icon.png`,
}

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Battery Sensei',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#f4ede0' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'keywords', content: KEYWORDS },
      { name: 'application-name', content: 'Battery Sensei' },
      { name: 'apple-mobile-web-app-title', content: 'Battery Sensei' },
      { name: 'author', content: 'Battery Sensei' },
      { name: 'robots', content: 'index, follow' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'Battery Sensei' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: `${SITE_URL}/share-card.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Battery Sensei — quiet power for your MacBook' },
      { property: 'og:locale', content: 'en_US' },
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
      { rel: 'stylesheet', href: appCss },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(softwareApplicationLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(organizationLd),
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
