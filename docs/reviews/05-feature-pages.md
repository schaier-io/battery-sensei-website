---
surface: Feature pages
routes: /features and the 14 /features/<name> pages
files_reviewed: 32
findings: { high: 1, medium: 10, low: 2 }
verdict: Block
---

# Feature pages interface review

## Scope and coverage

**Scope.** The feature-page surface: `/features` (hub) and the 14 `/features/<slug>` pages.
Files inspected: `src/routes/features.index.tsx`, the 14 `src/routes/features.*.tsx` route
files, `src/components/FeaturePage.tsx`, `src/components/ScreenshotMockup.tsx`,
`src/components/screenshot-dimensions.ts`, `src/data/features/_components.tsx` and the 14
`src/data/features/*.tsx` content files. Supporting evidence read outside that set:
`src/styles.css` (token values, `.paper-card`, `[data-reveal]`, reduced-motion blocks),
`src/lib/i18n/locales/{en,de,es,fr,ja}.json` (the `featurePages` namespace this surface
renders), `src/components/zen/{Reveal,Hanko,BatteryJournal}.tsx` and the 28 PNGs in
`public/screenshots/`.

**Stack and conventions.** TanStack Start + TanStack Router, React 19, Tailwind v4.3,
react-i18next with 5 locales, `lucide-react` icons. Colors come from CSS custom properties in
`src/styles.css` (`--sumi`, `--washi`, `--line`, `--nezumi`, `--card`) exposed as Tailwind
theme colors. Surfaces come from the `.paper-card` component class. Scroll entrances come from
`<Reveal>` writing `data-revealed`, with a `prefers-reduced-motion: reduce` branch at
`src/styles.css:2336`.

**Project convention documents found.** `CONTEXT.md` (glossary: Pro, Lifetime, Yearly Patron,
Guides, Feature pages, Saga; "Premium", "Journal" and "Battery Journal" retired) and
`PRODUCT.md` (register, design principles, accessibility bar). No `CONTRIBUTING.md`,
`CODING_STANDARDS.md` or design-system doc.

**Review boundary.** Nav, Footer, locale and theme switchers, Pricing and `src/components/ui/*`
were excluded per the surface prompt. No browser was used, per the shared brief. Every claim
that needs a rendered page is in **Not verified**.

