---
surface: Roadmap / feature board
routes: /roadmap
files_reviewed: 6
findings: { high: 5, medium: 9, low: 1 }
verdict: Block
---

# Roadmap / feature board

## Scope and coverage

**Scope.** Route `/roadmap` and the board it renders: `src/routes/roadmap.tsx`,
`src/components/board/FeatureBoard.tsx`, `src/components/board/FeatureCard.tsx`,
`src/components/board/BoardSubmitForm.tsx`, `src/components/board/LicenseKeyDialog.tsx`,
`src/lib/board-license.ts`. States covered: loading, load error, empty, populated, vote
success, vote failure, license dialog open and invalid key, submit idle, submit sending,
submit error, submit success.

**Out of scope.** Nav, Footer, switchers, admin. `src/components/ui/dialog.tsx` was read to
judge how the surface uses it, but its own defects are not counted here.

**Stack.** TanStack Start plus TanStack Router, React 19, Tailwind v4, radix-ui, `motion`,
react-i18next. Styling uses a hand-rolled ink and paper token set in `src/styles.css`
(`--sumi`, `--washi`, `--nezumi`, `--hinomaru`, `--kin`, `--matcha`, `--line`) exposed to
Tailwind through `@theme`. Component idiom is shadcn "new-york" with `lucide` icons
(`components.json`). The board uses the tokens correctly. It contains no raw hex values.

**Convention documents found.** `CONTEXT.md` (ubiquitous language), `PRODUCT.md` (brand
register, design principles, accessibility bar), `README.md`. There is no
`CONTRIBUTING.md`, `CODING_STANDARDS.md`, or design-system doc. `CONTEXT.md` says nothing
about roadmap or board vocabulary, so the board's status words are governed only by the
locale files. `PRODUCT.md` sets the bar this review measures against: "accessible names for
icon controls" and "Do not rely on color alone to communicate comparison results or status."

**Supporting files read for evidence.** `src/lib/i18n/locales/{en,de,es,fr,ja}.json`,
`src/styles.css`, `api/feature-requests/index.ts`, `api/feature-requests/vote.ts`,
`lib/feature-board.ts`, `src/components/sections/Contact.tsx` (for the project's own form
idiom), `src/components/zen/Reveal.tsx`.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Names and roles on all 7 interactive controls, keyboard path through vote, expand, dialog and submit, radix Dialog focus behavior, live regions, form labels, hit areas, honeypot markup, reduced-motion guards | 7 findings |
| Layout | Section grouping, card structure, the `max-h-[560px]` scroll region, disclosure affordance, control-versus-content distinction, logical properties | 1 finding |
| Writing | All 46 `board.*` keys in 5 locales, server error strings in `api/feature-requests/*`, button labels, empty and error states, status vocabulary | 4 findings |
| Typography | Type scale of every text node on the surface, line-height, `tabular-nums`, `line-clamp`, input font sizes against the iOS 16px floor | 1 finding |
| Colors | 12 rendered token pairs computed in light and dark from declared token values | 2 findings (one shared with Accessibility, counted once) |
| UI | Voted, unvoted, disabled, hover, loading, sending, sent and error states; every transition and easing on the surface | 1 finding |

