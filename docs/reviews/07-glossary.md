---
surface: Glossary
routes: /glossary, /glossary/:slug
files_reviewed: 5
findings: { high: 1, medium: 9, low: 5 }
verdict: Block
---

# Glossary interface review

## Scope and coverage

**Scope.** The Glossary surface at `/glossary` and `/glossary/$slug`. Five files, read in
full, including every one of the 12 terms in the data file:

- `src/routes/glossary/index.tsx` (46 lines)
- `src/routes/glossary/$slug.tsx` (95 lines)
- `src/components/glossary/GlossaryIndex.tsx` (130 lines)
- `src/components/glossary/GlossaryTerm.tsx` (135 lines)
- `src/data/glossary/terms.tsx` (635 lines)

Out of scope by instruction: Nav, Footer, language and theme switchers, Guides, feature
pages, `src/components/ui/*`. Those were opened only as comparators, to establish what the
project's own idiom is.

**Stack.** TanStack Start with TanStack Router file routes, React 19, Tailwind v4 with
`@theme` tokens, lucide-react icons, react-i18next with five locales (`en`, `de`, `es`,
`fr`, `ja`). Motion is CSS driven off a `data-revealed` attribute set by
`src/components/zen/Reveal.tsx`, not the `motion` library.

**Styling conventions.** `src/styles.css` holds the token system: colour tokens at
lines 82 to 115 (light) and 150 to 190 (dark), a type scale at lines 311 to 318, and named
classes such as `.zen-link`, `.meta-label`, `.kicker-row`, `.btn-sumi`. The glossary uses
colour tokens correctly. It contains no hardcoded hex values.

**Convention documents found.** `CONTEXT.md` (ubiquitous language) and `PRODUCT.md` (register,
design principles, accessibility bar). No `CONTRIBUTING.md`, `CODING_STANDARDS.md`, design
system doc, or Storybook.

**Review boundary.** No rendered page was inspected. Per the shared brief, the browser pass
belongs to the orchestrator. Claims needing a live page are in **Not verified** below.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Heading levels on both routes, list semantics, link accessible names, `target="_blank"` handling, `aria-hidden` on decorative icons, focus treatment on all 7 inline link chains and the CTA, `<html lang>` resolution in `__root.tsx:397`, reduced-motion coverage for `[data-reveal]`, the unknown-slug path through `beforeLoad` to `RouteNotFound` | 5 findings |
| Layout | Grouping logic in `GlossaryIndex.tsx:24-27`, group sizes, section nesting, term-page section stack, the absence of a next/previous path, no fixed widths or `whitespace-nowrap` anywhere in scope | 3 findings |
| Writing | All 12 `shortDef` strings and all 12 bodies, all 41 `related` labels, all 8 `sources` labels, index and term-page copy, page meta in both routes, checked against `CONTEXT.md` and `PRODUCT.md` principle 1 | 5 findings |
| Typography | `max-w-3xl` measure at 17px, `shortDef` length distribution (measured), body paragraph counts per term, type-scale token use, `.meta-label` and `.kicker-row` metrics | 2 findings |
| Colors | Computed `--nezumi`, `--sumi-soft`, `--hinomaru-ink` against every background the token system can produce for this surface, light and dark | 1 finding |
| UI | Transition properties (all scoped, no `transition: all`), reduced-motion branch for `[data-reveal]`, no-JS behaviour of `Reveal`, hover-only state changes, icon decorative marking | 2 findings |

Two checks the prompt asked for came back clean and are recorded here rather than as findings:

- **Definition length consistency.** The 12 `shortDef` strings run 181 to 264 characters,
  ratio 1.46. That is consistent. No finding.