**Terminology check (requested).** Clear. The retired copy is already gone. `featurePages.indexHeading`
is "Fourteen pages," / "one per feature." in all five locales (`en.json:693`, plus the de, es, fr
and ja equivalents). No occurrence of "Premium", "Battery Journal" or "Journal" as a visible label
anywhere in the surface. `featurePages.backLink` is "All feature pages". Every visible reference to
the history feature says "Saga" (`en.json` `battery-journal.heading`, `features.battery-journal.tsx:8`,
`features.index.tsx:120`, `honors.tsx:25`, `charge-limit.tsx:47`). The word "guide" survives only in
source comments and in `/guides/*` link targets, which is the correct name for the articles. The one
residue is in slugs and identifiers, reported as LOW-2.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Heading outline across template plus all 14 composed pages; alt text on all 15 image instances; accessible names on every link; list semantics and nesting on the hub; keyboard path through the 14 cards; `prefers-reduced-motion` branch for `[data-reveal]` and `[data-stamp]`; hit-area geometry of the back link and the CTA; `aria-hidden` on the Hanko and the decorative washes | 3 findings |
| Layout | Section order in `FeaturePage.tsx`; grouping and spacing on the hub; `max-w-3xl` measure; grid collapse at `sm`; rendered screenshot height against the content column; logical vs physical spacing properties | 1 finding |
| Writing | All `featurePages.*` strings in 5 locales; the 14 `extended` blocks and 41 FAQ entries; every button and link label; CTA vocabulary across hub and template; terminology against `CONTEXT.md` | 3 findings |
| Typography | Heading scale h1 to h2 across template and content files; line-height and measure; `text-balance` use; apostrophe and quote characters across all 15 authored files; smallest rendered sizes | 1 finding |
| Colors | Token values for `--nezumi`, `--sumi-soft`, `--card`, `--washi-deep`, `--line`, `--paper-lift` in both themes; computed contrast for 9 declared foreground/background pairs; hardcoded values in the surface | 1 finding |
| UI | `.paper-card` radius, border and shadow against nested image radius; image outline rule; hover and transition declarations; icon stroke weights; screenshot payload and intrinsic sizing | 4 findings |

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/components/FeaturePage.tsx:105`, `src/routes/features.index.tsx:271` | `<figcaption className="relative mt-5 text-center text-[12px] tracking-[0.06em] text-nezumi">` renders `--nezumi: #8a847c` on the `.paper-card` gradient, computed **3.39:1** at the top stop and **3.36:1** at the bottom stop | Point the caption at a role token that passes at 12px. `text-sumi-soft` (`#4a4540`) on the same surface computes **8.14:1**. If the muted look must stay, darken the light-mode `--nezumi` until the pair clears 4.5:1 and remeasure | Measure the rendered pair. 12px is below the 18.66px large-text boundary, so WCAG 1.4.3 requires 4.5:1. Every screenshot caption on all 14 feature pages and both hub screenshots fails in light mode. Dark mode passes at 6.75:1, so the defect is invisible to anyone testing in dark |
| MEDIUM | UI | `src/components/ScreenshotMockup.tsx:54` | `className="mx-auto h-auto w-full rounded-lg border border-[var(--line)]"`, where `--line` is `rgba(28, 26, 23, 0.14)` light and `rgba(244, 237, 224, 0.14)` dark (`src/styles.css:99,176`) | `className="mx-auto h-auto w-full rounded-lg outline outline-1 -outline-offset-1 outline-[oklch(0_0_0/0.1)] dark:outline-[oklch(1_0_0/0.1)]"` | Image outlines. Both values are warm tinted neutrals derived from the ink and paper hues, not pure black and pure white. A tinted outline picks up the surface underneath and reads as dirt on the image edge. One component, 15 rendered instances |
| MEDIUM | UI | `src/components/FeaturePage.tsx:97` with `src/components/ScreenshotMockup.tsx:54`; `src/routes/features.index.tsx:269` | Outer `figure` is `.paper-card` at `border-radius: 6px` (`src/styles.css:882`) with `p-6 md:p-8` (24px, 32px) and `p-4 md:p-5` (16px, 20px); the image inside carries `rounded-lg` (8px) | Set the image square inside the padded card: drop `rounded-lg` from `ScreenshotMockup.tsx:54` | Concentric border radius: outer = inner + padding. Here the inner radius (8px) is larger than the outer (6px) while 24px of padding sits between them, which is the inverse of the rule. The corner curvature reads as two unrelated shapes on every screenshot figure |
| MEDIUM | Accessibility | `src/components/FeaturePage.tsx:124` | `<p className="display-title mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sumi-soft">{t('featurePages.whyItHeading')}</p>` | `<h2 className="display-title mb-2 text-[11px] ...">{t('featurePages.whyItHeading')}</h2>` | Structure is navigation. "Why it matters" is the label for a distinct section, is styled as a heading and sits between the `h1` and the `h2`s of the extended block, but it is not in the heading outline. A screen-reader user navigating by heading jumps from the page title straight past it on all 14 pages. The FAQ label two blocks down is already a real `h2` (`FeaturePage.tsx:146`), so the markup contradicts itself |
| MEDIUM | Accessibility | `src/components/FeaturePage.tsx:55-61` | `<Link to="/features" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] ...">` with no vertical padding. Inherited `--leading-body: 1.65` (`src/styles.css:318`) gives a 19.8px line box, so the target is about 20px tall | Extend the target without moving the text: `className="inline-flex items-center gap-2 py-2 -my-2 text-[12px] ..."` | Minimum hit area. This is the only in-page navigation control on all 14 feature pages and it is about 20px tall. It clears WCAG 2.5.8 only through the spacing exception, and sits well under the 44x44px touch aim in `better-accessibility`. On a phone it is a thin strip of 12px uppercase text |
| MEDIUM | UI | `src/components/ScreenshotMockup.tsx:35-46` | `href={\`/screenshots/${name}-light.png\`}` and `aria-label={\`${alt} (opens the full-size screenshot)\`}`, while the `<source media="(prefers-color-scheme: dark)">` above shows `${name}-dark.png` | Resolve the target from the same preference, for example with a second `<a>` swapped by a `hidden dark:block` pair, or point the link at a route that redirects on the `Sec-CH-Prefers-Color-Scheme` hint | A link must go where it says it goes. In dark mode the reader sees the dark screenshot, clicks it, and a light screenshot opens in a new tab. It looks like the wrong image loaded. Affects all 13 screenshot feature pages and both hub screenshots |
| MEDIUM | Writing | `src/components/FeaturePage.tsx:147`; `src/routes/features.index.tsx:237, 338, 345` | `Frequently asked.`, `Coming soon`, `Download Battery Sensei` and `See pricing` are hardcoded English inside components that call `t()` for every neighbouring string | Add `featurePages.faqHeading`, `featurePages.videoBadge`, `featurePages.downloadCta` and `featurePages.pricingCta` to all five locale files and read them with `t()` | One voice, one language per locale. The site ships de, es, fr, ja and en. These four are chrome, not editorial prose: the FAQ heading sits one JSX block below `t('featurePages.whyItHeading')`, and `walkthrough.videoBadge` ("Video coming soon") already exists as the translated form of the same badge. A de reader gets a translated page with English buttons. The English-only policy for the `extended` guides and FAQ bodies is documented at `FeaturePage.tsx:32-40` and is not reported here |
| MEDIUM | Layout | `src/components/screenshot-dimensions.ts:6,9,11,16,18` with `src/components/FeaturePage.tsx:95-97` | The figure column computes to 656px wide (`max-w-3xl` 768px, minus `sm:px-6` 48px, minus `md:p-8` 64px). At 1800x4952, `/features/general` renders its screenshot about **1805px tall**; `custom-thresholds` about 1245px; `battery-health` and `statistics` about 1119px; `travel-mode` about 881px | Cap the displayed height and keep the full shot behind the existing full-size link: add `max-h-[70vh] object-cover object-top` to the `<img>` in `ScreenshotMockup.tsx:47-55`, or crop the tall shots in the generation pipeline | Order by importance. On `/features/general` a supporting screenshot occupies roughly two laptop viewport heights and pushes "Why it matters", the extended guide, the FAQ and the only CTA below it. The reader scrolls past an image for two screens to reach the argument the page exists to make |
| MEDIUM | Accessibility | `src/routes/features.battery-journal.tsx:39` calling `src/components/zen/BatteryJournal.tsx:17-23` | `<div className="relative flex flex-col ..." aria-label={t('mockups.batteryJournal.ariaLabel')}>` | Give the element a role the label can attach to: `<div role="img" aria-label={t('mockups.batteryJournal.ariaLabel')}>` | Accessible names everywhere. `aria-label` on a `div` with an implicit generic role is dropped by most screen readers, so the label never reaches the accessibility tree and the mockup announces as unlabelled content. This is the one page of 14 whose hero visual is live JSX rather than `ScreenshotMockup`, and it is the only one whose visual has no working description. The other 13 pass real alt text through correctly (verified on all 13 route files) |
| MEDIUM | Typography | Straight: `battery-health.tsx`, `charge-limit.tsx`, `general.tsx`, `honors.tsx`, `low-power-mode.tsx`, `power-flow.tsx`, `src/routes/features.index.tsx:93,128`. Curly: `alert-presets.tsx`, `battery-journal.tsx`, `custom-thresholds.tsx`, `energy-usage.tsx`, `meeting-battery-guard.tsx`, `statistics.tsx`, `system-load.tsx`, `travel-mode.tsx` | Six content files plus the hub use `'` and `"` (`honors.tsx:16` `can't`; `features.index.tsx:93` `\"it died fast today\"`). Eight use `’` and `“ ”` (`statistics.tsx:15` `can’t`, `“what now”`) | Convert the six straight-quote content files and the hub prose to `’`, `“` and `”` | Write copy with smart punctuation. The same two sentences appear in both styles on one surface: `features.index.tsx:93` renders `"it died fast today"` while `en.json` `system-load.why` renders `“It died fast today”`, and `features.index.tsx:128` renders `"what now"` against `“what now”` in `statistics.why`. A reader moving between the hub and a feature page sees the typewriter quote and the typographic quote in adjacent paragraphs |
| MEDIUM | Writing | `src/components/FeaturePage.tsx:174, 181` vs `src/routes/features.index.tsx:334-346` | Template CTA: `<a href="/#free-download-email">` labelled `t('featurePages.tryFree')` ("Try Battery Sensei free"). Hub CTA: `<a href="/download/latest">` labelled "Download Battery Sensei", beside a second "See pricing" link | Pick one entry action for the surface and use it in both places, with one label and one target | Consistent flow vocabulary. One surface offers two different primary actions to two different destinations under two different labels. A reader who clicks from the hub gets a direct binary download; the same reader on a feature page one click later gets an email capture form. The hub also fills its closing block with two competing actions where the template deliberately keeps one, per its own comment at `FeaturePage.tsx:167-171` |
| LOW | UI | `src/routes/features.index.tsx:304` | `className="paper-card flex h-full items-start gap-4 p-5 transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5"` on an `<a>`, while `src/styles.css:930-940` already declares `a.paper-card:hover { transform: translateY(-3px); ... }` with a 250ms curve at `src/styles.css:889` | Delete `transition-transform duration-[220ms] [transition-timing-function:...] hover:-translate-y-0.5` and let `.paper-card` own the hover | Prefer the cheaper fix. The utility restates a lift the component class already provides, at a different distance and a different duration, so the 14 hub cards animate unlike every other `a.paper-card` on the site. In Tailwind v4 `-translate-y-0.5` writes the `translate` property while the stylesheet writes `transform`, so the two compose rather than override |
| LOW | Writing | `src/routes/features.index.tsx:38,120,303`; `src/routes/features.battery-journal.tsx:3,7,22,37,39`; `src/components/FeaturePage.tsx:14`; `src/data/features/battery-journal.tsx`; `honors.tsx:25`; `charge-limit.tsx:47`; `battery-health.tsx:32` | Visible labels all read "Saga", but the URL is `/features/battery-journal`, the canonical in the JSON-LD is `.../features/battery-journal`, and the component is `BatteryJournal` | Rename the route to `/features/saga` with a 301 from the old path, rename the data file and the component, then update the 14 internal links | Terminology consistency. `CONTEXT.md` retires "Journal" as a product term. The label is fixed everywhere, but the address bar, the shared link and the `ItemList` entry at `features.index.tsx:150` still carry the old name. This is the last user-visible residue of the retired term and it is the one that gets pasted into chats and search results |

