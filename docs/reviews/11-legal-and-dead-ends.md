---
surface: Long documents and dead ends
routes: /legal, /privacy, /walkthrough, /404 (and the router notFoundComponent + errorComponent)
files_reviewed: 8
findings: { high: 1, medium: 9, low: 5 }
verdict: Block
---

# Long documents and dead ends

## Scope and coverage

**Routes.** `/legal`, `/privacy`, `/walkthrough`, `/404`, plus the two shells wired at
`src/routes/__root.tsx:391-392` (`errorComponent: RouteErrorBoundary`,
`notFoundComponent: RouteNotFound`).

**Files read.** `src/routes/legal.tsx`, `src/routes/privacy.tsx`, `src/routes/walkthrough.tsx`,
`src/routes/404.tsx`, `src/components/CatchBoundary.tsx`, `src/components/DocumentNav.tsx`
(usage only), `src/components/ProtectedBusinessPhone.tsx`, `scripts/postbuild-404.mjs`.
Supporting reads: `src/styles.css`, `src/lib/format-date.ts`, `src/components/HomeLink.tsx`,
`src/components/zen/Reveal.tsx`, `src/components/sections/Nav.tsx` (header height only),
`vercel.json`, `vite.config.ts`, all five files in `src/lib/i18n/locales/`.

**Stack.** TanStack Start + TanStack Router, React 19, Tailwind v4 (native `@layer`),
react-i18next, lucide-react. Colors come from CSS custom properties in `src/styles.css:80-190`
mapped to Tailwind color utilities at `src/styles.css:326-331`. Surfaces mix toward
`--paper-lift` with `color-mix(in oklab, ...)`.

**Convention documents found.** `CONTEXT.md` (glossary: Pro, Lifetime, Yearly Patron, Guides,
Feature pages, Saga). `PRODUCT.md` (register, five design principles, accessibility bar).
`README.md`. No `CONTRIBUTING.md`, `CODING_STANDARDS.md`, or design-system doc.

**Boundary.** Nav, Footer, locale and theme switchers, and `src/components/ui/*` were not
reviewed. `DocumentNav` is reported as consumed by `/legal` and `/privacy` only; the component
itself belongs to the global agent, and finding 2 below may have its root cause there.
No rendered page was inspected. Everything in the table is proved from source.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Heading order on both documents, `<nav aria-label>` on DocumentNav, anchor to `id` parity (script, 10/10 and 11/11), focus handling in `ProtectedBusinessPhone`, live regions in the walkthrough form, `<time>` usage, `aria-label` on non-role elements, reduced-motion branches at `src/styles.css:2335-2344` | 7 findings |
| Layout | Jump-list placement on both documents, `scroll-margin-top` against the `sticky top-0` header, section nesting, reachability of `/walkthrough` | 2 findings |
| Writing | Legal and privacy body copy in `en.json` against `PRODUCT.md` principle 2 and `CONTEXT.md` terms, 404 and error-shell copy, link labels against their destinations, i18n key coverage across five locales | 4 findings |
| Typography | Reading measure on both documents and the TL;DR box, `.prose-readable` vs `max-w-2xl`, the 12px uppercase tracked last-updated line, `.legal-list` markers | 1 finding |
| Colors | Computed WCAG ratios for `--nezumi`, `--matcha`, `--sumi-soft`, `--hinomaru-ink` and `--sumi` against `--washi` in both themes, plus the `/70` alpha placeholder | 1 finding |
| UI | Focus-ring treatments across `walkthrough.tsx`, the error `<pre>`, the video placeholder, do/don't icon pairing in the TL;DR | 1 finding |

