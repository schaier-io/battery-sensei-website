---
surface: Newsletter lifecycle
routes: /newsletter/confirm, /newsletter/confirmed, /newsletter/unsubscribe, /newsletter/unsubscribed
files_reviewed: 14
findings: { high: 3, medium: 9, low: 2 }
verdict: Block
---

# Newsletter lifecycle interface review

## Scope and coverage

Four routes treated as one flow, plus the shared resend form and the API handlers that
decide what each page renders.

**Files reviewed**

- `src/routes/newsletter.confirm.tsx`
- `src/routes/newsletter.confirmed.tsx`
- `src/routes/newsletter.unsubscribe.tsx`
- `src/routes/newsletter.unsubscribed.tsx`
- `src/components/NewsletterResendForm.tsx`
- `src/components/zen/Reveal.tsx`, `src/components/zen/Hanko.tsx`, `src/components/zen/EnsoSpinner.tsx`
- `src/components/HomeLink.tsx`, `src/components/MacOnlyConfirm.tsx`
- `api/newsletter/confirm.ts`, `api/newsletter/unsubscribe.ts`
- `src/styles.css`, `src/lib/i18n/locales/{en,de,fr,ja}.json`

**Signup entry point.** The form these pages pair with is `FreeSignupForm` in
`src/components/sections/Pricing.tsx:764`, anchored at `#free-download-email`
(`src/components/sections/Pricing.tsx:196`). `/newsletter/unsubscribed` links back to that
anchor at `src/routes/newsletter.unsubscribed.tsx:83`. The resend form posts to the same
`/api/free-signup` endpoint, so the confirm flow has one canonical path.

**The fire-and-forget note is stale.** `src/components/sections/Pricing.tsx:740-756` now
awaits the response and sets `setStatus(ok ? 'success' : 'error')`, and the outcome renders
at `src/components/sections/Pricing.tsx:797-810`. The failure is no longer silent there.
`NewsletterResendForm.tsx:48-66` follows the same awaited pattern. No fire-and-forget fetch
exists in this surface.

**Stack.** TanStack Start with SSR on (`vite.config.ts:107`), TanStack Router, React 19,
Tailwind v4, radix-ui, `motion`, react-i18next. Colors come from the `--sumi` / `--washi`
token pair in `src/styles.css:80-200`, with both a `.dark` class block and a
`prefers-color-scheme` block. The surface uses tokens throughout. No ad-hoc hex.

**Convention documents found.** `CONTEXT.md` (ubiquitous language), `PRODUCT.md` (brand
register and accessibility bar), `README.md`. No CONTRIBUTING, design-system doc, or
interface ADR. `PRODUCT.md:33` sets the bar this review measures against: semantic controls,
visible focus states, sufficient contrast in both themes, reduced-motion fallbacks.

**Boundary.** Nav, Footer, switchers and `src/components/ui/*` were excluded as instructed.
No browser was used, per the shared brief.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | All four routes in every state they can enter, the resend form, `Reveal`, `Hanko`, `EnsoSpinner`, live regions, focus handling, labels, reduced-motion blocks in `styles.css` | 7 findings |
| Layout | DOM and reading order, `max-w-3xl` / `max-w-sm` containers, the reserved status slots, full-width buttons inside the page margins | Clear (see note) |
| Writing | All `newsletter.*` keys in en, de, fr, ja against `PRODUCT.md` tone and `CONTEXT.md` terms | 2 findings |
| Typography | Type scale, heading level, line-height, input font size against the iOS zoom floor | 1 finding |
| Colors | Every token pair in the surface computed from the declared values in both themes | 2 findings |
| UI | Button treatment against `.btn-sumi`, icon stroke weights, status icon consistency, motion durations | 2 findings |

Layout note: the reserved status slots at `newsletter.confirm.tsx:245` (`min-h-[1.25rem]`)
and `newsletter.unsubscribe.tsx:154` (`min-h-[1.5rem]`) use `min-height`, so a wrapped
message grows the slot instead of clipping. No content is lost. The comments above both
slots claim the layout never jumps, which is not true once the message wraps, but nothing
becomes unreachable. Not a finding.

## The flow, end to end

Each route and every state it can enter:

**`/newsletter/confirm`** (5 states, 4 handled)
`checking` renders the spinner, `confirming` renders the spinner, `manual` renders the
confirm button, `error` renders the retry button plus a message, `missing-token` swaps the
whole page to the resend form. The unhandled path is not a state: it is `checking` never
being left, which happens when JS does not run (F1) or the POST never settles (F4).

