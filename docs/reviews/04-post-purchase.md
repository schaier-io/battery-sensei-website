---
surface: Post-purchase and referral
routes: /thanks/lifetime, /thanks/support, /from/:id
files_reviewed: 12
findings: { high: 3, medium: 10, low: 2 }
verdict: Block
---

# Post-purchase and referral

## Scope and coverage

Screen review of the two thank-you routes and the referral landing route, plus the
components and helpers they mount.

Files in scope: `src/routes/thanks.lifetime.tsx`, `src/routes/thanks.support.tsx`,
`src/components/ThanksPage.tsx`, `src/components/LicenseRevealCard.tsx`,
`src/components/LicenseDeliveryStrip.tsx`, `src/routes/from.$id.tsx`,
`src/components/FromSenseiPage.tsx`, `src/components/zen/RescueReceipt.tsx`,
`src/components/zen/SharedCardMock.tsx`, `src/components/zen/Hanko.tsx`,
`src/lib/referral.ts`, `src/lib/format-date.ts`.

Out of scope and not inspected: Nav, Footer, locale and theme switchers, Pricing,
checkout, `src/components/ui/*`.

Stack: TanStack Start and TanStack Router, React 19, Tailwind v4, `lucide-react`
icons, `react-i18next` with five locales (en, de, es, fr, ja). Styling is Tailwind
utilities over CSS custom properties declared in `src/styles.css`. The palette is
`--sumi`, `--sumi-soft`, `--nezumi`, `--washi`, `--paper-lift`, `--line`,
`--line-strong`, `--hinomaru`, `--matcha`, re-exported into Tailwind through
`@theme inline` at `src/styles.css:293`. Dark theme is a `.dark` class plus a
matching `prefers-color-scheme` block.

Convention documents found: `CONTEXT.md` (ubiquitous language), `PRODUCT.md` (brand
register and accessibility bar), `/Users/sandro/.claude/CLAUDE.md` (personal
engineering rules). No `CONTRIBUTING.md`, `CODING_STANDARDS.md` or design-system doc
in the repo.

