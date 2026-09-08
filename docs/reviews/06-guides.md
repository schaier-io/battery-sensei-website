---
surface: Guides
routes: /guides, /guides/:slug
files_reviewed: 11
findings: { high: 3, medium: 8, low: 3 }
verdict: Block
---

# Guides interface review

## Scope and coverage

**Scope.** The written articles surface: the index at `/guides` and the article route at
`/guides/:slug`. Eleven in-scope files: `src/routes/guides/index.tsx`,
`src/routes/guides/$slug.tsx`, `src/components/blog/BlogIndex.tsx`,
`src/components/blog/BlogPost.tsx`, `src/data/blog/index.ts`, `src/data/blog/types.ts`,
`src/data/blog/_components.tsx`, the three article files under `src/data/blog/`, and
`src/lib/format-date.ts`.

**Read for context, not reviewed.** `src/styles.css` (tokens, reveal motion, focus),
`src/routes/__root.tsx`, `src/lib/i18n/I18nProvider.tsx`, `src/components/sections/Footer.tsx`,
`src/components/zen/Reveal.tsx`, `src/components/zen/Hanko.tsx`, `src/components/FeaturePage.tsx`,
`src/components/glossary/GlossaryTerm.tsx`, `vercel.json`, `public/sitemap.xml`.

**Stack.** TanStack Start plus TanStack Router, React 19, Tailwind v4, `lucide-react` icons,
react-i18next. Styling is Tailwind utilities over CSS custom properties declared in
`src/styles.css`. Project convention documents found: `CONTEXT.md` (ubiquitous language),
`PRODUCT.md` (register, design principles, accessibility bar). No `CONTRIBUTING.md`,
`CODING_STANDARDS.md` or design-system doc.

**Boundary.** Nav, Footer, switchers, glossary, feature pages and `src/components/ui/*` were
excluded by the brief. Browser and preview tools were not used, per the brief. Every claim that
needs a rendered page is in **Not verified**.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Landmark and heading structure in both components, `<article>` scope, `<time datetime>`, accessible names on all 6 lucide icons, `aria-hidden` on decorative marks, external-link behaviour in `_components.tsx`, `lang` handling, reduced-motion guard for `Reveal` | 5 findings |
| Layout | Container widths, `space-y` rhythm, card structure, one-link-per-card check, list versus table structure for the 3 tabular blocks | 1 finding |
| Writing | Every user-facing string in both components and the 3 articles against `CONTEXT.md`, link text, reading-time claims, byline and date metadata | 4 findings |
| Typography | Measure, line height, paragraph spacing, heading scale, all hardcoded sizes against the `--text-*` scale in `src/styles.css:306-318` | 2 findings |
| Colors | Computed contrast for 8 declared token pairs in light and dark, token roles, tint recipes | 1 finding |
| UI | Reveal delays and easings, icon stroke weights, surface recipes, callout and code chip treatment, `transition-*` property lists | 1 finding |

**Naming migration status (brief item 1).** The URL migration is complete and correct.
`vercel.json:22-31` holds permanent redirects for `/blog` to `/guides` and `/blog/:slug` to
`/guides/:slug`. `public/sitemap.xml:123-141` lists only `/guides` URLs. No article links to a
`/blog` path. What remains splits in two, and only the first group is an interface defect:

- **User-facing copy.** `BlogIndex.tsx:41` "Each post is researched", `:94` "Read post",
  `:116` "these posts"; `healthy-cycle-count-macbook.tsx:148` link text "history view".
  Reported as finding 5.