- **Unknown-term state.** `$slug.tsx:12-14` throws `notFound()` in `beforeLoad`, and
  `__root.tsx:392` registers `notFoundComponent: RouteNotFound`. `RouteNotFound`
  (`src/components/CatchBoundary.tsx:189-240`) is fully translated and offers four trails
  back, one of which is `/glossary`. This is not a blank page and not an unhandled throw.
  No finding. One residual question about its `<title>` is in **Not verified**.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/components/glossary/GlossaryIndex.tsx:67-72`, token at `src/styles.css:84`; same token as list markers at `src/data/glossary/terms.tsx:43` | `<h2 id={...} className="meta-label mb-2.5 text-nezumi">` renders 12px, weight 600, uppercase in `--nezumi: #8a847c` | Raise light-mode `--nezumi` until it clears 4.5:1 on every reachable background, the way dark mode was already corrected. `#655f57` measures 5.42:1 on `--washi`, 4.95:1 on `--washi-soft` and 4.63:1 on the darkest glow blend, so it is the safe floor. `#6f6961` is not enough: it reaches 4.66:1 on `--washi` but drops to 3.98:1 on the darkest stop. Fix the token, not the class | The four category headings are the only labels that tell a reader which cluster a term sits in. In light mode the pair fails AA at every background the token system can produce: 3.18:1 on `--washi`, 2.90:1 on `--washi-soft`, 3.37:1 at the lightest glow stop, 2.72:1 at the darkest. 12px semibold is not large text, so 4.5:1 is required. Dark mode already passes at 6.92:1 because `--nezumi` was raised there and the comment at `src/styles.css:155-157` says why. Light mode was never given the same treatment |
