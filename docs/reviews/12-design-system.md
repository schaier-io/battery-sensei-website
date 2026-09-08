---
surface: Design system foundation
routes: all (shared tokens, base layer and shadcn primitives)
files_reviewed: 18
findings: { high: 5, medium: 6, low: 3 }
verdict: Block
---

# Design system foundation

## Scope and coverage

`src/styles.css` (2490 lines), all 13 primitives in `src/components/ui/`,
`src/components/reactbits/FrameBorder.tsx`, `src/lib/utils.ts`,
`src/lib/prefers-reduced-motion.ts`, `components.json`.

Stack: TanStack Start, React 19, Tailwind v4 (CSS-first `@theme inline`, no
`tailwind.config`), `radix-ui` unified package, shadcn "new-york" style,
`class-variance-authority`, `tw-animate-css`, `motion`, `lucide-react`.
Styling is split in two: a hand-written CSS design system in `styles.css`
(`.paper-card`, `.btn-sumi`, `.nav-link`, `.display-title`) and a shadcn
primitive layer in `src/components/ui/`.

Convention documents found: `CONTEXT.md` and `PRODUCT.md`. No `CONTRIBUTING.md`,
`AGENTS.md`, `CLAUDE.md`, `SPEC.md` or `docs/adr/`. `PRODUCT.md:33` sets the bar
this review measures against: "Use semantic controls, visible focus states,
sufficient contrast in light and dark themes, accessible names for icon
controls, and reduced-motion fallbacks."