- **Internal identifiers only, no user impact.** The directories `src/components/blog/` and
  `src/data/blog/`; the filenames `BlogIndex.tsx`, `BlogPost.tsx`; the symbols `BLOG_POSTS`,
  `POSTS_BY_SLUG`, the `BlogPost` type; the `group/post` Tailwind group name at
  `BlogIndex.tsx:57`; the `#post` fragment id at `$slug.tsx:28`; the stale comment
  "Drives the /blog index" at `src/data/blog/index.ts:6`; the `/blog/<slug>` references in
  `src/data/glossary/terms.tsx:6,22`. Schema.org `@type: Blog` and `BlogPosting`
  (`index.tsx:15,27`, `$slug.tsx:27`) are vocabulary terms, not labels, and are correct as is.
  Not reported as findings.

**Brief item 4, the missing slug.** No defect. `$slug.tsx:13-15` throws `notFound()` in
`beforeLoad` when the slug is absent from `POSTS_BY_SLUG`, and `__root.tsx:392` registers
`notFoundComponent: RouteNotFound`. `src/routes/404.tsx` covers the static Vercel deploy. The
`if (!post) return null` at `$slug.tsx:108` is unreachable behind that guard. Neither a blank
page nor an unhandled throw.

**Brief item 5, one link per card.** No defect. Each card is a single `<Link>`
(`BlogIndex.tsx:54-101`) containing the date, title, description, tags and CTA. No nested
anchors.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/components/blog/BlogIndex.tsx:59` | `<p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-nezumi">` carrying the date and the reading time | Use `text-sumi-soft`, which the article page already uses for the same meta line via `.kicker-row` (`src/styles.css:773`). It computes 8.14:1 on the same ground. Do not change `--nezumi` itself | `--nezumi` `#8a847c` on `--washi` `#f4ede0` computes 3.18:1, and 2.90:1 against `--washi-soft` `#ece3d1`, which the fixed body gradient (`src/styles.css:472`) reaches at the foot of the page. At 11px this is normal text and needs 4.5:1. Fails in light mode on every card. Dark mode passes at 6.92:1, so the failure is theme-specific and easy to miss. `text-nezumi` appears 97 times across `src/components` and `src/data`, so the root cause is a site-wide token role, not this line |
| HIGH | Accessibility | `src/components/blog/BlogIndex.tsx:23-119`, `src/components/blog/BlogPost.tsx:28-103`, all three files under `src/data/blog/`; mechanism at `src/lib/i18n/I18nProvider.tsx:50-61` | Every guide string is hardcoded English. There is no `useTranslation` call and no `guides` namespace in `src/lib/i18n/locales/*.json`. Meanwhile `I18nProvider.tsx:54` runs `document.documentElement.setAttribute('lang', HTML_LANG[locale])` from the visitor's persisted locale on every page | Put `lang="en"` on the page wrapper in both components, for example on the `<main>` in `BlogIndex.tsx:19` and `BlogPost.tsx:23`, so the English content declares its own language whatever the shell says | A visitor whose locale cookie is `de`, `es`, `fr` or `ja` gets `<html lang="de">` over 1,000 English words. WCAG 3.1.1 Language of Page fails on every guide. A screen reader applies German phonetics to English prose and the result is unintelligible. The site does localise comparable content: `src/components/FeaturePage.tsx:44-181` renders every feature page through `t()`. The guides are the outlier. Secondary effect: `<Apple id>` links at `_components.tsx:94` hardcode `support.apple.com/en-us/`, so every cited source also opens in English |
| HIGH | Writing | `src/data/blog/types.ts:18-20`, `src/components/blog/BlogIndex.tsx:69`, `src/components/blog/BlogPost.tsx:43`, `src/routes/guides/$slug.tsx:37,114-116`, and `readingMinutes` in the three article files | `readingMinutes: 9` / `9` / `8`, rendered as `{post.readingMinutes} min read`. Measured body plus FAQ word counts are 1,216 / 1,288 / 1,352. At the project's own 225 wpm (`$slug.tsx:113`) those are 5.4, 5.7 and 6.0 minutes | Derive the minutes from the rendered text at build time and round up, or correct the three literals to 6, 6 and 6. Delete `estimateWords` and drop `wordCount` from the JSON-LD rather than deriving a word count from a hand-typed minute figure | The claim overstates the read by 50% to 67% on every card and every article. A reader deciding whether to start sees a 9-minute commitment for a 6-minute piece. `$slug.tsx:37` then feeds `wordCount: estimateWords(9)` = 2,025 into Schema.org against an actual 1,216, so the same wrong number reaches search engines. `types.ts:19` still claims "we don't surface this on the page", which is how the figure drifted: nothing checks it |
| MEDIUM | Typography | `src/data/blog/_components.tsx:10`, article container at `src/components/blog/BlogPost.tsx:62` | `<article className="mx-auto max-w-3xl px-5 sm:px-6">` with body copy at `text-[1.0625rem] leading-[1.78] md:text-[1.125rem]`. `max-w-3xl` is 48rem, so content is 720px at `sm:px-6`, which is 40em at 18px, roughly 80 characters | Cap the article body at the width the same page already uses for its lead: `max-w-2xl` (42rem) on the `<article>`, or `max-w-[68ch]` on `P` | `better-typography` caps long-form at 60 to 75 characters. 80 characters combined with `leading-[1.78]` makes the return sweep to the next line harder, which is the exact failure long-form typography exists to prevent. The page contradicts itself: the lead paragraph at `BlogPost.tsx:55` is capped at `max-w-2xl` and lands near 67 characters, then the body it introduces runs wider |
| MEDIUM | Writing | `src/components/blog/BlogIndex.tsx:41,94,116`; `src/data/blog/healthy-cycle-count-macbook.tsx:148` | "Each post is researched", "Read post", "these posts"; and `<A to="/features/battery-journal">history view</A>` | "Each guide is researched", "Read guide", "these guides"; and link text "Saga" or "the Saga view" | `CONTEXT.md:22` makes **Guides** the canonical name for these articles. The page titles itself "Guides" in the kicker, the h1 and the back link, then calls the same objects "posts" three times, so one surface uses two nouns for one thing. `CONTEXT.md:28` retires "battery history" as a visible label in favour of **Saga**, so "history view" is legacy copy. It also fails the link-text rule: it does not name where it goes |
| MEDIUM | Typography | `src/data/blog/_components.tsx:10,16,25,31,37`; `src/components/blog/BlogIndex.tsx:29,71`; `src/components/blog/BlogPost.tsx:48,55,71,80,83` | Every size and leading is an arbitrary value: `text-[1.625rem] md:text-[1.875rem]` (article H2), `text-[1.5rem] md:text-[1.875rem]` (index card h2), `text-[1.5rem] md:text-[1.75rem]` (FAQ h2), plus `leading-[1.78]`, `leading-[1.7]`, `leading-[1.55]`. The project defines `--text-h2`, `--text-h3`, `--text-body` and `--leading-body` at `src/styles.css:306-318` and ships a `.section-heading` class at `:742` | Move the three heading sizes onto `--text-h2` / `--text-h3` (or `.section-heading`) and body copy onto `--text-body` / `--leading-body`, keeping deliberate deviations as named steps rather than inline arbitrary values | Bypassing the scale has already produced the symptom it predicts: on a single article page the body H2 renders at 26px / 30px while the FAQ h2, the same level, renders at 24px / 28px. Two sizes for one heading level break the hierarchy the reader uses to scan |
| MEDIUM | Accessibility | `src/components/blog/BlogPost.tsx:24-66` | The `<article>` opens at line 62 and wraps only `post.body()`. The `<h1>` (line 46), the `<time>` (line 39) and the lead paragraph (line 52) sit outside it, in the preceding `<section>` | Move the header block inside the `<article>`, ideally as a `<header>` element, so the article element contains its own title, date and lead | An `<article>` with no heading gets no accessible name. A screen-reader user who jumps to the article landmark lands on body prose with no title, no date and no lead. The same split means a feed reader or reader-mode extension parsing the article element drops the byline metadata |
| MEDIUM | Layout | `src/data/blog/healthy-cycle-count-macbook.tsx:58-76,94-116`; `src/data/blog/should-i-keep-macbook-plugged-in.tsx:100-117` | Three blocks of two-column data rendered as `<UL>` with a bolded label and prose, for example `<li><strong>24 months in:</strong> 700-900 cycles. Capacity around 88-93%.</li>` | Add a `Table` component to `src/data/blog/_components.tsx` using `<table>`, `<caption>`, `<thead>` and `<th scope="col">`, and render these three blocks with it. Wrap it in an `overflow-x: auto` container for 320px | These are lookup tables: age to cycles to capacity, and charge cap to cycle life. A bullet list gives the reader no column to scan down, so answering "what should 24 months look like" means reading four full sentences. For screen-reader users a real table adds row and column announcements that a list cannot carry. `_components.tsx` currently has no table primitive at all, which is why the content was flattened |
| MEDIUM | Accessibility | `src/data/blog/_components.tsx:66-101`; used at 6 sites: `optimized-battery-charging-explained.tsx:45`, `should-i-keep-macbook-plugged-in.tsx:47,80`, `healthy-cycle-count-macbook.tsx:79,158,180` | `<a href={...} target="_blank" rel="noreferrer" className={linkClass}>` with no visual or announced cue. The `Ext` variant at `:66-83` emits `target="_blank"` with `rel={undefined}` when `noreferrer` is false | Append an `ExternalLink` icon with `aria-hidden` plus visually hidden text such as "opens in a new tab", matching the pattern the project already uses at `src/routes/checkout.tsx:505` and `src/components/LicenseDeliveryStrip.tsx:185`. Delete the unused `Ext` export, or hardcode `rel="noreferrer"` in it | Six links per article change context with no warning. WCAG 3.2.5 asks for a cue, and a keyboard or screen-reader user who loses the back button has no cheap way to return to the guide. The project has an established treatment for external links elsewhere, so the guides are inconsistent with their own codebase. `Ext` is exported but imported by no article (verified: no `<Ext` in `src/data/blog/`), so its unsafe `rel` branch is dead code that should be removed rather than fixed |
| MEDIUM | Writing | `src/components/blog/BlogIndex.tsx:9-13`, `src/components/blog/BlogPost.tsx:9-13` | `const dateFormatter = new Intl.DateTimeFormat('en-US', {...})`, rendering "May 28, 2026" | Call `formatLongDate(post.publishedAt, i18n.language)` from `src/lib/format-date.ts`, as `src/components/sections/Footer.tsx:25` and `src/routes/privacy.tsx` already do | `src/lib/format-date.ts:4-9` states the rule this breaks: every long date on the site must agree on shape, "31 May 2026", never "May 31, 2026". The Footer renders on both guide routes (`BlogPost.tsx:108`, `BlogIndex.tsx:123`) through `formatLongDate`, which maps `en` to `en-GB`. So one screen shows "May 28, 2026" in the article header and "28 May 2026" in the footer. Hardcoding `en-US` also pins the date to US order for German, Spanish, French and Japanese readers |
| MEDIUM | Writing | `src/components/blog/BlogPost.tsx:35-59`; schema claim at `src/routes/guides/$slug.tsx:39-43,7` | The page renders a published date and a reading time. No author is shown anywhere, and no updated date. `$slug.tsx:41` still asserts `author: { name: 'Sandro Thabiso Schaier' }` to Schema.org, and `$slug.tsx:93` emits `article:modified_time` | Render a byline and, where `updatedAt` is set, a second `<time dateTime={post.updatedAt}>` labelled "Updated". Set `updatedAt` on the three posts or drop the field from `types.ts:17` | These guides make medical-adjacent claims about hardware ("replacement makes sense", price ranges, capacity thresholds) and cite Apple as a source. A reader has no way to see who wrote them or when they were last checked, while the structured data tells search engines an author exists. The page and its own metadata disagree. `updatedAt` is declared in `types.ts:17`, set by none of the three posts and rendered nowhere |
| LOW | Accessibility | `src/components/blog/BlogIndex.tsx:23-25` | `<Reveal as="p" delay={120} className="kicker-row mb-4">Guides · 手引</Reveal>` | Wrap the kanji: `Guides <span lang="ja">手引</span>`, or mark it `aria-hidden` if it is purely decorative | WCAG 3.1.2 Language of Parts. On a page declared English, a screen reader pronounces `手引` with an English voice and produces noise. `grep` finds no `lang="ja"` anywhere in `src/`, so the same pattern repeats in every `kicker-row` across the site (15 call sites). Reported here scoped to this surface so the orchestrator can consolidate it |
| LOW | UI | `src/data/blog/_components.tsx:24-28`; inline code chip at `src/data/blog/healthy-cycle-count-macbook.tsx:143` | `Pull` is a bare `<p>` carrying a border and a tint. The one code sample is styled inline in a content file: `<code className="rounded bg-washi-soft px-1.5 py-0.5 font-mono text-[0.875rem]">` | Make `Pull` an `<aside aria-label="Key point">`. Add a `Code` component to `_components.tsx` using the shared tint recipe `color-mix(in oklab, var(--washi) 70%, var(--paper-lift))` that `Pull:25` and `BlogPost.tsx:78` already use | The callout carries the article's takeaway ("High cycle count with high capacity is fine") but announces as an ordinary paragraph, so the emphasis is visual only. The code chip is the only styled element defined outside the component file, and it picks a different surface recipe: `--washi-soft` is darker than the page in light mode and lighter than it in dark mode, so the same chip reads recessed in one theme and raised in the other |
| LOW | Accessibility | `src/components/blog/BlogPost.tsx:30,99-102` | `<ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />` and `<Download className="h-4 w-4" ... strokeWidth={1.8} />`, neither marked `aria-hidden` | Add `aria-hidden` to both, matching the sibling icons in the same files | The other four lucide icons on this surface carry `aria-hidden` (`BlogPost.tsx:38`, `BlogIndex.tsx:63,98`). These two do not, so decorative SVGs may reach the accessibility tree and add noise to the accessible name of the "Guides" back link and the "Try Battery Sensei free" button |

