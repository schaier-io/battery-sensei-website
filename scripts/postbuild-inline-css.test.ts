import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs build script without type declarations
import { inlineCss } from './postbuild-inline-css.mjs'

const PAGE =
  '<html><head><link rel="stylesheet" href="/assets/styles-A.css" data-precedence="default"/></head>' +
  '<body>Hi</body></html>'

describe('inlineCss', () => {
  it('inlines the CSS and keeps a non-blocking link React can adopt', () => {
    const out = inlineCss(PAGE, () => 'body{color:red}') as string
    expect(out).toContain('<style>body{color:red}</style>')
    expect(out).toContain(
      `<link rel="stylesheet" href="/assets/styles-A.css" data-precedence="default" media="print" onload="this.media='all'"/>`,
    )
    expect(out.match(/rel="stylesheet"/g)).toHaveLength(1)
  })

  it('cannot be closed early by CSS content', () => {
    const out = inlineCss(PAGE, () => 'a::after{content:"</style><script>"}') as string
    expect(out).not.toContain('"</style><script>"')
  })

  it('leaves pages without the site stylesheet alone', () => {
    expect(inlineCss('<html><body>static</body></html>', () => '')).toBeNull()
  })
})
