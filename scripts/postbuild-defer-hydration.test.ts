import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs build script without type declarations
import { deferHydration } from './postbuild-defer-hydration.mjs'

// Shape of TanStack Start's prerendered output (head preloads + async entry).
const START_HTML =
  '<html><head><link rel="modulepreload" href="/assets/index-A.js"/>' +
  '<link rel="modulepreload" href="/assets/HomePage-B.js"/></head><body><main>Hi</main>' +
  '<script type="module" async="" src="/assets/index-A.js"></script></body></html>'

describe('deferHydration', () => {
  it('moves the entry and its preloads into a loader that runs after first paint', () => {
    const out = deferHydration(START_HTML) as string
    expect(out).not.toContain('<link rel="modulepreload"')
    expect(out).not.toContain('<script type="module"')
    expect(out).toContain('var p=["/assets/index-A.js","/assets/HomePage-B.js"],e="/assets/index-A.js"')
    expect(out).toContain('first-contentful-paint')
    expect(out).toContain('<main>Hi</main>')
  })

  it('leaves pages without a client entry alone', () => {
    expect(deferHydration('<html><body>static</body></html>')).toBeNull()
  })
})