Boundary: no browser was used, per the shared brief. Everything below is proved from
source or computed from declared token values. Claims that need a rendered page are in
**Not verified**.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | All six `DeliveryState` variants, copy control, live regions, heading outline, region names, keyboard path, `prefers-reduced-motion` guards in `src/styles.css:2111-2124` and `ThanksPage.tsx:331`, video autoplay path | 6 findings |
| Layout | Card composition, strip stacking at `sm`, order-id slot, time-gated reveal, wrapping of key and email, `/from/:id` figure block | 1 finding |
| Writing | `thanks.*` and `from.*` strings in all five locales, route `head()` titles and descriptions, six delivery-state copy variants against `CONTEXT.md` and `PRODUCT.md` | 2 findings |
| Typography | Key and order-id mono treatment, `.license-mono` at `src/styles.css:1982`, size floors, tabular numerals, truncation rules | 1 finding |
| Colors | Declared token pairs computed for both themes, `color-mix()` surfaces, raw rgba values against the `.dark` block | 4 findings |
| UI | Six-state machine, motion choreography and its reduced-motion branch, copy-button feedback, spinner, icon strokes | 1 finding (counted under Accessibility) |

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/styles.css:84` (root cause); used at `LicenseDeliveryStrip.tsx:183`, `:332`, `:392`, `LicenseRevealCard.tsx:352`, `:425`, `ThanksPage.tsx:188`, `FromSenseiPage.tsx:109`, `RescueReceipt.tsx:28`, `:49`, `:70`, `SharedCardMock.tsx:58` | `--nezumi: #8a847c;` used as body and link color on light paper | Darken `--nezumi` in the `:root` block only until it reaches 4.5:1 on `--washi`. `#706a62` measures 4.59:1 and `#6d675f` measures 4.80:1. The `.dark` value at `src/styles.css:160` already passes and must not change | `#8a847c` on `--washi #f4ede0` is 3.18:1, on the card surface 3.41:1, on the delivery strip 2.88:1. All are normal-size text needing 4.5:1. The failing text includes the customer-portal links, which are the recovery path in four of the six delivery states |
| HIGH | Colors | `LicenseDeliveryStrip.tsx:277`; token at `src/styles.css:96` | `copied ? 'thanks-copy-bump border-matcha/45 bg-[color-mix(in_oklab,var(--matcha)_14%,var(--washi))] text-matcha'` | Use `--sumi` for the label and keep matcha for the border and background fill only, or darken `--matcha` in the light block until the label clears 4.5:1 | `--matcha #6f7a3a` on the lightest surface in the light theme, `--washi #f4ede0`, is 4.04:1. The actual button background is a matcha tint of washi, so the real pair is lower still. The label is 12px at weight 500, so it needs 4.5:1. This is the success confirmation for the one action the page exists for |
| HIGH | Accessibility | `LicenseDeliveryStrip.tsx:272` | `<button key={copyAnim} type="button" onClick={copy} ...>` with `setCopyAnim((n) => n + 1)` at `:205` and `:211` | Delete the `key` prop and `copyAnim`. `better-ui` puts a custom animation on a high-frequency control at step 1 of the fix ladder, so drop the bump and keep the color, icon and label swap | Changing the `key` makes React unmount the button and mount a new node. A keyboard user who activates Copy loses focus to `<body>` and has to tab from the top of the document. The code comment at `:203` confirms the remount is deliberate; the focus loss is its side effect |
| MEDIUM | Accessibility | `LicenseDeliveryStrip.tsx:280`, `:282-295` | `aria-label={t('thanks.delivery.copyAria')}` is fixed at "Copy license key" while the visible label swaps `Copy` to `Copied` | Drop the `aria-label` so the visible label becomes the accessible name, and add a stable polite status node beside the button whose text becomes `t('thanks.delivery.copied')` on success | An `aria-label` overrides the element's text content, so the accessible name never changes and no live region exists. A screen-reader user gets no signal that the copy worked. In the copied state the accessible name also no longer matches the visible label |
| MEDIUM | Accessibility | `LicenseDeliveryStrip.tsx:89`, `:122`, `:159`, `:192`; `ThanksPage.tsx:186-189` | `key={state.phase}` remounts the whole strip, so each `role="status" aria-live="polite"` node enters the DOM with its text already inside. `KeyLine`, `ExpiredLine`, `TimeoutLine` and `MissingLine` have no live region at all | Put one always-mounted `role="status"` node on the outer strip wrapper at `:81` and let only its text change, the way `Contact.tsx:347` and `NewsletterResendForm.tsx:124` already do in this codebase | A live region inserted together with its content is not reliably announced. The key arriving after a wait, and every failure state, reach a screen-reader user only if they happen to re-read the page. The order-id line at `ThanksPage.tsx:186` has the same defect: it is conditionally mounted with `aria-live` already on it |
| MEDIUM | Accessibility | `LicenseDeliveryStrip.tsx:148-156`, `:159`, `:175`; guard at `src/styles.css:1864` | A `setTimeout` advances through seven slogans at 3400ms each, inside the `role="status" aria-live="polite"` wrapper. The reduced-motion block disables only the `.zen-slogan` fade, not the text swap | Move the slogan `<p>` outside the live region and add `aria-hidden`, or stop the rotation when `matchMedia('(prefers-reduced-motion: reduce)').matches` | Seven polite announcements over about 24 seconds interrupt anything the user is reading. WCAG 2.2.2 also wants a pause, stop or hide mechanism for auto-updating information, and there is none. Reduced motion silences the fade but leaves the updates running |
| MEDIUM | Writing | `src/routes/thanks.support.tsx:14`, `:16`; `src/lib/i18n/locales/en.json` at `licenseScope.yearlyShort` and `thanks.support.body` | `'Thanks — Battery Sensei Ongoing Support'`, `'Your ongoing-support license is unlocked.'`, `"Yearly · up to 5 Macs · cancel anytime"`, and `"...from your Polar dashboard."` | Use "Yearly Patron" in all four. de, es, fr and ja already ship `"Yearly Patron · ..."` in `yearlyShort`, so English is the only outlier. Use `t('thanks.delivery.portalLink')`'s wording, "customer portal", in the body | `CONTEXT.md` makes "Yearly Patron" canonical and names "Ongoing Developer Support" a legacy label to replace. The page title is what the buyer sees in the browser tab. Separately, "Polar dashboard" and "Customer portal" name one destination twice on the same page, which `better-writing` treats as a flow-vocabulary break |
| MEDIUM | Writing | `LicenseRevealCard.tsx:353` | `<span className="...">Order</span>` | `{t('thanks.orderLabel')}` | The key exists and is translated in all five locales (`Bestellung`, `Pedido`, `Commande`, `注文`), and `ThanksPage.tsx:191` already uses it. A German buyer sees "Bestellung #..." in the hero and "Order · #..." in the card header at the same time |
| MEDIUM | Accessibility | `RescueReceipt.tsx:35`, `SharedCardMock.tsx:64`, `LicenseRevealCard.tsx:284`, `:389`, `LicenseDeliveryStrip.tsx:240`, `:383` | Card mocks use `<h3>` directly under the page `<h1>`. The delivery card's own section kickers are `<span className="display-title ...">`. The card's region is named `aria-label={t('thanks.delivery.label')}`, which is "Install Sensei" | Make the mock headlines `<p>` since the figure is illustrative, promote the two card kickers to `<h2>`, and give the region its own label naming both halves, for example "Your download and licence key" | On `/from/:id` the outline jumps h1 to h3 and puts illustration text into the heading list. On `/thanks/*` the card contributes no headings at all, so a screen-reader user cannot jump to the licence key, and the region holding that key announces as "Install Sensei" |
| MEDIUM | Layout | `ThanksPage.tsx:17`, `:27`, `:251`; `LicenseRevealCard.tsx:64` | `VIDEO_DELAY_MS = 3000` then a 3.5s clip (`public/ninja-thanks.mp4`) then `LICENSE_CROSSFADE_MS = 380` before `LicenseRevealCard` mounts, then `MIN_HOLD_MS = 4000` before the key appears | Mount `LicenseRevealCard` and start polling next to the video instead of after it, and measure `MIN_HOLD_MS` from page load rather than from card mount | The licence key cannot appear before about 10.9s after landing, and nothing on screen says it is coming or offers a way to skip. `better-layout` requires a visible affordance for hidden content. The reduced-motion path at `ThanksPage.tsx:30` cuts this to about 4.8s, which is the only escape and most buyers do not have that preference set |
| MEDIUM | Typography | `LicenseDeliveryStrip.tsx:261-267`; existing class at `src/styles.css:1982` | `text-[12.5px]` with an inline `fontFamily`, `fontFeatureSettings: '"ss01", "cv11", "zero"'` and `fontVariantNumeric` block that duplicates `.license-mono` exactly | `className="... license-mono text-[13px] ..."` and delete the inline `style` font declarations | 12.5px is below the 13px floor for the smallest UI text, and this is the one string a buyer may have to read character by character if the clipboard fails. The inline block re-declares a class the project already has and already uses correctly for the order chip at `LicenseRevealCard.tsx:356` |
| MEDIUM | Colors | `LicenseRevealCard.tsx:292`; `LicenseDeliveryStrip.tsx:261`, `:317`; `RescueReceipt.tsx:12`; `SharedCardMock.tsx:51` | `shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_30px_60px_-32px_rgba(28,26,23,0.22)]` and four more raw rgba shadow stacks | Add `--shadow-card-inset` and `--shadow-card` tokens next to the palette in `src/styles.css:82-110`, give them a `.dark` value, and reference them here | `rgba(28,26,23,...)` is `--sumi` copied by value, and every surrounding surface flips in the `.dark` block while these do not. The 50% and 55% white inset highlights stay bright over a `--washi: #15130f` card in dark mode. `better-colors` forbids borrowing a value instead of a role token |
| MEDIUM | Writing | `LicenseDeliveryStrip.tsx:207-216` | `catch { /* clipboard API unavailable — user can select-all instead */ }` with no state change | Set an error message in the same status node added for the copy announcement, for example "Copy failed. Select the key and copy it by hand." | The clipboard API is undefined on any non-secure origin and can reject under a permissions policy. Today the button does nothing visible on failure, so the user clicks again rather than selecting the key. The key stays reachable, so this is not a blocker, but the failure names no recovery |
| LOW | Colors | `LicenseDeliveryStrip.tsx:81` | `bg-[color-mix(in_oklab,var(--washi)_84%,var(--sumi)_4%)]` | `bg-[color-mix(in_oklab,var(--sumi)_4%,var(--washi))]` | The two percentages sum to 88, and CSS multiplies the result's alpha by that sum. The strip surface renders at 88% opacity instead of the opaque 4% ink tint the comment at `:75-78` describes, which slightly lowers every contrast pair measured on it |
| LOW | Accessibility | `RescueReceipt.tsx:21` | `aria-label={t('mockups.rescueReceipt.ariaLabel')}` on a plain `<div>` | Delete the `aria-label` | A `<div>` has an implicit generic role, which does not support naming, so the label is dropped by screen readers. The card's own text is real markup and already readable, so nothing is lost by removing it. `SharedCardMock` correctly ships no such attribute |