`CONTEXT.md` compliance: no retired label ("Premium", "Journal", "Battery Journal") appears in
any of the five locale files for `legal.*`, `privacy.*`, `walkthrough.*` or `errors.*`. The 404
trails use "Guides" and "Pro" is used correctly in `privacy.body.why.required`. Clear.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/styles.css:84` and `src/styles.css:96`; used at `src/routes/legal.tsx:102`, `:163`, `src/routes/privacy.tsx:111`, `:264`, `:432`, `:457`, `src/components/DocumentNav.tsx:37`, `:41`, `src/components/CatchBoundary.tsx:121`, `src/routes/walkthrough.tsx:206`, `:231`, `:286` | `--nezumi: #8a847c;` and `--matcha: #6f7a3a;` on `--washi: #f4ede0` | Raise the light-mode values to `--nezumi: #706b64` (4.54:1) and `--matcha: #677136` (4.52:1), and change `placeholder:text-nezumi/70` at `walkthrough.tsx:206` to `placeholder:text-nezumi` | Computed from the source hex values: `#8a847c` on `#f4ede0` is 3.18:1 and `#6f7a3a` is 3.99:1, both below the 4.5:1 AA floor for normal text. The alpha placeholder composites to `#aaa49a`, 2.13:1. This carries real content, not decoration: the GDPR Art. 22 statement (`privacy.tsx:264`), the DNT and GPC note (`:432`), the operator responsibility clause (`legal.tsx:163`), both last-updated dates, and every jump-list label. Dark mode already clears the bar (6.92:1 and 6.01:1) because it was audited at `src/styles.css:154-160`; the light set was not. `--nezumi` is a shared token, so the fix belongs in `styles.css` and the token owner may hold the same row |
| MEDIUM | Writing | `src/routes/legal.tsx:115` and `src/routes/privacy.tsx:136` | `label={t('legal.onThisPage', 'On this page')}` and `label={t('privacy.onThisPage', 'On this page')}` | Add `onThisPage` under `legal` and `privacy` in all five files in `src/lib/i18n/locales/`, then drop the inline fallback | Neither key exists in `en.json`, `de.json`, `es.json`, `fr.json` or `ja.json` (checked by loading all five). The English fallback fires everywhere, so the visible jump-list label and the `aria-label` on the `<nav>` landmark (`DocumentNav.tsx:34`) read "On this page" for German, Spanish, French and Japanese readers on both long documents |
| MEDIUM | Layout | `src/styles.css:2135-2137`; defeated utilities at `src/routes/legal.tsx:346` and `src/routes/privacy.tsx:527` | `section[id] { scroll-margin-top: 5rem; }` written outside every `@layer`, while `<section id={anchor} className="scroll-mt-24">` sits in `@layer utilities` | Move the rule into `@layer base` so the per-page utility can win, or set it to `6rem` to match the intent of `scroll-mt-24` | An unlayered rule outranks every Tailwind layer, so `scroll-mt-24` (6rem) is dead and the effective offset is 5rem. The sticky header is `sm:h-20`, exactly 5rem (`src/components/sections/Nav.tsx:194-196`), so at 640px and wider a jumped-to section lands flush against the header with zero clearance. This affects all 21 jump targets across the two documents. The codebase already documents this exact layer hazard twice, at `src/styles.css:504-510` and `:2126-2128`, so the pattern is known |
| MEDIUM | Accessibility | `src/components/ProtectedBusinessPhone.tsx:30-37`, consumed at `src/routes/legal.tsx:157-161` and `src/routes/privacy.tsx:167-171` | `<button type="button" onClick={() => setRevealed(true)}>` unmounts and is replaced by `<a href={"tel:..."}>` at `:22-28` | Keep the element mounted and move focus to the revealed link with a ref plus `useEffect`, or render the link with the digits swapped in so the focused element survives | The activated control removes itself from the DOM. Keyboard focus drops to `<body>`, so the reader must tab from the top of a document that is several thousand pixels long to reach the number they just asked for. Nothing announces that a phone number appeared. This sits at the contact block of both legal documents, which is the one thing an imprint exists to deliver |
| MEDIUM | Accessibility | `src/routes/walkthrough.tsx:224-235` and `:207` | Error `<p role="alert">` has no `id`; success `<p>` has no live-region role; the input carries `aria-invalid={status === 'error'}` with no `aria-describedby` | Give the status `<p>` a stable `id="walkthrough-notify-status"`, add `aria-describedby="walkthrough-notify-status"` to the input, and put `role="status"` on the success paragraph | The error is announced but not associated with the field, so a screen reader user hears the alert and then finds a field marked invalid with no reachable explanation. The success message is never announced at all, so a screen reader user who submits a valid address gets no confirmation that the form did anything |
| MEDIUM | Writing | `src/routes/walkthrough.tsx:43-48`, string at `walkthrough.backToCompare` | `<HomeLink ...>{t('walkthrough.backToCompare')}</HomeLink>` with no `hash`, labelled "Back to comparison" | `<HomeLink hash="compare" ...>` | The label names the comparison section, the link lands at the top of the homepage. `HomeLink` already accepts a `hash` prop (`src/components/HomeLink.tsx:10`), the target exists (`src/components/sections/Compare.tsx:115`, `id="compare"`), and `vercel.json` already redirects `/vs-aldente` to `/#compare`, so the anchor is the established destination. All five locales carry the same promise ("Zurück zum Vergleich", "比較に戻る") |
| MEDIUM | Writing | `src/routes/walkthrough.tsx:84` | `Check out the Guides` | `{t('walkthrough.guidesCta')}` with the string added to all five locale files | Every other user-facing string on this page reads through `t()`. This one is a hardcoded English literal inside a translated page, so a German, Spanish, French or Japanese reader gets an English button label next to translated copy |
| MEDIUM | Writing | `privacy.body.security.p1` in all five locale files, rendered at `src/routes/privacy.tsx:365-371` | "We use reasonable technical and organizational measures appropriate to the nature of the data and the risks to protect it. No system or transmission can be guaranteed absolutely secure." | Name what the repo actually does: the board license key is never stored raw and only a keyed HMAC voter identifier is kept, the key is sent only in a POST body and never in a URL, header or cookie, the database is EU-hosted and holds no full card numbers, admin login-attempt records are deleted after 30 days, and the site is served under HSTS with a strict CSP and `frame-ancestors 'self'`. Keep the closing "no system can be guaranteed absolutely secure" sentence | `PRODUCT.md` design principle 2 asks for privacy made tangible, and every other section of this notice does that with named processors, named retention windows and named data fields. This is the one section that falls back to a template clause, and it sits under the heading "How we protect data". The specifics are already elsewhere in the same document (`privacy.body.what.items.localeBody`, `items.contactBody`, `privacy.body.processors.items.postgresBody`, `privacy.body.retention.items.logsBody`) and in `vercel.json:headers`, so no new claim has to be invented |
| MEDIUM | Layout | `src/routes/walkthrough.tsx:24` against `public/sitemap.xml:65-70` | The page sets `{ name: 'robots', content: 'noindex, follow' }` while the sitemap lists `https://www.battery-sensei.app/walkthrough` as a canonical entry | Pick one. Either drop the sitemap entry until the video ships, or drop `noindex` | No component links to `/walkthrough`. A repository-wide search for the path across `src`, `public` and `scripts` returns only the route file, the generated `routeTree.gen.ts`, and the sitemap; `src/routes/features.index.tsx:245` mentions the words in prose but does not link. So the page is unreachable by in-site navigation, told not to be indexed, and simultaneously advertised in the sitemap. Its working notify form can only be reached by typing the URL |
| MEDIUM | Accessibility | `src/components/CatchBoundary.tsx:167-169` rendered at `:89-97` | `const detail = error instanceof Error && error.message ? error.message : undefined`, rendered in `<Reveal as="pre" className="... overflow-x-auto ...">{detail}</Reveal>` | Gate the `<pre>` on `import.meta.env.DEV`, and if it stays in production give it `tabIndex={0}` plus a visible label so the box says what it is | Three problems in one element. The raw exception message reaches end users in production, which can leak internal identifiers and means nothing to a visitor. The `<pre>` has `overflow-x-auto` and no `tabindex`, so a long single-line message cannot be scrolled by keyboard in Safari or Firefox. It carries no label, so it renders as an unexplained monospace box under the error copy. The code comment at `:166-167` documents the choice, which sets where to fix it, not whether |
| LOW | Accessibility | `src/routes/legal.tsx:99-105` and `src/routes/privacy.tsx:108-114` | `<Reveal as="p" ...>{t('legal.lastUpdated', { date: formattedDate })}</Reveal>` | Wrap the interpolated date in `<time dateTime={LAST_UPDATED}>` using `<Trans>`, matching `src/components/sections/Footer.tsx:158` | Both documents have a real last-updated date and both render it as plain localized text with no machine-readable value. The ISO string is already in scope as `LAST_UPDATED` (`legal.tsx:22`, `privacy.tsx:25`). The project already uses `<time dateTime>` in three other places (`Footer.tsx:158`, `BlogIndex.tsx:65`, `BlogPost.tsx:39`), so this is the house idiom, not a new element |
| LOW | Typography | `src/routes/privacy.tsx:118` and `:432`, against `src/routes/legal.tsx:109` | Privacy caps its intro with `max-w-2xl` (42rem) and lets the TL;DR note run the full `max-w-3xl` column at `0.875rem`; legal caps the same intro with `prose-readable` | Use `prose-readable` on `privacy.tsx:118`, and add `prose-readable` or `max-w-prose` to the note at `:432` | `.prose-readable` caps at 65ch (`src/styles.css:492-495`). The privacy intro at 42rem and 17px runs near 84 characters, and the TL;DR note at roughly 592px of inner width and 14px runs near 95 characters. Both exceed the 45 to 75 measure the project's own token already enforces on the sibling document |
| LOW | Accessibility | `src/routes/walkthrough.tsx:249-252` | `<div className="relative aspect-video ..." aria-label={badge}>` | Delete `aria-label={badge}` | `aria-label` is ignored on an element with no role. The badge text is already rendered visibly inside the same container at `:281-283`, so nothing is lost by removing it and the markup stops making a promise the accessibility tree does not keep. Deletion is the cheapest correct fix here |
| LOW | Accessibility | `src/routes/legal.tsx:139-147` | `<p>{t('...seatLabel')}<br />{t('...seatLine1')}<br />{t('...seatLine2')}<br />{t('...seatLine3')}</p>` | `<address className="not-italic">` with the same children | This is the imprint. The operator's postal address is the page's primary payload and `<address>` is the element for exactly that. The change is one tag and costs no styling beyond `not-italic` |
| LOW | UI | `src/routes/walkthrough.tsx:206` against `:212` and `:77` | Input uses `focus:ring-2 focus:ring-sumi/25`; the submit button and the Guides link in the same file use `focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2` | Match the two controls that surround it: `focus-visible:ring-2 focus-visible:ring-sumi/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]` | Three focusable controls sit within a few hundred pixels of each other and two of them get a stronger focus ring than the third. `sumi/25` on a washi ground is the weakest indicator on the page, and it is on the only control that takes typed input |