**`/newsletter/confirmed`** (3 states, 2 reachable)
Default renders success plus the download button. `status=invalid` renders the resend form
pre-filled with the email peeked out of the expired token. `status=error` is declared at
`newsletter.confirmed.tsx:34` and has copy in every locale, but `safeRedirectPath` at
`api/newsletter/confirm.ts:86-96` only ever emits `?status=invalid`, so nothing reaches it.
Dead copy, no user impact.

**`/newsletter/unsubscribe`** (4 states, all handled)
`idle`, `submitting`, `error`, `missing-token`. The missing-token state gives a working
`mailto:` button rather than a disabled control. This page derives its initial state
synchronously at line 72, which is the pattern `/newsletter/confirm` should copy.

**`/newsletter/unsubscribed`** (1 state)
`Search.status` is declared at lines 24 and 29 but the component never reads it. Every
arrival renders the same success page. See F2.

**Where a user gets stuck.** Two places. A user whose browser does not run the page script
sees a permanent spinner on `/newsletter/confirm` and blank pages on the other three (F1). A
user with a stale unsubscribe token is told they are off the list when they are not, and
keeps receiving mail with no signal that anything failed (F2).

**Answers to the specific questions**

1. *Missing, malformed or expired token.* Handled on all four routes when JS runs. A
   malformed token is stripped by `validateSearch` and becomes the missing-token state. An
   expired token returns HTTP 200 with `redirectTo`, so `newsletter.confirm.tsx:124` treats
   it as a success and navigates to the resend page. No blank page and no unhandled throw
   with JS on. With JS off, see F1.
2. *Recovery from an expired confirm token.* Reachable and correct. `api/newsletter/confirm.ts:169-177`
   peeks the email out of the expired token and redirects to
   `/newsletter/confirmed?status=invalid&email=...`, which renders `NewsletterResendForm`
   pre-filled at `newsletter.confirmed.tsx:112-119`. `/newsletter/confirm` with no usable
   token renders the same form at line 241. The recovery is one field and one button away
   from both dead ends.
3. *Unsubscribe safety.* Safe. The action is an explicit submit, not a GET on page load.
   `api/newsletter/unsubscribe.ts:91-107` GET performs no write and only redirects to the
   confirm page. The write happens in POST, fired from the button `onClick` at
   `newsletter.unsubscribe.tsx:174`. A mail-client scanner or a link prefetch that follows
   the URL cannot opt anyone out, because it does not run the page script and does not
   click. RFC 8058 one-click POSTs from Gmail and Yahoo hit the API directly and never reach
   this page. No finding on prefetch. The finding on this page is F2, which is about what
   the user is told afterwards.
4. *Status announcement.* Split. `/newsletter/unsubscribe` announces correctly: its live
   region at line 153 is in the DOM from first paint and only its text changes. The resend
   form does the same at line 125. `/newsletter/confirm` does neither. Its success is a
   client route change with no announcement, and its live region is inserted into the DOM
   already carrying its text. See F6.
5. *Copy tone.* Passes. `/newsletter/unsubscribe` reads "One click and we'll stop emailing
   you. You can always sign up again from the homepage." `/newsletter/unsubscribed` reads
   "You're off the list. Quietly." Calm, no guilt, no retention plea, no dark pattern. The
   de, fr and ja translations hold the same register. Terminology matches `CONTEXT.md`: no
   retired label ("Premium", "Journal", "Battery Journal") appears in any newsletter key.
6. *Form controls.* Passes. `NewsletterResendForm.tsx:116-121` is a real `<label htmlFor>`
   bound to the input. The input carries `type="email"`, `autoComplete="email"` and
   `inputMode="email"` at lines 156-158. The honeypot at lines 103-115 is off-screen,
   `aria-hidden` and out of the tab order.
7. *Submit states.* The typed email survives a failed submit. `handleSubmit` never clears
   `email`, and the `onChange` at lines 162-165 clears the error state as the user types.
   Disabled, pending and failure are all present. Success is a dead end (F9), and the
   pending treatment drops keyboard focus (F8).