## Verification

Checks run:

- Read all 12 in-scope files plus `src/styles.css`, `CONTEXT.md`, `PRODUCT.md`, and
  the `thanks.*`, `from.*`, `licenseScope.*` and `mockups.rescueReceipt.*` trees in all
  five locale files.
- Enumerated the delivery state machine from the `DeliveryState` union at
  `LicenseDeliveryStrip.tsx:37-62` and its transitions in `LicenseRevealCard.tsx:91-223`.
  Six states exist: `loading`, `provisioning`, `ready`, `expired`, `timeout`, `missing`.
  There is no separate `failed` or `rate limited` state; a `fetch` rejection is mapped to
  `expired` at `:210-219`. Each of the four non-key states carries a static text kicker
  and body, and each names a recovery: inbox, spam folder, customer portal, and for
  `timeout` a `mailto:` support link at `:427`. No state is carried by motion or color
  alone.
- Reduced motion: every `.thanks-*` keyframe class is disabled in the block at
  `src/styles.css:2111-2124`, which sets `animation: none; transform: none; opacity: 1`.
  `.zen-spinner` slows to 6s at `:1842` and `.zen-slogan` is disabled at `:1864`. The bow
  video is skipped entirely at `ThanksPage.tsx:331-346`. No key state depends on an
  animation running.