## Verification

### Checks that passed

| Check | Method | Result |
| --- | --- | --- |
| Contrast of 8 declared token pairs, light and dark | WCAG 2.x relative-luminance formula over the hex values at `src/styles.css:82-103,151-182` | `sumi-soft` on `washi` 8.14:1 light / 10.92:1 dark. `sumi` on `washi-soft` (code chip) 13.62:1 / 14.78:1. Tag pill `sumi-soft` on the 82% mix 8.35:1 / 9.42:1. FAQ and Pull card `sumi-soft` on the 70% mix 8.49:1 / 8.29:1. All pass 4.5:1. `nezumi` on `washi` 3.18:1 light: reported as a HIGH finding |
| Unresolved slug behaviour | Traced `$slug.tsx:13-15` to `__root.tsx:392` and `src/routes/404.tsx` | `beforeLoad` throws `notFound()`; `RouteNotFound` renders. No blank page, no unhandled throw |
| One link per index card | Read `BlogIndex.tsx:54-101` | Single `<Link>` per `<li>`. No nested anchors |
| Every internal link target resolves | Listed all `<A to=` and `<G slug=` values, compared against `src/routes/features.*.tsx` and the slugs in `src/data/glossary/terms.tsx` | 12 `<A>` targets and 4 `<G>` slugs, all resolve. No broken links |
| `/blog` to `/guides` migration | `vercel.json:22-31`, `public/sitemap.xml:123-141`, grep for `/blog` across `src/` | Permanent redirects present for both `/blog` and `/blog/:slug`. Sitemap lists `/guides` only. No article links to `/blog` |
| `<time datetime>` present | `BlogIndex.tsx:65`, `BlogPost.tsx:39` | Both use `dateTime={post.publishedAt}` with a valid ISO date |
| Reduced-motion guard on the reveal animation | `src/styles.css:2334-2340` against `src/components/zen/Reveal.tsx` | `@media (prefers-reduced-motion: reduce)` sets `[data-reveal] { transition: none; opacity: 1; transform: none }`. Guarded |
| `transition: all` | grep across the 11 in-scope files | None. Every transition names its properties |
| Decorative marks hidden | `src/components/zen/Hanko.tsx:39`, `BlogIndex.tsx:68`, `BlogPost.tsx:42` | `Hanko` carries `aria-hidden`. Both middot separators carry `aria-hidden`. Two lucide icons do not: reported as a LOW finding |
| Heading outline | Read both components | One `<h1>` per route. Index: h1 then card h2s. Article: h1, body H2s, FAQ h2. No skipped levels |
| Word counts behind the reading-time claim | Stripped JSX tags and brace expressions from each article body, then added the FAQ string bodies | 1,216 / 1,288 / 1,352 words. Blind spot: the regex approach counts the source text, so a JSX construct it does not model would shift the figure by a few percent. It cannot be off by the 50% to 67% the finding reports |

