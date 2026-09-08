# Fixes applied

Four files changed. Each fix closes a HIGH finding from the review. Everything
else in the thirteen reports is untouched.

| # | Finding | File | Reports that raised it |
| --- | --- | --- | --- |
| 1 | Yearly Patron checkout renders an error page | `src/routes/checkout.tsx` | 03, 00 |
| 2 | Hydration fails on every route | `src/components/RouteFade.tsx`, `src/styles.css` | 00 |
| 3 | Live clock breaks hydration on the home page | `src/components/zen/MenuBarMockup.tsx` | 13 (was Not verified), 00 |
| 4 | Muted text below 4.5:1 in the light theme | `src/styles.css` | 00, 03, 04, 05, 06, 07, 11, 12 |

## 1. Yearly Patron checkout

`src/routes/checkout.tsx:384` read `pricing.support.items` as `string[]` and
rendered element `[3]` directly. Every locale ships that key as
`{ title, body }[]`, so React threw
`Objects are not valid as a React child (found: object with keys {title, body})`.
The route returned HTTP 200 and rendered the `CatchBoundary` error page, so the
Yearly Patron purchase could not start.

The fix normalizes both shapes the way `src/components/sections/Pricing.tsx:145-154`
already does, and reads `.title`.

Verified: `/checkout?tier=support` served 29 characters of visible text before
and 3653 after, with no React error in the HTML. Both tiers render.

## 2. Hydration on every route

`src/components/RouteFade.tsx` decided its return tree with
`supportsViewTransitions()`, which tests `typeof document !== 'undefined'`.
That is always false on the server and true in a browser that has the View
Transition API, so the server sent an `AnimatePresence` + `motion.div` wrapper
and the client built bare children. React failed hydration and re-rendered the
whole application on the client, on every route.

The `motion` fallback is deleted. The component now returns its children and
keeps only the effect that syncs `router.options.defaultViewTransition` with
the OS motion setting. The orphaned `.route-fade-shell` rule went with it.

**Trade-off, stated plainly:** a browser without the View Transition API now
gets an instant route change instead of a 410ms cross-fade. Chrome, Safari and
Firefox all ship the API. Losing the server-rendered markup for every visitor
cost more than losing that fade for a shrinking tail.

## 3. Live clock in the hero mockup

With fix 2 in place a second, narrower mismatch was still firing. React named
it: `<MenuBar time="Mon 7, 17:31">` inside `MenuBarMockup`. The component read
`new Date()` during render and formatted it with `toLocaleTimeString`, so the
server and the browser disagreed on both the minute and the formatting locale.

The clock now starts `null` and is set in an effect. The slot carries
`min-w-[6.5ch]` so nothing shifts when the time arrives.

Verified: a fresh load of `/` reports 0 console errors and 0 hydration errors,
with the `<h1>` present and the clock rendering after mount.

## 4. Muted text contrast, light theme

`--nezumi` was `#8a847c`: 3.18:1 on `--washi`, 2.90:1 on `--washi-soft`,
2.57:1 on `--washi-deep`, against a 4.5:1 floor. It is the site's muted text
colour across 113 `text-nezumi` uses, and it carries screenshot captions, guide
dates, glossary category headings, legal body copy and the checkout fine print.

`--nezumi` is now `#5e5a54`: 5.88 / 5.37 / 4.76. The warm grey hue is kept and
it stays a clear step lighter than `--sumi-soft` (`#4a4540`).

`--matcha` was `#6f7a3a` at 3.99:1 on `--washi`. It is now `#59622e`:
5.62 / 5.13 / 4.54. That is the lightest value on its own hue ramp that clears
4.5:1 on all three paper surfaces.

Both dark-theme values are untouched; they already passed.

## Verification

- `/checkout?tier=support`: visible text 29 → 3653 characters, React error gone.
- Fresh load of `/`: 0 console errors, 0 hydration errors (was 1 uncaught
  hydration failure, then a second one after fix 2).
- Served CSS confirms `--nezumi: #5e5a54` and `--matcha: #59622e` in the light
  block, with `#a49d94` and `#8a9a4a` still in both dark blocks.
- `vitest run`: 93 tests passed. One test file fails to import, and `tsc`
  reports 7 errors. All of them are
  `Cannot find module '.../generated/prisma/client.js'` or an implicit `any` in
  a file that imports it. `prisma generate` cannot run in this worktree because
  `DATABASE_URL` is unset. None of the errors is in a changed file, and the same
  failures occur without these changes.

### Screenshots

In [shots/](shots/). Each file is a labelled before/after pair.