No finding was excluded by the 15-item cap.

## Verification

**Checks that passed.**

1. Jump-list anchor parity. Script over `src/routes/legal.tsx` and `src/routes/privacy.tsx`
   comparing `{ anchor: '...' }` entries against `anchor="..."` props.
   Result: `legal.tsx nav: 10 blocks: 10 missing: [] orphan blocks: []` and
   `privacy.tsx nav: 11 blocks: 11 missing: [] orphan blocks: []`.
   Every table-of-contents link reaches a real `id`.
2. Heading order. `/legal` is `h1` then ten `h2`. `/privacy` is `h1`, the TL;DR `h2`
   (`privacy.tsx:417`), then eleven `h2`. No level is skipped, and no heading is faked with a
   styled `<p>`. The DocumentNav label is a `<p>` inside a labelled `<nav>`, which is correct.
3. Error-shell recovery paths. `RouteErrorBoundary` supplies a real `<button type="button">`
   calling `reset()` (`CatchBoundary.tsx:181-184`, rendered at `:108-114`) and a home link at
   `:58-63`. The heading is a real `h1` (`:72-81`). None of the HIGH triggers for an
   unrecoverable error screen fires.
4. 404 status handling, read from configuration. `vite.config.ts:114` registers
   `{ path: '/404', prerender: { enabled: true } }`. `scripts/postbuild-404.mjs:6-12` copies
   `dist/client/404/index.html` to `dist/client/404.html` and exits 1 if the prerender is
   missing. `vercel.json` sets `outputDirectory: dist/client` and contains no SPA catch-all
   rewrite, so an unmatched path is served by Vercel's static `404.html` handling rather than a
   200 shell. The `/404` route itself is `noindex, nofollow` (`404.tsx:16`). This is the correct
   shape. The live status code is still in the not-verified list below.