| MEDIUM | Accessibility | `src/components/glossary/GlossaryIndex.tsx:73-105` | `<ul className="divide-y ...">` with `<li><Link><h3>{term.title}</h3><p>{term.shortDef}</p></Link></li>` | Use `<dl>` with one `<div>` per row holding `<dt>` for the title and `<dd>` for the definition, and put the `<Link>` inside the `<dt>` rather than around the pair. The project already writes this shape at `src/components/blog/BlogPost.tsx:88-91` and `src/components/FeaturePage.tsx:156-163` | Two defects, one cause. The markup does not say the rows are term and definition pairs, so no assistive technology can announce the relationship. Wrapping both in one anchor also folds the whole row into the link's accessible name: "Cycle count" reads as a 191 character link, and the list of 12 reads as 12 paragraph-length link names in a links rotor |
| MEDIUM | Accessibility | `src/components/glossary/GlossaryTerm.tsx:57-62`, `:88-92`, and the bare `<section>` elements at `:18`, `:51`, `:57` | `<p className="display-title mb-3 text-[11px] font-semibold uppercase ...">Related</p>` above `<ul>`, same shape for "Sources"; three `<section>` wrappers with no accessible name | Make both labels `<h2>` with the same visual class, and give each `<section>` an `aria-labelledby` pointing at its heading. `GlossaryIndex.tsx:66` already does exactly this for the category sections | Every term page has one heading, the `<h1>`. A screen reader user cannot jump to the related terms or the sources, and the three regions are indistinguishable in a landmarks list. The index gets this right, so the two halves of the same surface behave differently |
| MEDIUM | Writing | `src/components/glossary/GlossaryIndex.tsx:55-59`, echoed in `src/routes/glossary/index.tsx:9` | "Use the list as a reference, or read it end-to-end in fifteen minutes." | Either drop the end-to-end promise, or add a next-term link at the foot of `GlossaryTerm.tsx` that walks the same order the index uses | There is no end-to-end path. The index shows only `shortDef`; each full definition lives on its own route. Reading the 2,200 words of body prose means 12 separate page loads with a return trip to the index between each, because no term page links to the next one. The "Related" box is not that path either: `design-capacity` and `charge-cycle` carry only two related links each, and none of them point forward in reading order |
| MEDIUM | Accessibility | `src/data/glossary/terms.tsx` (all 12 terms), `src/components/glossary/GlossaryIndex.tsx`, `src/components/glossary/GlossaryTerm.tsx`; `<html lang>` resolved at `src/routes/__root.tsx:397` | Every user-facing string is a hardcoded English literal. `src/lib/i18n/locales/en.json` contains no `glossary.*` key at all. `<html lang={HTML_LANG[i18n.language]}>` follows the visitor's cookie, not the content | Short term, set `lang="en"` on the `<main>` of both glossary components so the declared language matches the text. Longer term, move `title`, `shortDef` and the body prose behind `t()` the way `Nav` and `Footer` already do | A German visitor who used the language switcher reaches `/glossary` with a German Nav and Footer, German page chrome, and 2,200 words of English between them, under `<html lang="de">`. A screen reader then reads English prose with German pronunciation rules, which is close to unintelligible. The declared language being wrong is the part that is cheap to fix and does the most harm |
| MEDIUM | Accessibility | `src/components/glossary/GlossaryTerm.tsx:96-104` and `src/data/glossary/terms.tsx:48-57` | `<a href={src.href} target="_blank" rel="noreferrer" className="underline decoration-[var(--line-strong)] ...">` with no cue that a new tab opens | Add a visually hidden suffix, for example `<span className="sr-only"> (opens in a new tab)</span>`, and an inline external-link icon marked `aria-hidden` | The eight Apple Support links in the Sources lists and the inline `ApplePage` links carry the exact same underline treatment as the internal glossary cross-references beside them. Nothing distinguishes "goes to another term on this site" from "leaves the site into a new tab". The context change is unannounced for everyone and unannounced twice for screen reader users |
| MEDIUM | Writing | `src/data/glossary/terms.tsx:261-267`; label inconsistency at `:126`, `:266`, `:315` | The Related box on `optimized-battery-charging` renders "Travel Mode" (glossary term) and "Travel Mode (feature)" (feature page) as adjacent list items. Guide links are labelled three different ways: "Deep guide: OBC explained", "What's a healthy cycle count?", "Should I keep my MacBook plugged in?" | Disambiguate the destination in the label, for example "Travel Mode (term)" and "Travel Mode (feature page)". Pick one shape for guide links and apply it to all three, for example "Guide: what's a healthy cycle count?" | Two links whose visible text differs only by a parenthetical is exactly the case where link text stops making sense out of context. In a links rotor they read as near-duplicates pointing at different pages. The guide labels are the opposite problem: one announces its type, two do not, so a reader cannot tell a long article from another short definition until the page loads. No link in the surface says only "here" or "read more" |
| MEDIUM | Typography | `src/components/glossary/GlossaryTerm.tsx:51`, `src/components/glossary/GlossaryIndex.tsx:63`, paragraph class at `src/data/glossary/terms.tsx:35` | `max-w-3xl` (48rem, 768px) around prose set at `text-[1.0625rem]` (17px) | Cap the prose column at roughly 34rem to 36rem. Add one shared `.prose-measure` class in `src/styles.css` rather than changing the utility in each file, because `src/components/blog/BlogPost.tsx:62` uses the same pair | 768px minus the 24px `sm:px-6` gutters leaves a 720px text column. At 17px in Source Sans 3 that is roughly 90 characters per line, well past the 45 to 75 range. Long measure costs the reader the line return, and this surface is nothing but paragraphs. The index lead at `GlossaryIndex.tsx:53` is already narrower at `max-w-2xl`, so the widest text on the surface is the body copy, not the introduction |
| MEDIUM | UI | `src/styles.css:2193-2200` and `src/components/zen/Reveal.tsx:32-61`; 13 call sites across `GlossaryIndex.tsx` and `GlossaryTerm.tsx` | `[data-reveal] { opacity: 0; ... }` and the only thing that sets `data-revealed` is a `useEffect` running an `IntersectionObserver` | Add a no-JS escape in the document head: `<noscript><style>[data-reveal]{opacity:1;transform:none}</style></noscript>` in `src/routes/__root.tsx` | With scripting off, every glossary element is in the DOM and painted at `opacity: 0`. Both routes render as an empty page under a Nav and a Footer. Reduced motion is handled correctly at `src/styles.css:2335-2340`, so this is the one uncovered branch. Shared cause: the fix is one block in the root and it repairs every route, not just this surface |
| MEDIUM | Writing | `src/data/glossary/terms.tsx:80-83` and `:368-371` | "Cycle count": "One battery cycle equals one full equivalent discharge of your MacBook's battery." "Charge cycle": "A charge cycle is the full equivalent of using 100% of your battery's capacity, in any combination." | Make each definition open by naming the other. "Cycle count" is the running total; "charge cycle" is the unit it counts. Say that in the first sentence of both, or merge the two entries | Both sit in the "Battery health" group, first and fourth in the same list, and define the same thing with the same worked example. A reader scanning the index sees two rows that say the same sentence twice and has no way to tell which one to open. Neither `shortDef` mentions the other term, and the disambiguation only appears three paragraphs into the `charge-cycle` body at `:383-388` |
| LOW | Writing | `src/components/glossary/GlossaryTerm.tsx:119` | `Try Battery Sensei free` as a literal, inside a button that is otherwise identical to `src/components/FeaturePage.tsx:174-182` | `{t('featurePages.tryFree')}` | The key already exists and is translated in all five locales: "Battery Sensei kostenlos testen", "Prueba Battery Sensei gratis", "Essayer Battery Sensei gratuitement", "Battery Senseiを無料で試す". The feature pages use it. One line makes the only action on the term page speak the visitor's language |
| LOW | Writing | `src/data/glossary/terms.tsx:590-591` | "Watts in / out is the real-time rate of energy flowing into or out of your MacBook's battery, in watts." | Lead with what the number tells the reader, for example "Watts in / out tells you whether the adapter is keeping up. If the number goes negative while you are plugged in, the adapter is too small for what the machine is doing" | `PRODUCT.md` design principle 1 asks for what the data means, not only what it measures. This definition names the unit, then repeats the unit, and says nothing about what a reader should conclude. The body already has the answer at `:602-623` under "Three reasons to care", so the useful sentence exists one scroll below the definition that should have carried it. `low-power-mode` at `:455-456` has the same shape, listing the three things it reduces without saying what the reader gains |
| LOW | Layout | `src/components/glossary/GlossaryIndex.tsx:11`, `:24-27` | `CATEGORY_ORDER = ['health', 'charging', 'thermal', 'app-feature']`, rendered as four grouped lists. No filter, no jump links, no term count | Either merge the two single-term groups into their nearest neighbour ("Heat and throttling" into "Battery health", "In the app" into "Charging"), or add a row of jump links to the four group headings under the introduction | Grouping is a real find affordance and it is present, so this is not the blank wall the prompt asked about. The problem is the split: health holds 6 terms, charging 4, thermal 1, app-feature 1. Two headings introduce a single row each, which costs a heading's worth of vertical space and reading attention to deliver no grouping at all |
| LOW | Accessibility | `src/data/glossary/terms.tsx:53`, `:63`, `:72`; `src/components/glossary/GlossaryTerm.tsx:70`, `:77`, `:100`; `src/components/glossary/GlossaryIndex.tsx:115` | The same 6-utility chain repeated 7 times: `underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru-ink hover:decoration-hinomaru/40`. Every state is behind `hover:` | Promote the chain to a shared class in `src/styles.css` that pairs `:hover` and `:focus-visible`, the way `.zen-link` does at `:554-575` | A keyboard user gets no colour or underline response from any of the 7 link styles on this surface. The only cue is the browser's default outline, which is why this is not a blocker. The same chain appears in 10 files repo-wide, so it is the house prose-link convention. That makes it one shared fix, not seven |
| LOW | Writing | `src/data/glossary/terms.tsx:125`, `:175`, `:537` | `{ href: '/features/battery-journal', label: 'Saga (feature)' }` and `<F to="/features/battery-journal">Saga page</F>` | No change inside the glossary. The route slug is owned by the features surface. Raise the rename there and update these three hrefs with it | Consolidated retired-label row, as requested. Visible copy is clean: no "Premium" anywhere, "Pro" is never miscalled, "Guides" is used correctly at `GlossaryIndex.tsx:118`, and "Saga" is used correctly in all three places the battery history feature is named. The single residue is the URL `/features/battery-journal`, which puts a retired term in the address bar and in the status bar preview when a reader hovers a Related link |

