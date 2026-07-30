import { Nav } from '#/components/sections/Nav'
import { Hero } from '#/components/sections/Hero'
import { Features } from '#/components/sections/Features'
import { Health } from '#/components/sections/Health'
import { FAQ } from '#/components/sections/FAQ'
import { Pricing } from '#/components/sections/Pricing'
import { Compare } from '#/components/sections/Compare'
import { Footer } from '#/components/sections/Footer'
import { Categories } from '#/components/sections/Categories'
import { Contact } from '#/components/sections/Contact'
import { BrushDivider } from '#/components/zen/BrushDivider'

/**
 * The full marketing home composition. Rendered by both `/` (English) and the
 * `/$lang` localized routes (`/de`, `/es`, `/fr`, `/ja`) so every language has
 * its own crawlable, prerendered URL with the same content, just translated.
 */
export function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Categories />
        <Features />
        <BrushDivider />
        <Health />
        <BrushDivider />
        <Compare />
        <BrushDivider />
        <Pricing />
        <BrushDivider />
        <FAQ />
        <BrushDivider />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