5. 404 destinations exist. `/features`, `/guides`, `/glossary` are real routes, and the FAQ
   hash target exists at `src/components/sections/FAQ.tsx:278` (`id="faq"`). The refund deep
   link `legal.tsx:248` targets `#faq-refund`, which `FAQ.tsx:260` and `:300` handle by
   expanding the matching row.
6. Error and 404 i18n coverage. `errors.boundary` (5 keys) and `errors.notFound` (6 keys plus 4
   trails) are complete in all five locale files. Only `onThisPage` is missing, which is
   finding 2.
7. Reduced motion. `[data-reveal]` is neutralised at `src/styles.css:2336-2340` and
   `[data-stamp]` at `:2342-2344`, both with `!important`. `html { scroll-behavior: smooth }`
   is reverted to `auto` at `:441-445`. Every animated element on this surface is covered.
8. No global focus-outline reset. `outline` appears twice in `src/styles.css`: at `:2183`
   scoped to `.nav-link:focus-visible`, and at `:2373` as `outline-ring/50`, which sets a color
   and no style. The browser default focus ring survives on `.legal-link` and `.zen-link`.
9. Cascade-layer claim behind finding 3. `@layer components { .zen-section { ... } }` closes at
   `src/styles.css:2132` and `section[id]` opens at `:2135`, outside any layer.