8. *Way back into the site.* All four pages carry a `HomeLink` at top left plus Nav and
   Footer. `/newsletter/unsubscribed` adds a "Subscribe again" button, and
   `/newsletter/confirmed` adds the download button. Every terminal state has at least one
   obvious exit.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility | `src/styles.css:2193`; `src/routes/newsletter.confirm.tsx:101`; also `newsletter.confirmed.tsx:98`, `newsletter.unsubscribe.tsx:113`, `newsletter.unsubscribed.tsx:62` | `[data-reveal] { opacity: 0; ... }` with `data-revealed` set only by the `IntersectionObserver` in `Reveal.tsx:32-61`, and `useState<FormState>('checking')` which only the effect at line 148 can leave | Add a `<noscript><style>[data-reveal],[data-stamp]{opacity:1!important;transform:none!important}</style></noscript>` to the `<head>` in `src/routes/__root.tsx:398`, matching the existing `<noscript>` use at `src/components/PolarInlineCheckout.tsx:277`. Separately, derive the initial state synchronously: `useState<FormState>(hasToken ? 'checking' : 'missing-token')`, as the sibling already does at `newsletter.unsubscribe.tsx:72` | The SSR HTML is correct but every heading, body paragraph, form and button on all four pages is painted at `opacity: 0` until the page script runs. If the bundle fails or JS is off, three pages render blank below the nav and `/newsletter/confirm` renders a spinner that never resolves. These are the terminal pages of an email flow, so a stripped-down corporate webview is a realistic arrival. Reduced-motion users are not affected: `src/styles.css:2336-2340` already forces `opacity: 1` for them, which is the proof that the JS-only path is the gap. The second half also removes a false "Confirming your subscription" status announced for a link that carries no token |
