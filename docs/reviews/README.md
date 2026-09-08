# Interface review, September 2026

Every surface of the site reviewed on its own, then measured in the browser.
Thirteen reports, 199 findings, 53 of them HIGH. Every surface returned `Block`.

Method: twelve read-only sub-agents, one per surface, each following
`better-interface` and its six domain skills (`better-accessibility`,
`better-layout`, `better-writing`, `better-typography`, `better-colors`,
`better-ui`). Each was capped at 15 findings and required a `file:line` citation
and the current implementation for every one. A thirteenth pass
([00-runtime-pass.md](00-runtime-pass.md)) measured the running app to settle
the claims that need a browser.

The brief the agents worked from is [_BRIEF.md](_BRIEF.md).

**Status:** the review itself changed no source file. Five HIGH findings have
since been fixed in four files; see [FIXES.md](FIXES.md). The remaining 48 HIGH
findings stand.

## Reports

| # | Surface | Routes | HIGH | MED | LOW | Verdict |
| --- | --- | --- | ---: | ---: | ---: | --- |
| [00](00-runtime-pass.md) | Rendered-state pass | measured, 11 routes | 4 | 6 | 2 | Block |
| [01](01-home.md) | Home / landing | `/`, `/:lang` | 8 | 7 | 0 | Block |
| [02](02-global-chrome.md) | Global chrome | every route | 5 | 6 | 3 | Block |
| [03](03-pricing-checkout.md) | Pricing and checkout | `/#pricing`, `/checkout` | 4 | 8 | 2 | Block |
| [04](04-post-purchase.md) | Post-purchase and referral | `/thanks/*`, `/from/:id` | 3 | 10 | 2 | Block |
| [05](05-feature-pages.md) | Feature pages | `/features`, 14 sub-pages | 1 | 10 | 2 | Block |
| [06](06-guides.md) | Guides | `/guides`, `/guides/:slug` | 3 | 8 | 3 | Block |
| [07](07-glossary.md) | Glossary | `/glossary`, `/glossary/:slug` | 1 | 9 | 5 | Block |
| [08](08-roadmap-board.md) | Roadmap / feature board | `/roadmap` | 5 | 9 | 1 | Block |
| [09](09-admin.md) | Admin | `/admin` | 7 | 8 | 0 | Block |
| [10](10-newsletter.md) | Newsletter lifecycle | `/newsletter/*` | 3 | 9 | 2 | Block |
| [11](11-legal-and-dead-ends.md) | Legal, privacy, 404, errors | `/legal`, `/privacy`, `/walkthrough`, `/404` | 1 | 9 | 5 | Block |
| [12](12-design-system.md) | Design system foundation | shared tokens and primitives | 5 | 6 | 3 | Block |
| [13](13-zen-components.md) | `zen` component library | shared visuals | 3 | 8 | 3 | Block |

## Root causes worth fixing first

Findings were consolidated per surface, so the same root cause still appears in
several reports. These are the ones where one change closes many rows.

### 1. `--nezumi: #8a847c` in the light theme
`src/styles.css:84`. Measured 3.18:1 on `--washi`, 2.90:1 on `--washi-soft`,
2.57:1 on `--washi-deep`, against a 4.5:1 floor. It is the site's muted text
colour: 113 `text-nezumi` uses plus `.spec-strip` and `.legal-list li::marker`.
It carries screenshot captions, guide dates, glossary category headings, legal
body text, the checkout fine print and the customer-portal recovery links on
the post-purchase pages. The dark theme already ships a corrected `#a49d94`.
Reported independently by eight of the thirteen reviews.

### 2. `--accent` is byte-identical to `--destructive` (FIXED)
`src/styles.css:137` and `:139`, both `oklch(0.5 0.18 25)`. A semantic colour
used against its meaning is an escalation trigger on its own.

