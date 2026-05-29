import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '#/components/HomePage'
import { alternateLinks, localeUrl } from '#/lib/seo'

// English home at "/". Title/description/OG come from the root head (English
// defaults); here we add the self-canonical and the hreflang cluster so this
// page and the /de /es /fr /ja variants reference each other consistently.
export const Route = createFileRoute('/')({
  head: () => ({
    links: [{ rel: 'canonical', href: localeUrl('en') }, ...alternateLinks()],
  }),
  component: HomePage,
})