Fifteen findings, which is the cap. Nothing material was excluded to fit it.

## Verification

**Checks run.**

| Check | Command or method | Result |
| --- | --- | --- |
| Contrast of `--nezumi` on every reachable background | WCAG 2.x relative luminance computed from the token values at `src/styles.css:84`, `:85`, `:86`, `:114`, `:115`, including both gradient stops from `body` at `:469-472` and both radial glow blends | Light mode: 3.18:1 on `--washi`, 2.90:1 on `--washi-soft`, 3.37:1 best case with `--paper-glow` at 0.6 alpha, 2.72:1 worst case with `--paper-glow-warm` at 0.55 alpha. Best achievable 3.37:1 against a 4.5:1 requirement. Dark mode 6.92:1, passes |
| Contrast of the other two text tokens | Same method | `--sumi-soft` 7.43:1 to 9.32:1 light, 10.13:1 to 10.92:1 dark. `--hinomaru-ink` 5.19:1 to 6.50:1 light, 7.60:1 to 8.19:1 dark. Both pass |
| `shortDef` length distribution | Parsed all 12 strings out of `terms.tsx` and measured | 181 to 264 characters, min/max ratio 1.46. Consistent. No finding |
| Body prose volume | Word count across all 12 bodies plus definitions | About 2,200 words |
| Every `related` href resolves | Compared all 41 entries against `src/routes/` and `src/data/blog/` | No dead links. All 5 feature paths exist as route files. All 3 guide slugs exist: `healthy-cycle-count-macbook`, `optimized-battery-charging-explained`, `should-i-keep-macbook-plugged-in` |
| No link says only "here" or "read more" | Read all 41 `related` labels, all 8 `sources` labels, and every inline `<G>` and `<F>` in the bodies | Confirmed. No bare "here", "read more", "click here", or "learn more" anywhere in scope |
| Retired-label sweep | `grep -rn -i "premium\|journal\|battery history\|blog" src/components/glossary src/data/glossary src/routes/glossary` | Visible copy clean. Three hits on the `/features/battery-journal` URL, two in code comments |
| Reduced motion | Read `src/styles.css:2335-2353` | `[data-reveal]` gets `opacity: 1 !important` and `transition: none !important`, `[data-stamp]` gets `opacity: 1 !important`. Correctly covered, no finding |
| Decorative icons | Read `GlossaryIndex.tsx:81-85`, `:97-101`, `Hanko.tsx:36-43` | All `aria-hidden`. Correct |
| Transition scoping | Read every `transition-*` class in scope | All scoped to `colors` or `transform`. No `transition: all`. No finding |
| Token discipline | `grep` for hex literals and fixed widths in scope | No hardcoded hex. No `w-[...]`, no `min-w-[...]`, no `whitespace-nowrap`. Colour comes entirely from tokens |
| Unknown-slug path | Traced `$slug.tsx:12-14` to `__root.tsx:392` to `CatchBoundary.tsx:189-240` | Handled. Translated 404 with four trails, one of which returns to `/glossary`. Not a blank page, not an unhandled throw |
| Translation key exists for the CTA | Read `featurePages.tryFree` out of all five locale JSON files | Present and translated in `en`, `de`, `es`, `fr`, `ja` |
| Glossary translation keys | Searched `src/lib/i18n/locales/en.json` for any `glossary` key | Zero. The surface is English only |