Correction to this entry: it says every neutral hover and selection surface
paints the danger hue. That is wrong. `ui/badge.tsx` and `ui/button.tsx` have no
live consumers, so the reach was the dialog X close control (public `/roadmap`
through `LicenseKeyDialog`, plus admin) and the admin select's keyboard
highlight. The close icon measured 1.13:1 light and 1.61:1 dark against its own
background, which is why it was worth fixing anyway. See
[FIXES.md](FIXES.md#fix-5---accent-was-byte-identical-to---destructive).

### 3. Focus indicators removed and replaced with something weaker
`outline: none` or `focus:outline-none` appears with a replacement that is
either a 2.32:1 ring, a state the element already paints, or a transform that
may not fire: `src/styles.css:2145`, `src/styles.css:2182-2188`,
`src/components/ui/accordion.tsx:36`, `src/components/admin/AdminLogin.tsx:84`,
`src/components/NewsletterResendForm.tsx:167`, and seven `ui/` primitives.
Deleting the suppression and keeping the browser's own ring is the cheaper fix
in most of them.

### 4. Server-rendered content hidden until JavaScript runs
`[data-reveal] { opacity: 0 }` at `src/styles.css:2193` is lifted only by the
`IntersectionObserver` in `Reveal.tsx`. The home page ships 46 `data-reveal`
elements in its server HTML. `/newsletter/confirm` additionally holds a spinner
that only JavaScript can resolve. There is no `<noscript>` fallback outside
`PolarInlineCheckout.tsx:277`.

### 5. Reduced motion is covered in CSS but not everywhere in JS
29 scoped CSS blocks handle it. The gaps are JS-driven or utility-driven:
`TiltCard`, `MenuBarMockup`, `animate-spin` without `motion-safe:` in
`PolarInlineCheckout.tsx:251` and `AdminDashboard.tsx:122`, and
`scrollIntoView({ behavior: 'smooth' })` at `Pricing.tsx:656`.

### 6. State carried by colour alone
The comparison cells (`Compare.tsx:374-396`), the roadmap status chips and vote
state (`FeatureCard.tsx:16`, `:50-58`), and `InkLevelBar`. Each needs an icon,
a label, or a shape alongside the hue.

### 7. Charts that a screen reader cannot read
`Sparkline.tsx:101` hardcodes `aria-hidden` with no way to opt out, and it is
the entire content of the aging `role="tabpanel"` in `Health.tsx:721-733`, so
that panel announces as empty for every range tab.

## Two defects that cost a visitor something today

- **`/checkout?tier=support` is blank.** `src/routes/checkout.tsx:384` reads
  `pricing.support.items` as `string[]`, but all five locales ship it as
  `{title, body}[]`. The route returns HTTP 200 with 29 characters of visible
  text. The Yearly Patron purchase cannot start.
  ([03](03-pricing-checkout.md), verified in [00](00-runtime-pass.md))
- **Hydration fails on every route.** `src/components/RouteFade.tsx:34-42`
  branches on `document`, so the server renders the `motion` wrapper and Chrome
  renders `children`. React discards the server HTML and re-renders the whole
  app on the client. ([00](00-runtime-pass.md))

## Dead code the reviews found

Not interface defects, but they came up while inspecting and each carries
findings whose cheapest fix is deletion.

- `ChargeChart`, `ChargeRing`, `WarningOverlay`, `Enso`, `BrushTick` and
  (transitively) `BrushRing`: about 1,170 lines with no importer outside
  `src/components/zen/`. ([13](13-zen-components.md))
- `badge.tsx`, `card.tsx`, `separator.tsx`, `switch.tsx`: zero importers.
  ([12](12-design-system.md))
- `/walkthrough`: nothing links to it, it sets `noindex`, and
  `public/sitemap.xml:65` advertises it anyway. ([11](11-legal-and-dead-ends.md))

## What was checked and came back clean

Recorded so the next review does not redo it.

- No horizontal overflow at 320px on ten routes.
- One `<h1>` per route on every route sampled.
- Terminology: `CONTEXT.md` is followed. "Guides", "Saga", "Pro", "Lifetime"
  and "Yearly Patron" are used correctly; the legacy "Fourteen guides" copy is
  already "Fourteen pages".
- Alt text and image dimensions on the feature pages.
- Optimistic vote rollback on the roadmap, and typed text surviving a failed
  submit there.
- `LicenseKeyDialog` passes all five dialog gate checks.
- The newsletter signup is no longer fire-and-forget; both forms await the
  response and render a failure state.
- TanStack devtools are stripped from production builds.

## Still not verified

Listed per report, and collected in [00-runtime-pass.md](00-runtime-pass.md):
the `.nav-link` focus cue, 200% zoom, `prefers-reduced-motion` emulation,
rendering with JavaScript disabled, and the live 404 status code.