## Verification

### Checks run

| Check | Command or method | Result |
| --- | --- | --- |
| Terminology sweep for retired labels | `grep -rni "guide\|Premium\|Journal" src/routes/features.*.tsx src/components/FeaturePage.tsx src/data/features/` plus a recursive walk of the `featurePages` namespace in all 5 locale JSON files | No retired label in any rendered string. `en.json:693` reads `"indexHeading": "Fourteen pages,"`. The de, es, fr and ja equivalents read "Vierzehn Seiten,", "Catorce páginas,", "Quatorze pages," and "14のページ、". Only source comments and `/guides/*` link targets contain "guide" |
| Contrast of 9 declared token pairs | WCAG 2.x relative-luminance computation on the declared token values, with `oklch()` and `color-mix(in oklab, ...)` resolved to sRGB in Python | `--nezumi` on `.paper-card` light: **3.39:1** (fails 4.5:1). Passing pairs: `--nezumi` dark 6.75:1; `--sumi-soft` on `--washi` 8.14:1 light and 10.92:1 dark; `--sumi` on the callout mix 15.55:1 light and 12.42:1 dark; `--sumi-soft` on the callout mix 8.49:1 light and 8.52:1 dark; `washi/70` on `--sumi` 7.25:1 |
| Alt text on every image | `grep -n "alt=" src/routes/features.*.tsx` | All 13 `ScreenshotMockup` calls pass a descriptive sentence naming the panel and its contents (for example `features.power-flow.tsx:42`). The hub poster at `features.index.tsx:214` is correctly `alt=""` with `aria-hidden`. Both hub screenshots pass descriptive alt through `group.shot.alt`. No occurrence of the word "screenshot" as alt text |
| `ScreenshotMockup` passes alt through | Read `src/components/ScreenshotMockup.tsx:24-57` | Yes. `alt` reaches `<img alt={alt}>` at line 49 and is also used to build the anchor's `aria-label` at line 40 |
| Intrinsic dimensions and lazy loading | Read `SCREENSHOT_DIMENSIONS` against the PNG IHDR chunk of all 28 files in `public/screenshots/` | Every entry matches the file exactly. `width`, `height`, `loading="lazy"` and `decoding="async"` are all present at `ScreenshotMockup.tsx:50-53`, so the box is reserved and no layout shift is possible from the screenshots. The hub poster at `features.index.tsx:212-219` needs no intrinsic size: it is `absolute inset-0` inside an `aspect-video` frame |
| Hub list semantics and keyboard path | Read `features.index.tsx:299-323` | Real markup. Four `<ul>` elements, one `<li>` per feature, exactly one `<Link>` per card wrapping the whole content, no nested interactive elements, kanji marked `aria-hidden`. All 14 slugs are present and the JSON-LD `ItemList` is derived from the same array. Tab order follows reading order |
| Heading order once composed | Read `FeaturePage.tsx` against all 14 `extended` exports | One `h1` per page. Every content file opens with `<H2>` and uses no other level, so the outline is `h1` then `h2` with no skip. The one gap is the "Why it matters" label, reported above |
| Consistency across the 14 content files | Prop audit of all 14 route files plus section listing of all 14 content files | Consistent. All 14 pass `slug`, `kanji`, `mockup`, `extended` and `faqs`; all 14 render the same CTA from the template; all 14 open at `H2`. FAQ counts vary from 2 to 5, which reflects the feature rather than a defect. No systemic structural inconsistency to report |
| Reduced motion | `grep -n "prefers-reduced-motion" src/styles.css` and read the `[data-reveal]` block | Covered. `src/styles.css:2335-2341` sets `transition: none !important; opacity: 1 !important; transform: none !important` on `[data-reveal]` and restores `[data-stamp]` opacity, so the scroll entrances and the Hanko stamp both degrade correctly |
| Hardcoded colors and `transition: all` | `grep -rnE "#[0-9a-fA-F]{3,8}\|rgba?\(\|transition-all" over the in-scope files | No `transition: all`. One hardcoded value: the poster shadow `rgba(28,26,23,0.45)` at `features.index.tsx:211`, which matches the `--sumi` ink value and the shadow idiom used elsewhere in `styles.css`. Not reported |
| Focus suppression | `grep -n "outline: *none" src/styles.css` | One hit, at `src/styles.css:2183` inside `.nav-link:focus-visible`, which replaces the ring with a `::after` rule. Nothing in this surface removes the browser default indicator |

### Not verified

Each needs the rendered page. Run these in the orchestrator's rendered-state pass.

1. **Confirm the caption contrast failure on screen.** Open `/features/power-flow` in the light theme, inspect the `figcaption` under the screenshot, and read the contrast ratio from DevTools. The computed value from the declared tokens is 3.39:1, but the `.paper-card` background is a gradient with a `::before` grain layer at `opacity: 0.35` (`src/styles.css:896-908`) and the figure adds a hinomaru wash (`FeaturePage.tsx:100-103`). The grain darkens the ground, which should push the measured ratio slightly further below 4.5:1, but measure it rather than assume.
2. **Focus indicator visibility.** Tab through `/features` and one feature page. Confirm a visible ring on: the 14 `a.paper-card` cards (which have only `border-color` feedback at `src/styles.css:956`), the screenshot link inside `ScreenshotMockup` (`className="block"`, no focus styles of its own), and the CTA at `FeaturePage.tsx:175`. Check the ring is not clipped by `overflow-hidden` on the figure at `FeaturePage.tsx:97`.
3. **320px reflow with the longest locales.** Two strings are at risk. `featurePages.backLink` in fr is "Toutes les pages de fonctionnalités" at 12px uppercase with `tracking-[0.22em]`, roughly 343px of advance width against 280px of available content width. `featurePages.tryFree` in de is "Battery Sensei kostenlos testen" inside `h-11 ... px-6`. Confirm both wrap rather than clip, and that the icon stays optically aligned when the back link wraps to two lines.
4. **Composite hover lift on the hub cards.** Hover a feature card and read the computed `transform` and `translate`. Confirm whether `hover:-translate-y-0.5` stacks with `a.paper-card:hover { transform: translateY(-3px) }` for a 5px lift, or overrides it. LOW-1 assumes they stack under Tailwind v4.3, which writes `translate-y-*` to the `translate` property.
5. **Reduced motion on the card hover.** With Reduce Motion on, hover a hub card. No `prefers-reduced-motion` guard exists for `a.paper-card:hover` anywhere in `src/styles.css`, so the 3px lift is expected to still run. Confirm, and decide whether a 3px hover lift is in scope for the project's motion policy. Not reported as a finding: the rule lives in shared CSS outside this surface.
6. **200% zoom on the tallest page.** Load `/features/general` at 200% zoom and confirm the 1805px screenshot does not force horizontal scrolling and that the CTA is still reachable.
7. **Dark-mode screenshot link.** In dark mode, click any screenshot on a feature page and confirm the light PNG opens, as MEDIUM-5 predicts from source.

## Verdict

`Block`.

One `HIGH` remains: the screenshot caption fails its required contrast ratio in light mode on
all 14 feature pages and on both hub screenshots. It is an escalation trigger and it is a
one-line token fix.

The 10 `MEDIUM` and 2 `LOW` findings stay in the table as work to do. Seven of the twelve live
in `FeaturePage.tsx` or `ScreenshotMockup.tsx`, so one edit each fixes 14 or 15 pages at once.

The four areas the surface prompt asked about specifically are in good shape and are not
findings: the retired terminology is fully cleaned out of visible copy in all five locales,
every product screenshot carries a real descriptive alt sentence and the one decorative image
is correctly `alt=""`, every screenshot has correct intrinsic `width`/`height` plus `loading`
and `decoding`, and the hub is a real nested list with one link target per card and no nested
interactive elements. The 14 content files are structurally consistent with each other.