Boundary: page and section components are owned by other agents. Where a token
is the root cause I report it once against `styles.css` and cite consumer counts
to size the reach. `src/components/zen/*` was not opened.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Focus handling in all 13 primitives and all 10 `:focus`/`:focus-visible` rules in `styles.css`; `outline-none` audit; target sizes; scroll-container keyboard reach; 29 `prefers-reduced-motion` blocks against 48 `@keyframes` | 4 findings |
| Layout | Primitive structure only (Card grid, Dialog `max-w`, Table overflow container, Tabs orientation). Page composition out of scope | 1 finding |
| Writing | Only two user-facing strings exist in scope: `dialog.tsx:78` `"Close"` (`sr-only`) and `dialog.tsx:116` `<Button>Close</Button>`. Both hardcoded English, both in primitives with no `t()` neighbour in `src/components/ui/` | 1 finding |
| Typography | `@theme inline` scale (`styles.css:302-324`), four `@fontsource` families, `font-display`, fallback stacks, preloads, token adoption count | 2 findings |
| Colors | Both theme blocks diffed token by token; all 27 `oklch` values converted to sRGB; 20 contrast pairs computed; ad-hoc value audit | 4 findings |
| UI | `transition-all` audit, press states, concentric radius, elevation model, dead primitives | 4 findings |

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/styles.css:84` (light `--nezumi`); consumers: 113 `text-nezumi` uses across `src/`, plus `.spec-strip` `src/styles.css:811` and `.legal-list li::marker` `src/styles.css:622` | `--nezumi: #8a847c;` | `--nezumi: #5f5a53;` | The light ramp's muted text token measures 3.18:1 on `--washi`, 2.90:1 on `--washi-soft` and 2.57:1 on `--washi-deep`. All fail 4.5:1, and the deepest pair fails the 3:1 large-text bar too. The dark value was deliberately raised to clear AA (see the comment at `styles.css:154-159`); the light value never got the same pass. `#5f5a53` measures 5.87 / 5.36 / 4.75:1 on the same three surfaces. |
| HIGH | Accessibility | `src/components/ui/accordion.tsx:36` and `src/styles.css:2182-2188` | accordion: `... outline-none ... hover:text-sumi focus-visible:text-sumi ...`; nav: `.nav-link:focus-visible { outline: none; color: var(--sumi); }` plus `.nav-link:focus-visible::after { transform: scaleX(1); }` | Delete `outline-none` from `accordion.tsx:36` and `outline: none` from `styles.css:2183`, keeping the existing colour and underline changes as secondary cues | Both remove the browser ring and replace it with a state that is already painted. The accordion consumer sets the rest colour to `text-sumi` (`src/components/sections/FAQ.tsx:312`), so `focus-visible:text-sumi` changes nothing. On the current page's nav link, `[data-active='true']` already applies both `color: var(--sumi)` (`styles.css:2160`) and `::after { transform: scaleX(1) }` (`styles.css:2176`), so keyboard focus produces zero pixel change. Keyboard-reachable control with no visible focus indicator. |
| HIGH | Accessibility | `src/components/ui/button.tsx:8`, `badge.tsx:8`, `input.tsx:12`, `textarea.tsx:10`, `select.tsx:40`, `switch.tsx:18`, `tabs.tsx:67`, and `src/styles.css:2145-2149` | `focus-visible:ring-[3px] focus-visible:ring-ring/50` (all seven primitives); `#free-download-email-input:focus-visible { box-shadow: 0 0 0 2px color-mix(in oklab, var(--hinomaru) 35%, transparent), 0 0 0 6px ... 12% ...; }` | Drop the `/50` so the ring paints at full `--ring`: `focus-visible:ring-[3px] focus-visible:ring-ring`. Raise the email input's inner stop to 100% `--hinomaru` | The shared focus ring is the `--ring` token at 50% alpha. Composited over `--washi` it is `#a39c94`, which measures 2.32:1 in light mode against 3:1 required by WCAG 1.4.11. Full alpha measures 7.29:1 light and 9.24:1 dark. The email input's ring is worse at 1.93:1 and 1.24:1. |
| HIGH | Colors | `src/styles.css:137` and `:139` (light), `:201`/`:203` and `:282`/`:284` (dark); consumers `button.tsx:16,20`, `badge.tsx:18,19`, `select.tsx:112`, `dialog.tsx:75` | `--accent: oklch(0.5 0.18 25);` and `--destructive: oklch(0.5 0.18 25);` are byte-identical, as are the dark pair at `oklch(0.6 0.18 25)` | Give `--accent` a neutral paper value, for example `--accent: oklch(0.88 0.02 80)` light and `oklch(0.28 0.01 50)` dark, matching `--secondary`, with `--accent-foreground` set to `--foreground` | `--accent` is the neutral hover and selection surface. Because it resolves to the danger hue, `hover:bg-accent` paints an outline or ghost button red, `focus:bg-accent` paints the keyboard-highlighted select option red, and `data-[state=open]:bg-accent` paints the dialog close control red. Semantic colour used against its meaning. Secondary effect: dark `--accent-foreground` on `--accent` measures 3.95:1, below 4.5:1. |
| HIGH | Colors | `src/styles.css:142` and `:206`/`:287`; consumers `input.tsx:11`, `textarea.tsx:10`, `select.tsx:40`, `switch.tsx:18` | `--input: oklch(0.82 0.02 80);` light and `oklch(0.32 0.01 50);` dark, consumed as `border border-input bg-transparent` | Darken light `--input` to about `oklch(0.68 0.02 80)` and lighten dark `--input` to about `oklch(0.46 0.01 50)`, keeping `--border` for decorative rules | Every text field draws its boundary with `border-input` over a transparent fill, so that border is the only thing marking the control. It measures 1.50:1 on `--washi` in light and 1.46:1 in dark, against 3:1 required by WCAG 1.4.11. The same token is the unchecked switch track, which also has `border-transparent`. |
| MEDIUM | UI | `src/components/ui/button.tsx:8`, `switch.tsx:18`, `tabs.tsx:67`, `accordion.tsx:42` | `transition-all` in all four class strings | Name the properties: `transition-[color,background-color,border-color,box-shadow]` on button, switch and the tabs trigger; `transition-[transform,color]` on the accordion chevron | `transition-all` animates every animatable property, including layout properties the component never intends to move, and it fights sibling transforms. `styles.css` never does this: all 24 hand-written transitions name their properties. The primitive layer is the only place that breaks the rule. |
| MEDIUM | Typography | `src/styles.css:302-314` | Nine role-named steps from `--text-display` to `--text-meta`, with the comment "Tokens are semantic (role-named) so future surfaces don't reach for arbitrary text-[XYZ] values" | Add the missing small steps the site actually needs (a 12px and a 10px role) and correct the "1.25 ratio" comment to the ratios the values really encode | The tokens are used 13 times across `src/`. Arbitrary `text-[Npx]` is used 181 times, led by 52 `text-[10px]`, 40 `text-[12px]` and 39 `text-[11px]`, and reaching down to one `text-[8.5px]`. The comment also claims a 1.25 modular ratio, but no adjacent pair is 1.25: 5.75/3.5 = 1.64, 3.5/2.5 = 1.40, 2.5/1.625 = 1.54, 1.625/1.125 = 1.44, 1.125/1.0625 = 1.06. A scale nobody can derive the next step from gets bypassed. |
| MEDIUM | UI | `src/styles.css:882` and `:358-361`; `src/components/ui/card.tsx:10`; `select.tsx:65,77,112`; `tabs.tsx:29,67` | `.paper-card { border-radius: 6px; }` alongside a `--radius: 0.5rem` ramp of sm 4px / md 6px / lg 8px / xl 12px; select content `rounded-md` (6px) with viewport `p-1` (4px) and items `rounded-sm` (4px); tabs list `rounded-lg` (8px) with `p-[3px]` and trigger `rounded-md` (6px) | `.paper-card { border-radius: var(--radius-md); }`; select item `rounded-[2px]`; tabs trigger `rounded-[5px]` | Outer radius should equal inner radius plus padding. Select is off by 2px (6 - 4 = 2, actual 4). Tabs is off by 1px (8 - 3 = 5, actual 6). Separately, the site's real card hardcodes 6px outside the ramp while `Card` sits at 12px, so the system carries two card radii that no rule connects. |
| MEDIUM | UI | `src/components/ui/button.tsx:7-39` | The `cva` base and all eight sizes define no `active:` state, and there is no `static` opt-out prop | Add `active:scale-[0.96]` to the base string, and pair it with `motion-reduce:active:scale-100` | The `better-ui` press rule is exactly `scale(0.96)`. The button has no press feedback of any kind. `styles.css` does implement press elsewhere (`.btn-sumi:active` at `:997` drops the translate and flattens the shadow; `.bs-close` at `:2407` uses `scale(0.9)`), so the primitive is the outlier and the two press languages disagree. |
| MEDIUM | Accessibility | `src/components/ui/table.tsx:7-10` and `:84` | `<div data-slot="table-container" className="relative w-full overflow-x-auto">`, with `TableCell` set to `whitespace-nowrap` | `<div data-slot="table-container" tabIndex={0} role="region" aria-label={...} className="relative w-full overflow-x-auto focus-visible:ring-[3px] focus-visible:ring-ring">` | The container scrolls horizontally but is not focusable, so a keyboard user cannot reach the overflowing columns. `whitespace-nowrap` on every cell guarantees the overflow exists on narrow viewports. WCAG 2.1.1 requires a scrollable region to be keyboard operable. |
| MEDIUM | UI | `src/components/ui/badge.tsx`, `card.tsx`, `separator.tsx`, `switch.tsx` | All four files export components that no file in `src/` imports (verified against every `from "#/components/ui/..."` specifier) | Delete the four files | 201 lines of primitive surface ship the `--accent` danger-hue hover, the low-contrast `--input` boundary and the undersized switch track, with no consumer to justify fixing them. Deleting is cheaper than repairing and stops the next author adopting a broken primitive. It also removes `card.tsx`'s `<div>` card title, which gives card sections no heading semantics. |
| LOW | Writing | `src/components/ui/dialog.tsx:78` and `:116` | `<span className="sr-only">Close</span>` and `<Button variant="outline">Close</Button>` | Take the label from a prop with an English default, for example `closeLabel = "Close"`, so the two consumers can pass `t('common.close')` | The site is multi-locale, but the only accessible name on the dialog close control and the whole footer close button are hardcoded English. `src/components/ui/` has no `t()` usage to copy, so the fix belongs at the primitive boundary rather than inside it. |
| LOW | Accessibility | `src/components/ui/switch.tsx:18` | `data-[size=default]:h-[1.15rem] data-[size=default]:w-8` and `data-[size=sm]:h-3.5 data-[size=sm]:w-6` | If the file survives the deletion above, raise the hit area to at least 24px with padding rather than growing the track | The default switch is 32 x 18.4 CSS px and the small size is 24 x 14. WCAG 2.2 SC 2.5.8 requires a 24 x 24 minimum target. Both fail on height. |
| LOW | Colors | `src/styles.css:250-251` | `--hinomaru-ink: #f58f99;` appears twice in a row inside the `prefers-color-scheme: dark` block | Delete line 251 | The `.dark` class block and the media block are meant to stay in sync (see the note at `styles.css:220`). A duplicated line is the first sign of the two drifting. Everything else in the two blocks is identical. |