- Key retrieval without the clipboard: the `<code>` at `LicenseDeliveryStrip.tsx:256`
  carries the Tailwind `select-all` class, so one click selects the whole key, and the key
  is real selectable text. Retrieval survives a clipboard failure.
- Truncation: grepped the whole surface for `truncate`, `line-clamp`, `text-ellipsis`
  and `whitespace-nowrap`. No matches. The key uses `wordBreak: 'break-all'` at `:263`
  and the order chip uses `break-all` at `LicenseRevealCard.tsx:356`. Neither the key nor
  the email is truncated anywhere.
- Tabular numerals and mono on the key: present at `LicenseDeliveryStrip.tsx:264-266`
  and on the order chip through `.license-mono` at `src/styles.css:1982`. The email in
  `ProvisioningLine.tsx:167` uses Tailwind `font-mono` without tabular numerals, which is
  cosmetically inconsistent but not a defect.
- Post-purchase copy against `PRODUCT.md`: both tiers confirm the purchase, the scope
  and the next step. `/thanks/lifetime` renders `licenseScope.lifetime`, "Lifetime unlock:
  up to 3 Macs you own", plus a `next` line pointing at Settings then Pro.
  `/thanks/support` renders `licenseScope.yearly`, "Yearly Patron: up to 5 Macs while
  subscribed", plus a renewal-notice line. Both match `CONTEXT.md` licence scope.