Motion is handled well and produced no finding. `Reveal` is covered by the
`prefers-reduced-motion` block at `src/styles.css:2336`, the load-more spinner carries
`motion-reduce:animate-none` (`FeatureBoard.tsx:360`), and every transition names its exact
properties. There is no `transition: all` on this surface.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/components/board/FeatureCard.tsx:16` (definition), `:70` (render) | `open: 'text-nezumi border-[var(--line)]'`, `planned: 'text-kin border-kin/30 bg-kin/[0.06]'`, `shipped: 'text-matcha border-matcha/30 bg-matcha/[0.06]'` on a `.paper-card` | Report the pairs; do not repaint without a decision. Three chips need a darker text token in light mode. The `in_progress` chip already models the fix: `--hinomaru-ink` exists precisely so a hue can be darkened for text without dragging its fill. Add `--kin-ink`, `--matcha-ink` and a text-weight neutral, then point the chips at those | Chip text is 10px semibold, so WCAG AA requires 4.5:1. Computed in light mode on the card surface: `planned` 2.24:1, `open` 3.39:1, `shipped` 3.98:1. Only `in_progress` passes at 5.42:1. Dark mode passes everywhere (5.44:1 to 8.36:1). The chip is the only text carrier of status, so status is the least readable thing on the card |
| HIGH | UI | `src/components/board/FeatureCard.tsx:50` to `:58` | `hasVoted ? 'border-hinomaru/40 bg-hinomaru/[0.08] text-hinomaru-ink shadow-[...]' : 'border-[var(--line)] bg-[...] text-sumi-soft ...'`, with `<ChevronUp className="h-4 w-4" ... aria-hidden />` unchanged in both branches | Swap the glyph with the state: `{hasVoted ? <Check .../> : <ChevronUp .../>}`. Keep the color change as reinforcement | Voted and not-voted differ only in border hue, an 8% background tint and text hue. The icon, the label and the layout are identical. State carried by color alone. `PRODUCT.md` names this as the project's own bar. `aria-pressed` covers screen readers, so the gap is purely visual |
| HIGH | Accessibility | `src/components/board/FeatureCard.tsx:48` and `:62` | `aria-label={hasVoted ? t('board.unvote') : t('board.vote')}` above `<span className="sr-only">{t('board.votes', { count: item.votes })}</span>` | Name the button after the item and drop the dead span: `aria-label={t('board.voteFor', { title: item.title, count: item.votes })}` with a new key such as `"Vote for {{title}}, {{count}} votes"`. Add `aria-live="polite"` to a count node, or let the changed name carry it | Every vote button on the board resolves to the same name, "Vote for this request", so a screen-reader forms or buttons list is a column of identical entries. `aria-label` also replaces the element's contents in name computation, so the `sr-only` count at `:62` is never announced. The count is real content hidden from assistive technology, and its change after a vote is announced by nothing |
| HIGH | Layout | `src/components/board/FeatureCard.tsx:76` to `:90` | `<button type="button" onClick={...} aria-expanded={expanded} className="mt-1.5 block w-full cursor-pointer text-left"><p className={[..., expanded ? '' : 'line-clamp-2'].join(' ')}>{item.body}</p></button>` | Add a visible cue and give the control a name of its own: a "Show more" / "Show less" text button with a `ChevronDown` that rotates, placed under the clamped paragraph, carrying `aria-expanded` and `aria-controls` pointing at the paragraph id. Render it only when the body actually overflows | Progressive disclosure with no visible affordance. The paragraph is styled exactly like static text, so nothing says the rest of the request is reachable. The control is also indistinguishable from content, and its accessible name is the entire body (up to 4000 characters), which a screen reader reads out as the button label. Escalation trigger: content behind a disclosure with no visible cue |
| HIGH | Writing | `src/components/board/FeatureBoard.tsx:235` and `:239`; also `BoardSubmitForm.tsx:50` and `LicenseKeyDialog.tsx:59` | `setVoteError(data.error ?? t('board.error'))` | Map status codes to locale keys and stop rendering `data.error`. Add `board.voteError.*` keys for the 409, 429, 502 and generic cases, and pick by `status`. Keep the raw server string for logs only | `api/feature-requests/vote.ts:125` returns `{ error: 'not_votable' }` on 409, so the user is shown the literal string `not_votable`, which names no way to recover. Every other server string is English only (`vote.ts:82`, `:92`, `:111`; `index.ts:190`, `:195`), so German, Spanish, French and Japanese visitors get English error copy. The fallback is wrong too: `board.error` reads "Couldn't load the board. Please try again." after a vote fails, but the board loaded fine |
| MEDIUM | Accessibility | `src/components/board/BoardSubmitForm.tsx:99` with `:22` to `:63` | `noValidate` on the form, `required` / `minLength` on the fields, and a `handleSubmit` that fetches immediately with no client check | Validate on submit before the fetch. Set `aria-invalid="true"` and `aria-describedby` on each failing field, render the message beside that field, and focus the first invalid one | `noValidate` switches off browser constraint validation, and nothing replaces it, so `required` and `minLength` are decorative. A blank submit costs a network round trip and returns one server message at a time, in the shared status line at the bottom of the form. No field is marked, and focus never moves, so the user has to guess which field failed. A user with three problems needs three round trips |
| MEDIUM | Accessibility | `src/components/board/FeatureBoard.tsx:344` | `<div className="flex flex-col gap-3">{section.items.map(...)}</div>` wrapping `<article>` cards | `<ul className="flex flex-col gap-3">` with each card in an `<li>`, matching `src/components/blog/BlogIndex.tsx:51` and `src/components/glossary/GlossaryIndex.tsx:73` | The card groups have no list semantics, so screen-reader users get no item count and no list navigation. The project already uses real list markup on its other card indexes, so this is the surface departing from its own idiom. No nested-interactive problem exists: the card is an `<article>`, not a link or button |
| MEDIUM | Accessibility | `src/components/board/LicenseKeyDialog.tsx:82` to `:92` | `placeholder={t('board.license.placeholder')}` with `aria-label={t('board.license.placeholder')}` and no visible label element | Add a real `<label htmlFor="board-license-key">` above the field, drop the `aria-label`, and change the placeholder to a format example. Match `BoardSubmitForm.tsx:111` | The only visible label is a placeholder, which disappears on first keystroke, so a user who pauses mid-entry has nothing naming the field. The placeholder also computes to 2.21:1 in light mode (`nezumi/70` on the input fill), below the 4.5:1 it needs while it is standing in for a label. This is the gate to voting, so the field has to be self-explanatory |
| MEDIUM | Accessibility | `src/components/board/BoardSubmitForm.tsx:65` to `:93` | `if (status === 'sent') { return (<div className="paper-card ...">...) }`, replacing the whole form | Keep the form mounted and render the success card in its place inside a container that already holds a `role="status"` region, or move focus to the success heading with `tabIndex={-1}` and a ref on mount | The form unmounts on success, taking its `role="status"` region at `:171` with it. The success card that replaces it has no live region, so the state change is announced to nobody. Focus was on the submit button, which is destroyed, so focus falls back to `<body>` and a keyboard user restarts tabbing from the top of the page |
| MEDIUM | Accessibility | `src/components/board/LicenseKeyDialog.tsx:93` to `:104` | `className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nezumi transition-colors hover:text-sumi"` around a `h-4 w-4` icon | Add padding so the target reaches at least 24x24, for example `-m-2 p-2`, keeping the icon at 16px | The show/hide button has no padding, so its hit area equals its 16x16 icon. That is under the WCAG 2.5.8 Level AA 24x24 minimum, and none of the exceptions apply. It sits inside the input's `pr-11` gutter, so the padding has room |
| MEDIUM | Typography | `src/components/board/BoardSubmitForm.tsx:203` and `src/components/board/LicenseKeyDialog.tsx:91` | `px-3.5 py-2.5 text-[0.9375rem]` in the shared `inputClass`, and `text-[0.875rem]` on the license input | Hold 16px on small screens: `text-base sm:text-[0.9375rem]` on `inputClass` and `text-base sm:text-[0.875rem]` on the license input | 15px and 14px are both under 16px, so iOS Safari zooms the whole page when either field takes focus. The viewport meta at `src/routes/__root.tsx:282` does not cap zoom, so nothing prevents it. Four fields on this surface are affected. `src/components/sections/Contact.tsx` shares `inputClass`'s value and has the same problem, so the cheapest fix is one shared change |
| MEDIUM | Writing | `src/components/board/FeatureBoard.tsx:317` to `:322` | `t('board.loadError.title', "The board didn't load.")` and `t('board.loadError.message', 'That is on us, not on you. Refresh to try again.')` | Add `board.loadError.title` and `board.loadError.message` to all five locale files and drop the inline defaults | `board.loadError` is absent from `en`, `de`, `es`, `fr` and `ja` (verified against all five files). Every locale renders the inline English fallback, so the board's load-failure copy is English on every non-English page. Every neighbouring string on this surface goes through the locale files |
| MEDIUM | Writing | `src/components/board/FeatureBoard.tsx:340` with `src/components/board/FeatureCard.tsx:70`; keys at `src/lib/i18n/locales/en.json` `board.sections` and `board.statuses` | Section heading renders `board.sections.open` ("Open for votes") while every card inside it renders `board.statuses.open` ("Open") | Use one vocabulary. Since cards are already grouped by status, delete the chip and keep the section heading, which also retires the failing chip colors in the first finding | Two labels name one status, and they disagree in wording. The chip repeats what the heading above it already said on every card, so the surface spends its smallest and least readable text on redundant information. `board.sections.in_progress` and `board.statuses.in_progress` are byte-identical, which makes the duplication plain |
| MEDIUM | Writing | `src/components/board/BoardSubmitForm.tsx:119`, `:133`, `:156` | `maxLength={120}` on the title, `maxLength={4000}` on the details, `maxLength={254}` on the email, with no counter and no hint | Add a counter that appears once the field passes about 80% of its limit, wired to the field with `aria-describedby` and updated in a polite live region. State the `minLength` requirement in the label hint, in the slot `BoardSubmitForm.tsx:147` already uses for the email hint | Nothing announces a limit before it is hit, and `maxLength` fails silently: keystrokes stop registering with no message. A user writing a long title finds their text stops appearing and gets no reason. The minimums (4 for the title, 12 for the details) are also invisible until the server rejects the submit |
| LOW | Accessibility | `src/components/board/BoardSubmitForm.tsx:164` to `:167` | `<label className="sr-only" aria-hidden="true">{t('contact.fields.company')}<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>` | Drop `aria-hidden` and keep the wrapper `sr-only`, or hide the honeypot with CSS (`position:absolute; left:-9999px`) plus `tabIndex={-1}` so nothing focusable sits inside an `aria-hidden` subtree | `aria-hidden="true"` wraps a focusable input. `tabIndex={-1}` removes it from the tab order but not from programmatic focus, and screen readers differ on whether the virtual cursor reaches it. The same block appears in `src/components/sections/Contact.tsx:329`, so one fix covers both. The label also borrows `contact.fields.company` on a board form |