## Verification

### Token completeness (passed)

Diffed the three palette blocks declaration by declaration.

```
sed -n '152,208p' styles.css | grep '^--' | sort  vs  sed -n '232,289p' ... | sort
> --hinomaru-ink: #f58f99;      (the only difference: the duplicate at :251)
```

`:root` versus `.dark` token names: `--os-chrome` and `--radius` are the only two
declared in one block and not the other. Both are deliberately theme-independent
(`--os-chrome` carries a comment at `styles.css:117-123` saying so). **Every
semantic token is defined in both themes.** The ramps are: a hand-named ink and
paper ramp (`--sumi`, `--sumi-soft`, `--nezumi`, `--washi`, `--washi-soft`,
`--washi-deep`), an accent ramp (`--hinomaru`, `--hinomaru-ink`,
`--hinomaru-soft`, `--kin`, `--matcha`, `--aizome`), a line and shadow ramp
(`--line`, `--line-strong`, `--paper-shadow`, `--paper-lift`, `--paper-glow`,
`--paper-glow-warm`), and the shadcn semantic set in `oklch`.

### Ad-hoc colour audit (mostly passed)

```
awk 'NR>293 && /#[0-9a-fA-F]{3,8}\b/' src/styles.css | wc -l   ->  0
awk 'NR>293 && /rgba?\(|hsla?\(/'      src/styles.css | wc -l   ->  37
```

