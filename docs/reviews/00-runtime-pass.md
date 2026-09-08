---
surface: Rendered-state pass (orchestrator)
routes: /, /features, /features/charge-limit, /guides, /glossary, /roadmap, /legal, /privacy, /walkthrough, /checkout, /checkout?tier=support
files_reviewed: n/a (runtime measurement)
findings: { high: 4, medium: 6, low: 2 }
verdict: Block
---

# Rendered-state pass

The twelve surface reviews ran read-only against source. This pass measured the
running app so the claims that need a browser have evidence, and so claims that
looked true in source could be checked.

Method: `pnpm dev` on `http://localhost:5174`, Chrome. Routes loaded in a
same-origin iframe at a fixed width so `getComputedStyle` and
`getBoundingClientRect` report real values. Node `fetch` used for server HTML.
`prefers-color-scheme` was emulated per theme.

## Provenance key

- **VERIFIED**: measured in this session, output quoted below.
- **NOT VERIFIED**: named here with the exact check, not claimed as a finding.

## What the measurement method cannot see

The Browser pane was hidden for part of the session. A hidden pane does not
paint. Values that come from layout or the CSSOM stay correct; values that
depend on paint do not. One check failed for this reason and is listed under
Not verified rather than reported as a finding. Screenshots taken while the
pane was hidden are not evidence and were discarded.

Background colour in the contrast samples is resolved by walking to the nearest
ancestor with an alpha above 0.95. That heuristic is wrong wherever a
translucent layer sits between the text and that ancestor. Two apparent
failures were false positives for exactly this reason and were dropped. See
the false-positives section.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Layout | `src/routes/checkout.tsx:384` | `(t('pricing.support.items', { returnObjects: true }) as string[])[3]` | Render the object's field, matching the locale shape: `items[3].title` (or map `{title, body}` the way the rest of the list does) | `/checkout?tier=support` returns HTTP 200 with 29 characters of visible text. The page is blank and the Yearly Patron purchase cannot start. Confirms `03-pricing-checkout.md`. |
| HIGH | UI | `src/components/RouteFade.tsx:34-42` | `if (supportsViewTransitions()) return children` after an `AnimatePresence` branch below | Render one tree on both sides. Delete the `motion` fallback, or mount the wrapper unconditionally and switch behaviour from an effect | `supportsViewTransitions()` reads `document`, so it is always false during SSR and true in Chrome. Server and client render different trees, hydration fails, and React re-renders the whole app on the client on every route. |
| HIGH | Colors | `src/styles.css:84` | `--nezumi: #8a847c` | Raise the light-theme value until it clears 4.5:1 on `--washi`, `--washi-soft` and `--washi-deep`. The dark theme already carries a corrected `#a49d94` | Measured 3.18:1 on `--washi`, 2.90:1 on `--washi-soft`, 2.57:1 on `--washi-deep`. Body copy at 15.2px renders in it. Five surface reviews reported this independently. |
| HIGH | Accessibility | `src/styles.css:2193` | `[data-reveal] { opacity: 0 }` lifted only by the `IntersectionObserver` in `Reveal.tsx` | Start at `opacity: 1` and let the observer add the entrance, or gate the hidden state behind a `js-enabled` class the script sets | The home page ships 46 `data-reveal` elements in its server HTML. If the script does not run, that content is served and stays invisible. There is no `<noscript>` fallback outside `PolarInlineCheckout.tsx:277`. |
| MEDIUM | Colors | `src/components/sections/Health.tsx` (alert preset chips) | Light theme: `rgb(250,133,10)` on `rgb(252,234,216)`; `rgb(255,56,71)` on `rgb(255,228,218)`; `rgb(33,125,247)` on `rgb(230,233,237)` | Darken each foreground against its own tinted chip until it clears 4.5:1 | Measured 2.12:1 for "Warning" and "5 %", 2.94:1 for "Alert" and "2 %", 3.23:1 for "Info" and "15 %". The label that rescues the colour-alone problem is itself unreadable. |
| MEDIUM | Colors | Product Hunt badge, home, features and roadmap | `bg-[#da552f] ... text-white` at `text-[10px] font-bold` | Darken the fill or drop the badge to the vendor's own asset | White on `#da552f` measures 3.95:1 against a 4.5:1 floor. It is also the only hex literal bypassing the token ramps on these pages. |
| MEDIUM | Accessibility | Nav and Footer, every route | Two `<nav>` elements both expose the accessible name "Primary" | Give the second a distinct name, for example "Primary" and "Mobile" | Two navigation landmarks with the same name give a screen-reader user no way to tell them apart in a landmark list. |
| MEDIUM | Accessibility | Header and Footer, home and feature pages | "Features" links to `#features` and to `/features`; "Pricing" links to `/#pricing` and to `#pricing` | Distinguish the labels, or point both to one destination | Two links with the same accessible name and different destinations. Confirms the dead-hash finding in `02-global-chrome.md`. |
| MEDIUM | Accessibility | `src/routes/checkout.tsx` currency picker | `button.zen-link.tabular-nums` renders at 19x18 and 18x18 CSS px at 320px width | Give each control a 24px minimum box, with padding rather than a larger label | Below the 24x24 minimum target size, on the purchase path. Measured at 320px viewport width. |
| MEDIUM | UI | `src/components/ui/button.tsx:8`, `src/components/ui/switch.tsx:18`, `src/components/ui/tabs.tsx:67`, `src/components/ui/accordion.tsx:42`, `src/components/sections/Compare.tsx:175`, `src/components/sections/Compare.tsx:293` | `transition-all` | Name the properties that change, for example `transition-[color,background-color,box-shadow]` | Six occurrences. `transition: all` animates every animatable property, including ones that change for unrelated reasons. Confirms `12-design-system.md`. |
| LOW | Layout | `src/routes/features.index.tsx` screenshot | `/screenshots/general-dark.png` renders with no `width`/`height` and no `aspect-ratio` | Add intrinsic `width` and `height` | The image reserves no space before it loads, so the content below it shifts. |
| LOW | Colors | Footer and metadata separators | `rgba(244,237,224,0.26)` at 2.16:1 and `text-nezumi/60` at 3.25:1, both on `rgb(21,19,15)` | Raise to 3:1 or make the separation structural | The characters are decorative middots, so the text ratio does not strictly apply, but they are the visible boundary between metadata items. |