## Verification

**Checks run.**

1. Read all six in-scope files in full, plus `api/feature-requests/index.ts`,
   `api/feature-requests/vote.ts`, `lib/feature-board.ts`, `src/styles.css`,
   `src/components/ui/dialog.tsx`, `src/components/zen/Reveal.tsx`.
2. Contrast computed from declared token values with a script (sRGB relative luminance,
   alpha compositing for the `/[0.06]` and `/[0.08]` tints, the `.paper-card` gradient taken
   at its top stop). Light mode results on the card: `planned` 2.24:1, `open` 3.39:1,
   `shipped` 3.98:1, `in_progress` 5.42:1, voted vote button 5.23:1, unvoted vote button
   8.68:1. Dark mode results: 6.75:1, 8.36:1, 5.44:1, 7.65:1, 7.57:1, 10.66:1. Input
   placeholder (`nezumi/70` on the input fill): 2.21:1 light, 3.08:1 dark. Input body text:
   15.71:1 light, 10.76:1 dark. **Blind spot:** these are computed from the declared tokens,
   not measured on a rendered page. The gradient approximation moves the base by about one
   sRGB unit, which cannot change any pass or fail verdict above. The orchestrator should
   confirm with a real measurement.
3. Locale keys checked programmatically across all five files. `board.loadError` is missing
   from every one. All other `board.*` keys used by the surface are present in all five.