Zero hex literals bypass the ramps. The 37 `rgba()` values are all shadows,
texture gradients and sheen stops. The worst offenders, meaning the ones that do
not flip with the theme and are not overridden in `.dark`, are the white inset
highlights at `styles.css:886`, `:937` and `:982` (`rgba(255,255,255,0.5)` and
`rgba(255,255,255,0.12)`), and the near-white sheen stops at `:1300-1302` and
`:1350-1352`. These sit on `.paper-card` and `.btn-sumi`, which do get dark
overrides for their other layers, so the white highlight stays white on an ink
surface. Not reported as a finding: the visible result needs a rendered page.

### Contrast, with the oklch working

I converted every `oklch()` token to sRGB with the standard OKLab inverse
(OKLab to LMS cube, LMS to linear sRGB matrix, then the sRGB transfer function),
then applied the WCAG 2.1 relative-luminance formula. The converter was checked
against seven reference values first and reproduced all seven exactly:

```
white  oklch(1 0 0)                    -> #ffffff   ok
black  oklch(0 0 0)                    -> #000000   ok
red    oklch(0.62796 0.25768 29.234)   -> #ff0000   ok
green  oklch(0.86644 0.29483 142.495)  -> #00ff00   ok
blue   oklch(0.45201 0.31321 264.052)  -> #0000ff   ok
grey   oklch(0.59987 0 0)              -> #808080   ok
shadcn oklch(0.577 0.245 27.325)       -> #e7000b   ok
```