### Not verified

The brief bars the browser and preview tools. Each of these needs a rendered page.

1. **Rendered contrast of the card meta line.** My 2.90 to 3.18:1 comes from declared tokens in sRGB. The real ground also carries two fixed radial `--paper-glow` ellipses and a fiber texture overlay (`src/styles.css:464-473`). Check: open `/guides` in the light theme, use the DevTools contrast picker on the date text of the first card, then repeat at the bottom of the page where the body gradient reaches `--washi-soft`. Expect a value at or below 3.18:1.
2. **Focus indicator visibility.** No control on this surface declares `focus-visible` styles: the card link (`BlogIndex.tsx:57`), the in-article links (`_components.tsx:42`) and the back link (`BlogPost.tsx:28`) all rely on the user-agent ring, and `src/styles.css:2371-2373` applies `* { @apply outline-ring/50 }`, which recolors it. Only the download CTA (`BlogPost.tsx:97`) sets its own ring. Check: tab through `/guides` and one article in both themes, confirm a visible indicator of at least 2px at every stop.
3. **`<html lang>` on a guide for a non-English visitor.** Check: set the language to Deutsch on `/`, navigate to `/guides/healthy-cycle-count-macbook`, then read `document.documentElement.lang`. Expect `de` against English content.
4. **Reflow at 320px and 200% zoom.** Check the inline code chip at `healthy-cycle-count-macbook.tsx:143` (a 47-character command, longest unbreakable token 15 characters, so it should wrap at spaces) and the tag pill row at `BlogIndex.tsx:82`. Confirm no horizontal scroll.
5. **The "Read post" CTA contrast.** `text-hinomaru-ink/85` computes 4.88:1 on `--washi` and 4.53:1 on `--washi-soft`. It passes 4.5:1 with almost no margin, so confirm on the rendered ground including the glow layers.
6. **Article visibility without JavaScript.** `src/styles.css:2193` sets `[data-reveal] { opacity: 0 }` and the reveal flag is applied from a `useEffect` in `Reveal.tsx:32-61`. Check: disable JavaScript and load `/guides`. If the article stays at opacity 0, the prerendered HTML is invisible to any client without JS, which would be a HIGH finding for the whole site rather than this surface.

## Verdict

`Block`.

Three `HIGH` findings remain. The date and reading-time line on every guide card fails AA contrast
in light mode. Every guide is hardcoded English while the shell sets `<html lang>` from the
visitor's locale. The reading time shown on every card and article overstates the read by 50% to
67% and feeds a matching wrong `wordCount` into structured data.

The eight `MEDIUM` and three `LOW` findings stay in the table as work to do.