| HIGH | Writing | `api/newsletter/unsubscribe.ts:124-137`; `src/routes/newsletter.unsubscribe.tsx:83-87`; `src/routes/newsletter.unsubscribed.tsx:24,29,40` | POST answers `200` for a bad signature, an unknown row and an epoch mismatch. The page treats any `res.ok` as done and navigates. `UnsubscribedPage` declares `status?: 'invalid'` but never calls `Route.useSearch()`, so it always renders "You're off the list. Quietly." and "We won't email you again." | Keep the 200 so membership stays unenumerable, but distinguish the outcome in the body the API already controls. Return `{ ok: true }` only when `unsubscribe()` ran, redirect the other cases to `/newsletter/unsubscribed?status=invalid`, and read that param in the component to render a second sentence: "If mail keeps arriving, write to info@battery-sensei.app and we will remove you by hand." The heading and seal stay as they are | The user is told an action completed that did not. They stop watching their inbox, keep receiving mail, and the page named no way to check or recover. A stale link from an archived email is the common case, not an edge case. The copy also overpromises: "We won't email you again" is absolute, and nothing on the page qualifies it. The `status` param is already declared for exactly this and is being dropped |
| HIGH | Accessibility | `src/components/NewsletterResendForm.tsx:167`; the same weak indicator ships at `src/styles.css:2145` | `focus:outline-none focus:ring-2 focus:ring-sumi/25` | Delete `focus:outline-none` and let the browser indicator stand. If the custom ring is wanted, make it opaque and offset: `focus-visible:ring-2 focus-visible:ring-sumi focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--washi)]`, the shape already used at `src/components/MacOnlyConfirm.tsx:57` | The compliant browser ring is removed and replaced with one that measures **1.69:1** against the page ground in light mode. `--sumi` `#1c1a17` at 25% alpha over `--washi` `#f4ede0` composites to `rgb(190,184,174)`; relative luminance 0.4840 against 0.8519 gives 1.69:1. WCAG 1.4.11 requires 3:1 for a focus indicator. The figure holds across the whole body gradient: over `--washi-soft` `#ece3d1` it is still 1.69:1. Do not copy the pricing rescue rule at `styles.css:2145`, which composites `--hinomaru` at 35% to `rgb(224,154,161)` and measures only **1.93:1**. Keyboard users lose their position in the one form that recovers the flow |
| MEDIUM | Accessibility | `src/routes/newsletter.confirm.tsx:112-118` | `const res = await fetch(url, { method: 'POST', headers: {...} })` with no abort | `const res = await fetch(url, { method: 'POST', headers: {...}, signal: AbortSignal.timeout(15000) })`. The existing `catch` at line 140 already sets `'error'`, which renders the retry button | A request that never settles leaves the page on the spinner forever with no button and no message. There is no manual escape while `showSpinner` is true, because the button lives in the other branch at line 257. Same root class as F1, different cause and different fix |
| MEDIUM | Accessibility | `src/routes/newsletter.confirm.tsx:139`, `246-256` | Success calls `navigate({ to: redirectTo })`. Failure mounts `<div aria-live="polite" role={state === 'error' ? 'alert' : undefined}>` together with the text it should announce | For success, move focus to the new page's heading after navigation, or render the outcome in place instead of routing. For failure, keep the live region mounted in both branches so only its text changes, which is what `newsletter.unsubscribe.tsx:153` and `NewsletterResendForm.tsx:125` already do correctly | A screen-reader user cannot tell whether the subscription was confirmed. The success path is a client route change with no announcer and no focus move; TanStack Router ships neither by default and `src/routes/__root.tsx:395-420` adds neither. The failure path breaks the rule that a polite region must exist before its text updates: the region and its text enter the DOM in the same commit, so there is no mutation inside a registered region. `role="alert"` on insert is inconsistently supported and is not a substitute |
| MEDIUM | Accessibility | `src/components/NewsletterResendForm.tsx:154-168`, `125-153` | The input has no `aria-invalid` and no `aria-describedby`. On `invalid-email` the banner appears but focus stays on the submit button | Add `id="resend-email-status"` to the status div, `aria-describedby="resend-email-status"` and `aria-invalid={status === 'invalid-email'}` to the input, and focus the input when validation fails. The twin at `src/components/sections/Pricing.tsx:790` already sets `aria-invalid` | A user who tabs back to the field after a rejected address hears only the label. The field never reports that it is the one in error, and the error text is not tied to it. Validate-on-submit is correct here; the association is the missing half |
| MEDIUM | Accessibility | `src/routes/newsletter.unsubscribe.tsx:175,183-185`; `src/components/NewsletterResendForm.tsx:171,179-181`; `src/routes/newsletter.confirm.tsx:260` | `disabled={... state === 'submitting'}` with the label swapped to `t('newsletter.unsubscribe.submitting')` ("Working…") and no spinner | Keep the original label and add the pending cue beside it. Reuse `EnsoSpinner` at a small size, or set `aria-disabled` with a guard in the handler so the control stays focusable while the request runs | Disabling the focused button drops keyboard focus to `<body>`, so the user loses their place at the exact moment the outcome arrives. Replacing the label rather than keeping it also destroys the accessible name the user just activated, which is what a screen reader would otherwise re-announce. The pending state is then carried by a text swap alone, with no spinner and no live-region line |
| MEDIUM | Accessibility | `src/components/NewsletterResendForm.tsx:160,171,179-181` | `disabled={isSuccess}` on the input and `disabled={status === 'sending' \|\| isSuccess}` on the button, while the label still reads `t('newsletter.confirmed.invalid.resendCta')` ("Send a new link") | Re-enable both after success and leave the banner in place, or swap the button for a plain line of text once the mail is sent. If the lock is deliberate, change the label to say why | The recovery form is a one-shot. A user whose fresh link does not arrive sees a button that still invites the action, greyed at `opacity-70`, with no explanation and no way to try again short of reloading the page. This is the last recovery step in the flow, so a dead end here ends the journey |
| MEDIUM | Typography | `src/components/NewsletterResendForm.tsx:167` | `text-[0.875rem]` (14px) on the email input | `text-base sm:text-[0.875rem]`, holding 16px at mobile widths | iOS Safari zooms the whole page when a focused input renders below 16px. The zoom does not undo itself on blur, so the layout stays magnified for the rest of the session. `newsletter.confirmed.tsx:154` says confirmation links are opened on phones, so this surface is heavily mobile by its own account. The same 14px appears on the pricing twin at `src/components/sections/Pricing.tsx:793` |
| MEDIUM | Colors | `src/components/NewsletterResendForm.tsx:131` | `text-matcha` on the page ground at `text-[0.8125rem]` (13px), `font-medium` | Report only, per `better-colors`. `--matcha` `#6f7a3a` needs to drop roughly to `#5c6630` to clear 4.5:1, or the banner text needs to move to a passing token | Computed from the declared tokens: `--matcha` `#6f7a3a` (luminance 0.1760) on `--washi` `#f4ede0` (0.8519) is **3.99:1**. The brightest point of the body gradient, `--washi` under the full `--paper-glow` ellipse, still only reaches **4.23:1**. 13px regular is normal-size text, so WCAG 1.4.3 requires 4.5:1. Light mode fails at every point on the page. Dark mode passes at 6.09:1, so only the light block needs work. This is the success confirmation of the flow's recovery path, which is the worst place to lose legibility |
| MEDIUM | Colors | `src/routes/newsletter.confirmed.tsx:153`; `src/components/NewsletterResendForm.tsx:167` | `text-nezumi` on the download note at 13px, and `placeholder:text-nezumi/70` on the email input | Report only. The light-mode `--nezumi` needs roughly `#6f6a63` to clear 4.5:1. The dark-mode value at `src/styles.css:157` was already corrected for this reason and needs no change | `--nezumi` `#8a847c` (luminance 0.2337) on `--washi` `#f4ede0` (0.8519) is **3.18:1**, and **3.37:1** at the brightest point of the gradient. WCAG 1.4.3 requires 4.5:1 at 13px. The placeholder at 70% alpha composites lower still. The dark block at `src/styles.css:150-157` carries a comment showing the project measured `--nezumi` for the lifted mockup surfaces and raised it; the light value never got the same pass. Blast radius is site-wide, so it belongs against the token, not this page |
| MEDIUM | UI | `src/styles.css:978-1001`; used inline at `newsletter.confirm.tsx:261`, `newsletter.confirmed.tsx:142`, `newsletter.unsubscribe.tsx:139` and `:176`, `newsletter.unsubscribed.tsx:85`, `NewsletterResendForm.tsx:172` | Six hand-written copies of `inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sumi px-4 text-[0.875rem] font-medium text-washi transition-colors duration-[220ms] hover:bg-sumi/90` | Apply the existing `btn-sumi` class and delete the duplicated background, border, hover and transition utilities | `.btn-sumi` is a plain global rule in `src/styles.css`, available on every page. The comment at `NewsletterResendForm.tsx:20-23` says it "lives in the pricing module" and replicates the geometry inline for that reason; that reason is not correct. The six copies all lose what the class provides: the layered elevation shadow, the `-1px` hover lift and the `:active` press state. So none of these six buttons give any press feedback, while every other primary button on the site does |
| LOW | UI | `src/routes/newsletter.confirm.tsx:251-255` | The confirm error renders `<p class="text-[0.8125rem] font-medium text-hinomaru-ink">` with no icon | Add the `AlertCircle` treatment its two siblings use at `newsletter.unsubscribe.tsx:159-164` and `NewsletterResendForm.tsx:141-146` | One of three error banners in the surface has no status icon. The message text carries the meaning, so this is not a color-only failure, but the family reads inconsistently across three pages a single user can hit in one session |
| LOW | Accessibility | `src/components/zen/EnsoSpinner.tsx:69-73`; called at `src/routes/newsletter.confirm.tsx:202-206` | `<span role="status" aria-label={label}>` wrapping an `aria-hidden` SVG, with the same string repeated as visible text at line 211 | Give the span `aria-hidden` and move `role="status"` onto the visible `<p>` at line 210 | A live region announces its text content, and this one has none: the SVG inside is `aria-hidden` and the name is supplied only by `aria-label`. Support for announcing a named but empty status region varies. The visible paragraph beside it already carries the same words and is the reliable carrier, so the region is on the wrong element |