Resolved values for the pairs below:

```
light  --background oklch(0.94 0.02 80)   -> #f2eadd
light  --foreground oklch(0.18 0.01 50)   -> #15100e
light  --muted-foreground oklch(0.45 ...) -> #5a5450
light  --primary / --primary-foreground   -> #15100e / #fbf4ea
light  --destructive = --accent oklch(0.5 0.18 25)  -> #b32228
light  --input = --border oklch(0.82 0.02 80)       -> #cbc3b6
light  --ring oklch(0.42 0.01 50)         -> #524c48
dark   --background oklch(0.16 0.01 50)   -> #110c09
dark   --foreground oklch(0.94 0.02 80)   -> #f2eadd
dark   --muted-foreground oklch(0.7 ...)  -> #a49d99
dark   --destructive = --accent oklch(0.6 0.18 25)  -> #d74745
dark   --input = --border oklch(0.32 0.01 50)       -> #37312e
dark   --ring oklch(0.78 0.01 50)         -> #bdb6b2
```

Pairs the brief asked for:

| Pair | Light | Dark | Need | Result |
| --- | --- | --- | --- | --- |
| body text on background (`--foreground` / `--background`) | 15.78:1 | 16.28:1 | 4.5 | pass |
| body text on background (`--sumi` / `--washi`) | 14.91:1 | 15.93:1 | 4.5 | pass |
| muted text on background (`--muted-foreground` / `--background`) | 6.26:1 | 7.25:1 | 4.5 | pass |
| muted text on card (`--muted-foreground` / `--card`) | 6.84:1 | 6.77:1 | 4.5 | pass |
| muted text on background (`--nezumi` / `--washi`) | 3.18:1 | 6.92:1 | 4.5 | **light fails** |
| muted text on the gradient foot (`--nezumi` / `--washi-soft`) | 2.90:1 | n/a | 4.5 | **light fails** |
| muted text on aged paper (`--nezumi` / `--washi-deep`) | 2.57:1 | 5.78:1 | 4.5 | **light fails** |
| text on the primary fill (`--primary-foreground` / `--primary`) | 17.26:1 | 15.78:1 | 4.5 | pass |
| text on the destructive fill (`text-white` / `--destructive`) | 6.59:1 | 8.42:1 | 4.5 | pass |
| text on the accent fill (`--accent-foreground` / `--accent`) | 6.04:1 | 3.95:1 | 4.5 | **dark fails** |

The dark destructive button passes only because `button.tsx:14` and
`badge.tsx:16` override the fill with `dark:bg-destructive/60`. Composited over
`--background` that is `#87302d`, and white on it is 8.42:1. The raw dark
`--destructive` under white is 4.31:1, which fails. `--accent` carries no such
override, which is why the accent row fails in dark.

Non-text pairs (WCAG 1.4.11, 3:1):

```
light  ring/50 over --washi        #a39c94   2.32:1   fail
dark   ring/50 over --washi        #696460   3.19:1   pass
light  ring at full alpha           #524c48   7.29:1   pass
dark   ring at full alpha           #bdb6b2   9.24:1   pass
light  --input on --washi           #cbc3b6   1.50:1   fail
dark   --input on --washi           #37312e   1.46:1   fail
hinomaru 35% over washi (email ring) #e09aa1  1.93:1   fail
hinomaru 12% over washi (email ring) #edd1cb  1.24:1   fail
```

Marginal, reported only here: the tabs trigger rest colour `text-foreground/60`
over `bg-muted` composites to `#666059`, which is 4.35:1 against the list fill
(`tabs.tsx:67` and `:33`). Under 4.5:1 by a hair.

### Focus (1 finding, the rest passed)

