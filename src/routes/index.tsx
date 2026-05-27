import { createFileRoute } from '@tanstack/react-router'
import { Nav } from '#/components/sections/Nav'
import { Hero } from '#/components/sections/Hero'
import { Features } from '#/components/sections/Features'
import { Saga } from '#/components/sections/Saga'
import { Health } from '#/components/sections/Health'
import { FAQ } from '#/components/sections/FAQ'
import { Pricing } from '#/components/sections/Pricing'
import { Compare } from '#/components/sections/Compare'
import { Footer } from '#/components/sections/Footer'
import { Categories } from '#/components/sections/Categories'
import { Contact } from '#/components/sections/Contact'
import { BrushDivider } from '#/components/zen/BrushDivider'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Categories />
        <Features />
        <BrushDivider />
        <Saga />
        <BrushDivider />
        <Health />
        <BrushDivider />
        <Compare />
        <BrushDivider />
        {/* Pricing carries the canonical Free download flow (email
            capture → /download/latest). The previous standalone Download
            section duplicated this story; removed to give the page a
            single point of conversion. Every "Download for macOS" CTA
            elsewhere on the site now scrolls here. */}
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