10. `CONTEXT.md` term check across all five locale files for `legal.*`, `privacy.*`,
    `walkthrough.*` and `errors.*`. No occurrence of "Premium", "Journal" or "Battery Journal".

**Not verified.** Each needs the rendered page.

1. Composited contrast for finding 1. The page ground is `--washi` plus the `body::before`
   texture at `opacity: 0.55`, and the walkthrough success line sits on a `.paper-card`
   gradient that mixes toward `--washi-deep`. Check: open `/privacy` and `/walkthrough` at
   1280px in light mode and run a contrast picker on the last-updated line
   (`privacy.tsx:111`), the TL;DR note (`:432`), and the notify success line
   (`walkthrough.tsx:231`). The source-token arithmetic says 3.18:1, 3.18:1 and 3.99:1.
2. Anchor landing position for finding 3. Click each DocumentNav entry on `/legal` and
   `/privacy` at 1280px and at 375px, then measure the gap between the sticky header's bottom
   edge and the section kicker. Expected: 0px at 640px and wider, 1rem below that.
3. Fragment navigation under TanStack Router. `DocumentNav.tsx:44` uses a plain
   `<a href={"#" + anchor}>` rather than the router's `Link hash`. Confirm the jump works, that
   the history entry is sane, and where keyboard focus lands after the jump.
4. Narrow-width behaviour at 320px and at 200% zoom, for `legal.tsx:231` (a `<p>` set to
   `flex flex-wrap` holding the refund button and its hint), the walkthrough form row
   (`walkthrough.tsx:193-223`), and the fixed `h-5` status slot at `:224`, which may clip the
   success line once the icon and text wrap.
5. Real HTTP status. `curl -sI https://www.battery-sensei.app/no-such-page` should report
   `HTTP/2 404`. The configuration was read; no build was run and no deploy was hit.
6. Keyboard scrolling of the error `<pre>` (finding 10) in Safari, with an error message long
   enough to overflow.
7. Focus-ring visibility for finding 15, comparing the input against the submit button on the
   same row.

## Verdict

`Block`.

One HIGH finding stands: the light-mode `--nezumi` and `--matcha` tokens fail the AA contrast
floor for normal text, and this surface renders substantive legal copy in them, including the
GDPR Article 22 statement, the Do Not Track note and both last-updated dates. `PRODUCT.md` sets
"sufficient contrast in light and dark themes" as the accessibility bar, and the dark theme
already meets it. The fix is two hex values in `src/styles.css` plus dropping one alpha modifier.