Every `outline-none` / `outline-hidden` / `outline: none` in scope, and whether a
replacement exists:

```
button.tsx:8       outline-none      -> focus-visible ring   (ring alpha fails, see finding 3)
input.tsx:11       outline-none      -> focus-visible ring + border
textarea.tsx:10    outline-none      -> focus-visible ring + border
select.tsx:40      outline-none      -> focus-visible ring + border
switch.tsx:18      outline-none      -> focus-visible ring + border
dialog.tsx:75      focus:outline-hidden -> focus:ring-2 focus:ring-ring focus:ring-offset-2  (full alpha, passes)
select.tsx:112     outline-hidden    -> focus:bg-accent focus:text-accent-foreground  (a fill, present)
dialog.tsx:66      outline-none      -> content container, not a control
accordion.tsx:36   outline-none      -> focus-visible:text-sumi, which is a no-op   REPORTED
styles.css:2183    outline: none     -> ::after underline already painted when active   REPORTED
tabs.tsx:85        outline-none      -> none                                          NOT VERIFIED
```

`styles.css` focus rules that keep the browser ring, so they pass:
`.legal-link:focus-visible` (`:536`), `.zen-link:focus-visible` (`:569`),
`.zen-link-lift:focus-visible` (`:589`), `.lang-item:focus-visible` (`:1438`),
`.paper-card:focus-within` (`:956`).

### Reduced motion (passed)

`src/styles.css` carries 29 scoped `@media (prefers-reduced-motion: reduce)`
blocks against 48 `@keyframes`. This is not a JS-only approach: the JS hook in
`src/lib/prefers-reduced-motion.ts` only gates `document.startViewTransition`,
and the CSS covers the rest. I traced every infinite animation to a guard:

```
categories-marquee :1252 -> :1259     pricing-sparkle-sheen :1305 -> :1324
redeem-bar-shimmer :1355 -> :1359     charge-ring-shimmer   :1471 -> :1483
power-flow-drift   :1615 -> :1625     ink-level-cycle       :1714 -> :1780
zen-spinner-rotate :1838 -> :1842     polar-skeleton-shimmer :2059 -> :2067
enso-spinner       :1066 -> :1080     gentle-bob/pulse      :1144 -> :1147/:1164
ninja-float        :2271 -> :2346     vertical-drift        :2280 -> :2348
```

The view transition is also guarded (`styles.css:420-433` sets
`navigation: none` and `animation: none !important`), and `scroll-behavior:
smooth` reverts to `auto` (`:441-445`). The marquee also pauses on hover
and `:focus-within` (`:1255-1257`), which satisfies WCAG 2.2.2. The pattern is
per-animation opt-in, so a new `@keyframes` is unguarded by default, but nothing
is currently missed.

### Fonts and elevation (passed)

All four families declare `font-display: swap`: the three `@fontsource` packages
(checked `node_modules/@fontsource/spectral/latin-400.css:5`,
`source-sans-3/latin-400.css:5`, `geist-mono/latin-400.css:5`) and the three
hand-written Noto Serif JP faces at `styles.css:49`, `:56` and `:63`. Every
family in `@theme inline` has a real fallback stack (`styles.css:294-300`), and
`src/routes/__root.tsx:352-356` preloads Spectral 500, Source Sans 400 and Noto
Serif JP 400.

Elevation: the project layers transparent `box-shadow`. `.paper-card`
(`styles.css:883-888`) stacks four layers, an offset ink stroke, a white inset
highlight, a contact shadow and an ambient shadow, and `.btn-sumi`
(`:982-984`) stacks three. The 1px border on `.paper-card` reads as the paper
edge rather than as the depth cue, so this passes. The shadcn primitives use
Tailwind's single-token shadows instead (`Card` `shadow-sm`, `Dialog`
`shadow-lg`, `Input` `shadow-xs`), which is a second elevation language, but
`Card` is dead and the rest are admin-only.

### Radix wrappers (passed, one exception)