**Not verified.** Each needs a rendered page. The exact check follows.

1. **Composited contrast of the category headings.** Load `/glossary` in light mode and probe
   the computed pair for the `<h2>` at `GlossaryIndex.tsx:69`. The finding above evaluated
   every background the token system can produce and all of them fail, but the body paints a
   fixed gradient with two radial glows, so confirm the actual pixel. Expect 2.7:1 to 3.4:1.
2. **Title and robots meta on an unknown slug.** Load `/glossary/does-not-exist` and read
   `document.title` and any `meta[name="robots"]`. `$slug.tsx:22-25` returns
   `title: 'Glossary — Battery Sensei'` for the missing-term branch and sets no `noindex`,
   while `src/routes/404.tsx:14-16` sets both a "Page not found" title and
   `noindex, nofollow`. Whether the `$slug` head runs after `beforeLoad` throws decides
   whether that branch is dead code or a mislabelled 404. Do not assume either.
3. **Measured characters per line.** At a 1280px viewport, count the characters on a full
   line of body prose on any term page. The arithmetic above gives about 90. Confirm.
4. **Focus ring visibility on the index rows.** Tab through `/glossary` and confirm the
   browser default outline is visible on the full-width row links against the cream ground.
   No project focus style applies to them.
5. **320px and 200% zoom.** Load both routes at 320px wide and at 200% zoom. Check that the
   `line-clamp-2` definitions at `GlossaryIndex.tsx:93` and the three-column baseline row at
   `:79` do not clip, and that the `px-5` gutters hold.
6. **No-JS blank page.** Load `/glossary` with scripting disabled and confirm the body renders
   empty below the Nav.

## Verdict

`Block`.

One HIGH finding stands. The four category headings on the index are the only labels that
tell a reader which cluster a term belongs to, and in light mode they fail AA against every
background the token system can produce, best case 3.37:1 against a required 4.5:1. The dark
theme already carries the corrected value and a comment explaining why it was raised. The
light theme needs the same correction, in the token rather than the class, so the fix reaches
every other place `--nezumi` is used as text.

The nine MEDIUM and five LOW findings stay in the table as work to do. Three of them are
shared causes whose fixes reach past this surface: the prose measure is duplicated on the
Guides post template, the no-JS reveal gap covers every route, and the prose link chain is
repeated in ten files.