4. Server response shapes traced end to end. `api/feature-requests/vote.ts:125` returns
   `{ error: 'not_votable' }`, and `FeatureBoard.tsx:230` to `:236` routes a 409 into the
   `else` branch, which renders `data.error` verbatim.
5. Optimistic vote reconciliation read line by line. `FeatureBoard.tsx:203` to `:217`
   rolls back both the vote set and the count on failure, and `:154` to `:175` applies a
   per-id delta rather than a wholesale replace. **No correctness defect found here.**
6. Typed content on a failed submit. `BoardSubmitForm.tsx:49` to `:53` returns early on
   error and clears `title`, `details` and `email` only on success at `:56` to `:58`. The
   `catch` at `:59` also preserves them. **No data-loss risk. This is correct.**
7. LicenseKeyDialog gate behavior, read against `src/components/ui/dialog.tsx` and radix
   `Dialog`. Accessible name comes from `DialogTitle` at `:72`. Escape closes through
   `DismissableLayer`. Focus moves into the content and returns to the previously focused
   element (the vote button) on close through radix `FocusScope`. Wrong-key copy at
   `board.license.invalid` names the next step: check for typos, or find it in the purchase
   email. **All five gate checks pass.**
8. Filtering, sorting and tabs. There are none. The board renders four fixed sections in
   `SECTION_ORDER` (`FeatureBoard.tsx:23`), and empty sections are dropped at `:295`.
   Nothing to review.