## Verification

**Checks run**

| Check | How | Result |
| --- | --- | --- |
| Unsubscribe cannot fire on GET or prefetch | Read `api/newsletter/unsubscribe.ts:91-107` and `newsletter.unsubscribe.tsx:75-91` | Pass. GET only redirects. The write is in POST, fired from an explicit `onClick` |
| Resend form reachable from both confirm dead ends | Traced `api/newsletter/confirm.ts:169-177` to `newsletter.confirmed.tsx:112` and `newsletter.confirm.tsx:240` | Pass |
| Expired token reaches the resend page rather than the error state | POST returns `200` with `redirectTo`; `newsletter.confirm.tsx:124` branches on `res.ok` | Pass |
| Typed email survives a failed submit | `NewsletterResendForm.tsx:39-67` never clears `email` on any failure branch | Pass |
| Email input type, autocomplete, inputmode, real label | `NewsletterResendForm.tsx:116-121`, `154-158` | Pass |
| Every page offers a way back | `HomeLink` on all four, plus Nav and Footer | Pass |
| Reduced-motion fallbacks | `src/styles.css:2335-2360`, `1080-1084`, `596-608` | Pass for the reveal, stamp, spinner rotation and link lift. Tailwind `transition-transform` on the button icons has no guard; a 2px nudge on hover, so not escalated |
| No hardcoded user-facing English | Every visible string in the five files goes through `t()`; keys exist in en, de, es, fr, ja | Pass. The page `<title>` values are hardcoded English at `newsletter.confirm.tsx:72` and its three siblings, which matches the site-wide convention at `404.tsx:14` and the feature routes, so it is reported against neither |
| Terminology against `CONTEXT.md` | Read all `newsletter.*` keys in en, de, fr, ja | Pass. No "Premium", "Journal" or "Battery Journal" |
| Tone on the unsubscribe path against `PRODUCT.md` | Read both unsubscribe pages in four locales | Pass. Calm, no guilt |
| Contrast pairs computed from declared tokens | `--matcha`, `--nezumi`, `--hinomaru-ink`, `--hinomaru-ink/85`, `--sumi/25` ring, `--hinomaru/35` ring, in both themes | `--hinomaru-ink` passes at 5.68:1 light and 8.31:1 dark; at 85% alpha, 4.87:1 light and 6.26:1 dark. `--matcha` and `--nezumi` fail in light. Focus rings fail. See F10, F11, F3 |

