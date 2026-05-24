import { Suspense, lazy } from 'react'
import { Hanko } from '#/components/zen/Hanko'
import { Reveal } from '#/components/zen/Reveal'
import { BrushTick } from '#/components/zen/BrushTick'
import { BatteryJournal } from '#/components/zen/BatteryJournal'

// Lazy: keeps three.js + R3F (~750 KB) out of the initial route bundle.
const FrameBorder = lazy(() => import('#/components/reactbits/FrameBorder'))

export function Saga() {
  return (
    <section id="saga" className="zen-section relative">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-2">
        <div>
          <Hanko kanji="史" className="mb-5" />
          <Reveal as="p" delay={100} className="kicker-row mb-4">
            Personal history · 個人史
          </Reveal>
          <Reveal
            as="h2"
            delay={180}
            className="section-heading text-sumi"
          >
            A diary your battery
            <span className="block italic text-sumi-soft font-normal">
              would actually keep.
            </span>
          </Reveal>
          <Reveal
            as="p"
            delay={260}
            className="prose-readable mt-7 text-[1.0625rem] text-sumi-soft"
          >
            Every cycle. Every rescue. Every plateau. Sensei keeps a
            plain-English journal of your battery's life so when the day comes
            to retire your MacBook, you know how it lived, what carried it that
            far, and exactly what to ask the next one to do better.
          </Reveal>
          <Reveal as="ul" delay={340} className="mt-8 space-y-3 text-[0.9375rem] text-sumi-soft">
            <li className="flex gap-3">
              <BrushTick className="text-sumi-soft mt-2 shrink-0" />
              247 days, 217 cycles, 92%. Yours, annotated.
            </li>
            <li className="flex gap-3">
              <BrushTick className="text-sumi-soft mt-2 shrink-0" />
              Updated quietly as you live, no setup.
            </li>
            <li className="flex gap-3">
              <BrushTick className="text-sumi-soft mt-2 shrink-0" />
              Lives on your Mac. No cloud. No account.
            </li>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative flex items-center justify-center">
          <div className="relative aspect-[3/4] w-full max-w-xs">
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <BatteryJournal className="w-full" />
                </div>
              }
            >
              <FrameBorder
                className="relative rounded-sm"
                color="#1c1a17"
                backgroundColor="#f4ede0"
                speed={1.36}
                borderWidth={0.5}
                falloff={1}
                noiseScale={7.5}
                noiseStrength={5}
                noiseOctaves={5}
                intensity={1}
                gamma={2}
                opacity={1}
              >
                <div className="absolute inset-0 flex items-center justify-center p-7 sm:p-8">
                  <BatteryJournal className="w-full rotate-[-1.4deg] transition-transform duration-500 hover:rotate-0" />
                </div>
              </FrameBorder>
            </Suspense>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