| file | shows |
| --- | --- |
| `checkout-support.png` | fix 1. The error page, then the working Yearly Patron page |
| `checkout-lifetime.png` | fix 1, control. The tier that already worked |
| `nezumi-legal-zoom.png` | fix 4. `--nezumi` body text at 1:1, cropped |
| `accent-tokens.png` | fix 5. `--accent` against `--destructive`, both themes |
| `menubar-clock.png` | fix 3. The hero clock slot, cropped |
| `legal.png`, `guides.png`, `home-hero.png` | whole-page pairs, for regressions |

#### Method

VERIFIED. Chrome 151 headless (`chrome-headless-shell` from the Playwright
cache) driven over the DevTools Protocol at 1280x900, `deviceScaleFactor: 2`,
light theme, against the dev server on `localhost:5174`.

Correction to the earlier note in this file: it said headless capture was
unreliable and the in-app browser had to be used instead. That was wrong. The
headless runs were rendering correctly and failing only on the last step,
because the output directory did not exist:

```
Failed to write file docs/reviews/shots/before-checkout-support.png: No such file or directory (2)
```

Each capture injects a stylesheet first:

```
*,*::before,*::after{transition:none !important;animation:none !important}
[data-reveal],[data-stamp],[data-revealed],
.menu-bar-mockup__readout,.ink-rule-row,.license-reveal{
  opacity:1 !important;transform:none !important;max-height:none !important}
[data-testid="tanstack_devtools"],vite-error-overlay{display:none !important}
```

That is a capture aid, not a change to the site. `[data-reveal]` is
`opacity: 0` until the `IntersectionObserver` in `Reveal.tsx` runs, and it has
no `prefers-reduced-motion` fallback (`src/styles.css:2200`, which is root
cause 4 in [README.md](README.md)), so without the injection the pages
photograph blank. The identical stylesheet is applied to both states.

The two states were produced by swapping the four changed files between their
`HEAD` and working-tree versions. VERIFIED that the swap was reversed exactly:
each file's SHA-256 after restoring matches the snapshot taken before the swap,
and `git diff --stat` returns the same four files and the same
`61 insertions(+), 66 deletions(-)` as before the capture.

#### What the pairs measure

VERIFIED, pixels differing by more than 8/255 over the common area:

| pair | changed | note |
| --- | ---: | --- |
| `checkout-support` | 18.95% | page height 2060 to 3846 CSS px |
| `checkout-lifetime` | 0.13% | `--nezumi` fine print only |
| `legal` | 0.14% | `--nezumi` text only |
| `guides` | 0.03% | `--nezumi` text only |
| `home-hero` | 0.00% | see below |

The small numbers are expected. `--nezumi` is a text colour, and text covers few
pixels. The changed pixels are the token and nothing else: sampling the
most-changed pixel on `/legal` gives `rgb(138,132,124)` before and
`rgb(94,90,84)` after, which is `#8a847c` to `#5e5a54` exactly.

`home-hero` at 0.00% is a real result, not a failed capture. Its diff bounding
box is 138x8 px in the top right, one antialiased edge. Nothing above the fold
on `/` uses `--nezumi`, so that shot does not exercise fix 4. It does not
exercise fix 3 either: the menu-bar mockup sits below the fold at 900px, which
is why `menubar-clock.png` clips it directly.

#### Two things the screenshots do not show

NOT VERIFIED, and visible in the images:

- The AFTER `/checkout` shots render a `CHECKOUT UNAVAILABLE` panel with
  `Reference: http-404`. That is this worktree, which has no Polar credentials.
  The fix under test is that the page renders at all; the Polar call failing
  locally is separate and pre-existing.
- `accent-tokens.png` is not the shipped dialog. The `/roadmap` board is empty
  here so `LicenseKeyDialog` never opens, and `RequestDetail` sits behind admin
  login. The panel is a hand-built copy of the dialog header and close control,
  rendered inside the real page so it inherits the real token cascade, with the
  pre-change values re-applied as inline `--accent` overrides on the BEFORE
  half. It pairs `bg-accent` with `var(--muted-foreground)` because that is what
  `dialog.tsx:75` does. It shows the token change, not the component.

## Fix 5: `--accent` was byte-identical to `--destructive`

`src/styles.css`, three token blocks (light `:root`, `.dark`, and the
`prefers-color-scheme: dark` media block).

VERIFIED, from the file before the change:

```
143:  --accent: oklch(0.5 0.18 25);      145:  --destructive: oklch(0.5 0.18 25);
207:  --accent: oklch(0.6 0.18 25);      209:  --destructive: oklch(0.6 0.18 25);
288:  --accent: oklch(0.6 0.18 25);      290:  --destructive: oklch(0.6 0.18 25);
```