## Verification

Checks that ran and passed, with the observed result.

**Checkout crash.** `fetch('http://localhost:5174/checkout?tier=support')` returned
`status 200 bytes 29386 visibleTextLen 29`. The HTML carries:
`Switched to client rendering because the server rendering errored: Objects are
not valid as a React child (found: object with keys {title, body}).`
The same fetch for `?tier=lifetime` and for no query returned
`visibleTextLen 1706` and no error. So the defect is specific to the
Yearly Patron tier.

**Hydration.** React's uncaught error on `/`, captured from the page console:
"Hydration failed because the server rendered HTML didn't match the client. As
a result this tree will be regenerated on the client." Its diff names the
boundary:

```
<OutletImpl>
+   <Suspense fallback={null}>
-   <div className="route-fade-shell" data-tsd-source="/src/components/RouteFade.tsx:45:7" style={{opacity:"1"}}>
```

**Token contrast, light theme.** Read from `getComputedStyle(documentElement)`
with `prefers-color-scheme: light` emulated, converted from hex, WCAG 2.x
relative luminance:

| Foreground | Background | Ratio |
| --- | --- | --- |
| `--nezumi #8a847c` | `--washi #f4ede0` | 3.18 |
| `--nezumi #8a847c` | `--washi-soft #ece3d1` | 2.90 |
| `--nezumi #8a847c` | `--washi-deep #e2d6bd` | 2.57 |
| `--matcha #6f7a3a` | `--washi #f4ede0` | 3.99 |
| `--matcha #6f7a3a` | `--washi-deep #e2d6bd` | 3.23 |
| `--sumi #1c1a17` | `--washi #f4ede0` | 14.91 |

The oklab converter was checked against `oklab(0.760304 0.120004 0.0302564 / 0.8)`
and `oklch(0.7 0.15 40)` before use.

