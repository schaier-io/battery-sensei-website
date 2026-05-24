import { createFileRoute } from '@tanstack/react-router'
import { Nav } from '#/components/sections/Nav'
import { Hero } from '#/components/sections/Hero'
import { Features } from '#/components/sections/Features'
import { Saga } from '#/components/sections/Saga'
import { Health } from '#/components/sections/Health'
import { FAQ } from '#/components/sections/FAQ'
import { Pricing } from '#/components/sections/Pricing'
import { Download } from '#/components/sections/Download'
import { Footer } from '#/components/sections/Footer'
import { Categories } from '#/components/sections/Categories'
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
        <Pricing />
        <BrushDivider />
        <FAQ />
        <BrushDivider />
        <Download />
      </main>
      <Footer />
    </>
  )
}