`--accent` now takes the neutral surface already defined two lines above it as
`--secondary`: `oklch(0.88 0.02 80)` light, `oklch(0.28 0.01 50)` dark.
`--accent-foreground` follows `--secondary-foreground`. `--destructive` is
untouched in all three blocks.

The file already carries the same correction for `--ring`, with the comment
"Focus is NOT an error. This used to be byte-identical to --destructive". The
new comment points back at it.

### Correction to the reported reach

[12-design-system.md](12-design-system.md) describes this as every neutral hover
painting the danger hue. That overstates it. VERIFIED by grep, the accent
utilities appear in four files, and two of them are dead:

- `src/components/ui/badge.tsx:18,19` has zero importers.
- `src/components/ui/button.tsx:16,20` has zero direct importers. It is reached
  only through `dialog.tsx:116` (`<Button variant="outline">Close</Button>`)
  inside `DialogFooter`, and a grep for `DialogFooter` and `DialogClose` returns
  no use outside the primitive itself.

So the live reach today is two controls:

- `src/components/ui/dialog.tsx:75`, the X close control
  (`data-[state=open]:bg-accent data-[state=open]:text-muted-foreground`).
  Consumers: `src/components/board/LicenseKeyDialog.tsx` on the public
  `/roadmap`, and `src/components/admin/RequestDetail.tsx`.
- `src/components/ui/select.tsx:112`, the keyboard highlight on a select option
  (`focus:bg-accent focus:text-accent-foreground`). Only consumer:
  `src/components/admin/RequestDetail.tsx`.

That is narrower than the report says. It is still worth the change, because of
the numbers below.

### Contrast, before and after

The X close control pairs `bg-accent` with `text-muted-foreground`, not with
`accent-foreground`. That pairing was the worst of it. INFERRED from the token
values by WCAG 2.x relative luminance, using an oklch to sRGB converter
validated against `oklab(0.760304 0.120004 0.0302564)` to `[245,143,153]` and
`oklch(0.7 0.15 40)` to `[235,122,82]`:

| pair | before | after |
| --- | --- | --- |
| light, muted-foreground on accent (dialog X) | `#5a5450` on `#b32228`, 1.13:1 | `#5a5450` on `#ded6c9`, 5.17:1 |
| dark, muted-foreground on accent (dialog X) | `#a49d99` on `#d74745`, 1.61:1 | `#a49d99` on `#2d2825`, 5.45:1 |
| light, accent-foreground on accent (select) | `#fbf4ea` on `#b32228`, 6.05:1 | `#15100e` on `#ded6c9`, 13.10:1 |
| dark, accent-foreground on accent (select) | `#fbf4ea` on `#d74745`, 3.94:1 | `#f2eadd` on `#2d2825`, 12.20:1 |

At 1.13:1 the open dialog's close icon was effectively invisible. The dark
select highlight at 3.94:1 was the sub-4.5:1 failure the report noted
separately; it is now 12.20:1.

### Verification

VERIFIED against the served stylesheet at `http://localhost:5174/roadmap`,
reading `getComputedStyle` on elements with `background-color: var(--accent)`
and `background-color: var(--destructive)`, in both themes, with the same
validated converter:

```
light  accent #ded6c9   destructive #b32228   accent_equals_destructive false
dark   accent #2d2825   destructive #d74745   accent_equals_destructive false
```

`accent_equals_destructive` compares the raw computed strings, so it does not
depend on the converter being right.

VERIFIED, `npx vitest run`: `Test Files  1 failed | 13 passed (14)`,
`Tests  93 passed (93)`. The one failing file is the pre-existing
`./generated/prisma/client.js` import error described above, unchanged.

NOT VERIFIED on a real dialog. See `shots/accent-tokens.png` and the caveat
under **Screenshots** below.

## Review pass

Before committing, the four changed files went through a fresh-eyes adversarial
review. It found three defects, all inside this change. All three are fixed.

### 1. The checkout fix read the wrong array entry

`src/routes/checkout.tsx`. Fix 1 corrected the *shape* of
`pricing.support.items` but kept index `[3]`, which was stale. VERIFIED against
all five locale files: `[3]` is the cancel line in every one.

```
en  [2] Priority support and feature requests   [3] Cancel in two clicks
de  [2] Priorisierter Support und Feature-Wünsche  [3] In zwei Klicks kündbar
ja  [2] 優先サポートと機能要望                  [3] 2クリックで解約
```

The chip immediately before it renders `pricing.support.badge`, which is
"Cancel anytime", so the row said cancel twice and hung a `Mail` icon on a
cancellation. `Pricing.tsx:38-40` documents the intended order and puts `Inbox`
at index 2.