**Accent equals destructive.** Both resolve to `oklch(0.5 0.18 25)` in the light
theme. Confirms `12-design-system.md`.

**Horizontal overflow at 320px.** `documentElement.scrollWidth` equalled
`window.innerWidth` (320) on `/`, `/features`, `/features/charge-limit`,
`/guides`, `/glossary`, `/roadmap`, `/legal`, `/privacy`, `/walkthrough` and
`/checkout`. No element extended past the viewport. **Pass, no finding.**

**Skip link.** From a fresh load of `/`, the first Tab moved focus to
`a` with accessible name "Battery Sensei, home". No skip link precedes it.
Confirms `02-global-chrome.md`.

**Focus indicators, element level.** On `/`, 99 interactive elements were
matched against every `:focus` and `:focus-visible` rule in the document.
Every element matched at least one. The logo, "Contact support", the Language
and Theme triggers and both Download buttons resolve to a visible ring under
real keyboard focus. No element had `outline` removed with no replacement among
its matched rules.

**Devtools.** `TanStackDevtools` at `src/routes/__root.tsx:424` is stripped
from production by `devtools()` in `vite.config.ts:106`, documented in a
comment at `__root.tsx:419-423`. Its `goober` classes were excluded from every
measurement above. **No finding.**

**Headings.** Every route sampled has exactly one `<h1>`. An earlier run
reported zero; that run filtered on a visibility test the heading failed for an
unrelated reason. **No finding.**

### Not verified

- **`.nav-link` focus cue.** `src/styles.css:2182-2188` sets
  `outline: none` and replaces it with `::after { transform: scaleX(1) }`.
  Under real keyboard focus with `:focus-visible` matching, the pseudo-element
  reported `scaleX(0)`. That reading is not trustworthy: a control
  `data-active="true"` element, whose rule is unrelated to focus, reported
  `scaleX(0)` too, so `getComputedStyle(el, '::after')` was returning stale
  values while the pane was not painting. **Check to run with the pane visible:**
  load `/`, press Tab three times, and look at whether an underline appears
  under "Features". Then measure that 1px `--sumi` line against `--washi` for
  the 3:1 non-text minimum. The source-level concern in `02-global-chrome.md`
  stands on its own evidence.
- **200% zoom.** Not tested. Run the 320px sweep again at a 640px viewport with
  the page zoomed to 200%.
- **`prefers-reduced-motion`.** The emulation is not available through these
  tools. `12-design-system.md` traced 29 scoped CSS blocks from source;
  `13-zen-components.md` names `TiltCard` and `MenuBarMockup` as uncovered.
  Confirm both by setting Reduce Motion in macOS and reloading `/`.
- **No-JS rendering.** The `[data-reveal]` finding above is proven from the
  server HTML and the CSS, not from a browser with scripting off. Confirm by
  disabling JavaScript for `localhost:5174` and loading `/`.
- **404 status code.** `scripts/postbuild-404.mjs` produces the right file
  shape. The live status code needs a production deployment.

### False positives found and dropped

Recorded because the same method will produce them again.

- **`MenuBarMockup` white text.** Measured as 1.13:1 to 1.16:1 white on cream in
  light mode. The mockup's own bar is `rgba(28,26,23,0.72)` over a light
  gradient; the background walk skipped it because its alpha is below the 0.95
  threshold. Composited, the pair is near 4.9:1. **Not a finding.**
- **`VideoFacade` label.** Measured as 1:1, label colour equal to the button's
  background. A scrim span at `inset-0` with
  `color-mix(in oklab, var(--washi) 82%, ...)` sits between them. **Not a finding.**
- **`.nav-link` at 1.46:1 in light mode.** Produced by toggling the `.light`
  class on a page that had already rendered dark. Under real
  `prefers-color-scheme: light` the colour is `rgb(74,69,64)`, which passes.
  **Not a finding.**

## Verdict

`Block`. Four HIGH findings remain. The checkout crash and the hydration
mismatch are the two that cost a real visitor something on every visit.