**Not verified** (needs the rendered page; hand these to the orchestrator)

1. Confirm the two failing pairs on screen. Open `/newsletter/confirmed?status=invalid`,
   submit a valid address, and sample the rendered success text against the pixel behind it.
   Repeat for the `downloadNote` on `/newsletter/confirmed`. The body background is a
   gradient plus two radial glows, so the ratio varies with vertical position. My figures are
   computed from the token values at both gradient endpoints and at the brightest glow point,
   and all three fail, but confirm the rendered value.
2. Focus-ring visibility on the six `bg-sumi` buttons. None of them sets `outline: none`, so
   the browser indicator survives, but a near-black button on an off-white ground is the case
   where the default ring is hardest to see. Tab to each and confirm a visible ring in both
   themes and in forced-colors mode.
3. Reflow at 320px and at 200% zoom on all four routes. Check the two-part error message at
   `newsletter.unsubscribe.tsx:165-168` and the 52px heading at
   `newsletter.confirm.tsx:224` in German, which is the longest of the five locales.
4. Whether the `role="alert"` inserted with its text at `newsletter.confirm.tsx:246` is
   announced by the screen readers this project targets. F6 assumes it is unreliable, which is
   the documented position, but only a real test settles it.
5. The `<noscript>` fix in F1. Disable JavaScript and load all four routes to confirm the SSR
   content becomes visible and that `/newsletter/confirm` shows something other than a spinner.

## Out of scope, noted not filed

- **Subscriber email in the URL.** `api/newsletter/confirm.ts:169-177` puts the address in
  the query string of `/newsletter/confirmed?status=invalid&email=...`, so it lands in the
  address bar and in browser history. `redactObservabilityUrl` at `src/routes/__root.tsx:47`
  already strips `url.search` before anything reaches Vercel Analytics, and the page is
  `noindex`, so the exposure is local to the device. Worth a decision, not an interface defect.
- **No skip link.** `src/routes/__root.tsx` renders no "Skip to content" link and `<main>`
  has no id on any of these routes. Nav is out of scope and the fix belongs there.
- **Dead code.** `newsletter.confirmed.error.*` is unreachable (see the flow section).
  `newsletter.confirm.submitting`, `newsletter.confirmed.cta` and `newsletter.unsubscribed.cta`
  are defined in all five locales and used nowhere.
- **Fragment concatenation.** `NewsletterResendForm.tsx:147-150` and
  `newsletter.unsubscribe.tsx:165-168` join two translation keys with a literal space to form
  one message. Each fragment is a complete sentence in all four locales checked, so nothing
  breaks, but Japanese renders a half-width space between two full-width sentences and the
  second fragment gets a different weight and opacity for no semantic reason.

## Verdict

`Block`. Three HIGH findings stand. F1 hides every page in the flow when the page script
does not run and leaves `/newsletter/confirm` on a spinner with no end. F2 tells a user with
a stale token that they are unsubscribed when the API did nothing. F3 removes the browser
focus ring from the one input that recovers the flow and replaces it with a 1.69:1
indicator. The nine MEDIUM and two LOW findings stay in the table as work to do.