Now reads `[2]`, and the variable is `supportDirectLineNote`. VERIFIED at
runtime on `/checkout?tier=support`: the row reads
`Cancel anytime · Priority support and feature requests`.

The first version of `shots/checkout-support.png` in this directory showed the
duplicate. It has been recaptured.

### 2. The clock slot reserved half the width it needed

`src/components/zen/MenuBarMockup.tsx`. Fix 3 added `min-w-[6.5ch]` with a
comment claiming it reserved the slot. It did not. `formatTime` includes
`weekday` and `day`, so the string is 12 to 15 characters.

VERIFIED by measuring the live element: the span went 35.7px to 58.6px on
mount, and because the parent bar is `justify-between` with the right cluster
hugging the edge, the battery, wifi and search icons jumped **22.6px left** on
hydration. `MenuBarMockup` is the hero image on prerendered pages, so that was
an above-the-fold shift. Fix 3 had traded a hydration error for a CLS
regression.

To be precise about what shipped when: `HEAD` has no reserve on that span at
all and no shift, because it formats the clock during render. The `6.5ch` slot
and its 22.6px shift existed only between fix 3 and this review pass, both
inside this uncommitted change. Nobody ever saw them.

`formatTime` also passed `[]` for the locale, so the width followed the
visitor's browser language rather than the site language. Measured across 11
locales, `pl-PL` renders `niedz., 27, 23:58` at 14.5ch, so no fixed reservation
could be both correct and gap-free for languages the site does not ship.

Now formats in `i18n.language` and reserves `13ch`, the widest of the five
shipped locales (ja-JP at 13ch, en at 12.3ch). VERIFIED at worst-case day in
all five: shift is **0.1px**, sub-pixel rounding.

### 3. The clock slot's alignment and headroom (second pass)

`src/components/zen/MenuBarMockup.tsx`. A second review pass measured the
13ch slot and found two smaller problems with it.

`13ch` is 71.5px and the widest shipped string, ja at worst-case day, is
71.4px (measured 71.43px). That is 0.39px of headroom. The `日` in that string is U+65E5, outside
the latin and latin-ext subsets this site loads (`src/styles.css:29-37`), so it
renders in whichever CJK face the platform supplies. Five macOS faces measured
70.6 to 71.1px; Windows and Linux were not measured, and an overflow there
would bring back the shift the change exists to remove.

The span also inherits `text-align: center`, so the reserve split evenly and
left the clock floating about 7px inside the bar's padding edge instead of
flush against it, which is not how a macOS menu bar looks.

Now `min-w-[13.5ch] text-right`. VERIFIED at worst-case day in all five shipped
locales: reserve 74.23px, widest string ja at 71.43px, headroom 2.8px, shift on
mount 0.07px, and the text sits 0.02px from the span's right edge with the
16px of slack absorbed by the existing `gap-2.5` on its left.

Cost, visible in `shots/menubar-clock.png`: the reserve is wider than the
rendered string in every locale but ja, so the battery, wifi and search icons
sit about 15px further left than they did. That is the price of a slot that
never moves.

### 4. A comment described code that had been deleted

`src/styles.css`. The `@view-transition` comment still said browsers without
the API get a motion-based fallback via `RouteFade.tsx`. Fix 2 deleted that
fallback. Reworded.

### What the review checked and cleared

REPORTED by the review, spot-checked here: no file still references
`route-fade-shell`, `supportsViewTransitions`, or the removed motion wrapper;
`motion/react` is still imported by `zen/BrushDivider.tsx` and `zen/TiltCard.tsx`
so the dependency is not orphaned; router-core reads
`options.defaultViewTransition` at navigation time and `update` preserves the
mutation, so the effect in `RouteFade` works; all five locales ship four
`{title, body}` entries with non-empty titles; nothing depended on `--accent`
being red.

VERIFIED here: `npx vite build` exits 0 with no errors, `npx vitest run` reports
`Tests  93 passed (93)`, and `npx tsc --noEmit` reports nothing in the four
changed files.

## Not fixed

The other 48 HIGH findings stand. The next ones by reach are in
[README.md](README.md) under **Root causes worth fixing first**: the focus
indicators that are removed and replaced with something weaker, and the missing
skip link.

One thing this work surfaced and did not fix: the `CatchBoundary` error page
prints the raw React error to end users. The screenshot of the broken checkout
shows `Objects are not valid as a React child (found: object with keys
{title, body})` in a `<pre>` on the page. That is finding 5 in
[11-legal-and-dead-ends.md](11-legal-and-dead-ends.md).