- `/from/:id` unknown-id state: `sanitizeSenseiId` at `src/lib/referral.ts:29-33`
  returns `null` for anything outside `/^[A-Za-z0-9]{1,8}$/`, and `FromSenseiPage.tsx:73-75`
  falls back to `from.kickerGeneric`, "From a fellow Sensei". An unknown `?card=` collapses
  to `default` through the enum catch at `src/lib/referral.ts:56`. Both fallbacks are
  graceful and neither invents a fact.
- `/from/:id` claims about the referrer: every mock card figure is captioned
  "An illustration of the card you scanned. The real one, and the battery behind it, stay
  on your friend's Mac" (`FromSenseiPage.tsx:109`), the mock values are commented as
  illustrative at `SharedCardMock.tsx:19-28`, and the body copy describes what the card
  type means rather than asserting a reading from the sharer's Mac. No unsupported claim
  found.
- Contrast computed from declared token values with the sRGB relative-luminance formula.
  `--nezumi #8a847c` on `--washi #f4ede0` is 3.18:1, on the light card surface 3.41:1, on
  the delivery strip 2.88:1, and on the mock paper 3.42:1. In the dark theme the same role
  measures 6.42:1 to 6.92:1 and passes. `--matcha #6f7a3a` on `--washi #f4ede0` is 4.04:1
  and the real button background is darker. `--sumi #1c1a17` on the key block is 16.16:1
  and passes. `#fff8eb` on `--hinomaru #bc002d` is 6.26:1 light and 4.82:1 dark, both pass.
- Video length: `ffprobe` on `public/ninja-thanks.mp4` reports 3.500000 seconds. Under
  the 5-second threshold, so WCAG 2.2.2 does not require a pause control for it.

Not verified. Each needs the orchestrator's rendered-state pass:

1. The exact rendered background behind `text-nezumi` on the delivery strip and the card,
   both of which are `color-mix()` surfaces. Measure the computed pair in DevTools in both
   themes and confirm the 2.88:1 and 3.41:1 figures above.
2. Whether the `rgba(255,255,255,0.5)` and `rgba(255,255,255,0.55)` inset highlights are
   visible as a bright line across the card and key block in dark mode. Load
   `/thanks/lifetime` with `prefers-color-scheme: dark`.
3. Focus-ring visibility on the copy button at `LicenseDeliveryStrip.tsx:275`. It uses
   `focus-visible:ring-2 focus-visible:ring-sumi/40` with no `ring-offset`, while both
   sibling CTAs at `LicenseRevealCard.tsx:415` and `LicenseDeliveryStrip.tsx:317` add
   `ring-offset-2 ring-offset-[var(--washi)]`. Tab to it in both themes and measure the
   ring against the button fill.
4. Overflow of a long customer email at 320px, in the meta row at
   `LicenseDeliveryStrip.tsx:335-345` and in the provisioning kicker at `:167`. Neither has
   `break-all`, and the meta row's `inline-flex` will not break inside a long address.
   Render with a 60-character email at 320px.
5. Whether the `ZenSpinner` at `LicenseDeliveryStrip.tsx:161` is squashed by a long email
   in the same flex row. The SVG has `h-4 w-4` but no `shrink-0`.
6. That `transition-[colors,transform,box-shadow]` at `LicenseDeliveryStrip.tsx:275` leaves
   the copied color swap untransitioned. `colors` is not a CSS property, so it should match
   nothing. Compare with `transition-[background-color,transform,box-shadow]` at
   `LicenseRevealCard.tsx:415`.
7. Keyboard focus loss on the copy button (finding 3). Tab to Copy, press Enter, then press
   Tab and confirm the next stop is the top of the document rather than the Activate link.

## Verdict

`Block`. Three `HIGH` findings remain: two light-theme contrast failures, one of them on
the success confirmation for the copy action, and a keyboard focus loss on that same
button.