All 13 primitives type their props as `React.ComponentProps<typeof Primitive>`
and spread `{...props}` last, so no prop, ref (React 19 passes `ref` through
props) or ARIA attribute is dropped. `Separator` and `Tabs` destructure
`orientation` and `decorative` before the spread, so their defaults do not
shadow a caller value. `Dialog` wires title and description correctly:
`DialogTitle` and `DialogDescription` forward to `DialogPrimitive.Title` and
`.Description`, and both consumers supply a title
(`src/components/board/LicenseKeyDialog.tsx`, `src/components/admin/RequestDetail.tsx`).
The exception is that neither `DialogContent` nor `SelectTrigger` fails loudly
when a title or label is missing, so the guarantee rests on callers.

### Other checks run

- `src/lib/utils.ts` is the standard `clsx` plus `tailwind-merge` `cn`. No finding.
- `components.json` is consistent with the tree: `cssVariables: true`,
  `css: "src/styles.css"`, aliases match the `#/` import specifier used
  everywhere. `baseColor: "zinc"` is stale relative to the warm `oklch` palette
  but only affects future `shadcn add` output. No finding.
- `FrameBorder.tsx` cleans up its RAF loop, `ResizeObserver`, buffers, program
  and shaders on unmount (`:304-316`), and marks the canvas `aria-hidden`
  (`:328`). It has no importer in `src/`, same as the four dead primitives, but
  it is a vendored `reactbits` file rather than project-owned design system, so
  I left it out of the deletion finding.

### Not verified

The brief forbids the browser tools, so these need the orchestrator's rendered
pass. Each names the exact check.

1. **`tabs.tsx:85` `TabsContent` focus.** The panel has `outline-none` and no
   replacement. Radix may or may not set `tabIndex={0}` on the content panel in
   the installed `radix-ui` version; I could not locate the built module to
   confirm. Check: open `/admin`, Tab from the last tab trigger, and see whether
   focus lands on the panel and whether anything is drawn.
2. **`--kin` and `--matcha` as text.** On `--washi` they measure 2.20:1 and
   3.99:1. Both fail 4.5:1, but I did not confirm they are ever used as a text
   colour rather than as a fill or stroke. Check: computed `color` on any element
   resolving to `var(--kin)` or `var(--matcha)`, light theme.
3. **Real background under `text-nezumi`.** The body paints a gradient from
   `--washi` to `--washi-soft` plus two radial glows plus a fixed fibre overlay
   at 0.55 opacity. My 3.18:1 to 2.57:1 range uses the flat token values. Check:
   sample the composited pixel behind a `text-nezumi` run near the page foot and
   recompute. The finding stands either way, since every value in the range
   fails, but the exact figure will differ.
4. **White inset highlights in dark mode.** `styles.css:886`, `:937`, `:982`
   paint `rgba(255,255,255,0.5)` and `rgba(255,255,255,0.12)` insets with no
   `.dark` override. Check: whether the top edge of a `.paper-card` and a
   `.btn-sumi` reads as a bright line on the ink ground.
5. **Table overflow at 320px.** `table.tsx:84` sets `whitespace-nowrap` on every
   cell. Check: `/admin` at 320px, confirm the container scrolls and confirm
   whether Tab reaches the hidden columns.
6. **Focus ring visibility on a filled button.** The ring paints outside the
   border box, so my 2.32:1 figure is against the page. Check: a focused
   `variant="default"` button sitting on `--card` rather than `--washi`, since
   the lighter card ground makes the 50% ring fainter still.

## Verdict

`Block`. Five HIGH findings remain, and all five sit in the shared token layer
or the primitive base classes, so each one reaches every surface that consumes
it. Three of them contradict `PRODUCT.md:33` directly: the light `--nezumi`
value fails "sufficient contrast in light and dark themes", and the accordion
trigger and nav link fail "visible focus states". The cheapest first move is the
one-line `--nezumi` change, which fixes 113 consumer sites at once.