9. Reduced motion. `Reveal` is neutralized by `src/styles.css:2336`, the load-more spinner
   carries `motion-reduce:animate-none` (`FeatureBoard.tsx:360`), and every transition on
   the surface names explicit properties. **Clear.**
10. Nested interactive elements inside cards. The card root is `<article>`
    (`FeatureCard.tsx:42`), not a link or button, and the two buttons inside it are
    siblings. **Clear.**

**Not verified.** Each needs the rendered page.

1. Focus-ring visibility on the two submit buttons. `BoardSubmitForm.tsx:187` and
   `LicenseKeyDialog.tsx:116` carry no `focus-visible:` classes, while the project's own
   `Contact.tsx:366` adds `focus-visible:ring-2 focus-visible:ring-sumi/40
   focus-visible:ring-offset-2`. Both fall back to the user-agent ring, whose color the base
   rule `* { @apply outline-ring/50 }` (`src/styles.css:2373`) tries to override.
   **Check:** tab to each button in Chrome, Safari and Firefox in both themes, and confirm a
   ring is visible against the dark `.btn-sumi` fill.
2. Hit area of the refresh button at `FeatureBoard.tsx:325`. It is `text-[0.8125rem]` with
   an `h-3.5` icon and no padding, so its height depends on inherited line-height.
   **Check:** measure the rendered box against the 24x24 minimum.
3. The `max-h-[560px]` scroll region at `FeatureBoard.tsx:338` at 200% zoom and at 320px
   width. A fixed pixel max-height does not grow with text size. **Check:** at 200% zoom,
   confirm the region still shows more than one card and that the page itself does not
   scroll horizontally at 320px.
4. Whether the scroll region gives a visible cue that more cards follow. **Check:** at the
   default width, confirm the next card peeks past the 560px edge rather than the list
   cutting flush.
5. Keyboard-driven pagination. The load-more sentinel at `FeatureBoard.tsx:357` is
   `aria-hidden` and there is no "Load more" button, so the next page loads only when
   scrolling brings the sentinel into view. **Check:** tab through the cards with no mouse
   and confirm a second page loads, then confirm whether the appended cards are announced.
6. Measured contrast of every pair in item 2 above, in a real browser, in both themes.
7. The license dialog's close button label. `src/components/ui/dialog.tsx:78` hardcodes
   `<span className="sr-only">Close</span>`, so all five locales announce the English word.
   The primitive is out of scope, so this is reported here as how the surface consumes it
   rather than as a finding. **Check:** confirm on a non-English locale, then fix in the
   primitive.

## Verdict

`Block`.

Five HIGH findings remain. Three of them sit in `FeatureCard.tsx` and share one cause: the
card communicates status and vote state through color and position, and gives assistive
technology and low-vision users nothing else. The other two are a disclosure with no visible
cue and an error path that can print `not_votable` at the user.
