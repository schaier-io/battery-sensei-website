---
surface: Admin
routes: /admin
files_reviewed: 4
findings: { high: 7, medium: 8, low: 0 }
verdict: Block
---

# Admin surface review

## Scope and coverage

**Scope.** The `/admin` route and its three components: `src/routes/admin.tsx`,
`src/components/admin/AdminLogin.tsx`, `src/components/admin/AdminDashboard.tsx`,
`src/components/admin/RequestDetail.tsx`. Three view states exist on this route and all
three were inspected: session check, login, dashboard with the detail dialog.

**Stack.** TanStack Start with TanStack Router, React 19, Tailwind v4, radix-ui primitives
wrapped under `src/components/ui/*`, `motion`, react-i18next. Tokens live in
`src/styles.css` (`@theme` block, lines 306 to 380). The surface uses the sumi and washi
palette tokens plus two house component classes, `paper-card` and `btn-sumi`.

**Convention documents found.** `CONTEXT.md` (glossary), `PRODUCT.md` (register, design
principles, accessibility bar), `src/styles.css` (token system and its inline rationale),
`components.json`. No `CONTRIBUTING.md`, `CODING_STANDARDS.md`, or design-system doc.

**Boundaries.** Nav, Footer, switchers, public pages and the `src/components/ui/*`
primitives themselves are out of scope. `src/components/ui/table.tsx` and
`src/components/ui/select.tsx` were read to establish what the call sites inherit, and
every fix below is written at the call site. `api/admin/feature-requests.ts` was read only
to confirm what each action does on the server. No browser was used, so every claim that
needs a rendered page sits in **Not verified**.

**i18n.** The English-only copy on this surface is a deliberate, documented choice
(`src/routes/admin.tsx:6`, `src/components/admin/AdminLogin.tsx:14`). Hardcoded English is
therefore not reported as an i18n defect here. `CONTEXT.md` retired terms do not appear on
this surface.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | All 4 files. Keyboard path from login to approve and reject. Accessible names on every control. Focus handling. Live regions. Table semantics. Reduced motion. | 5 findings |
| Layout | Table column set at `max-w-5xl`, the two nested `overflow-x-auto` containers, dialog at `max-h-[85vh]`, the wrapping header and filter rows, disclosure cue on table rows | Findings folded into A11y row 1 (row affordance). No separate layout finding |
| Writing | Every button label, every error string, the empty state, the two textarea placeholders, the takedown label against the server behaviour | 1 finding (row 15). The empty-state copy is folded into row 9, owned by UI |
| Typography | Arbitrary size values against the `--text-*` scale, badge size floor, tabular numerals, truncation rules, input size against the iOS zoom threshold | 3 findings |
| Colors | `STATUS_BADGE` map, the hinomaru usages across all three components, computed contrast from declared token pairs | 2 findings |
| UI | Loading, empty, error, busy and post-mutation states for every async region. Static cues after each state change. Destructive-action treatment | 3 findings |

**Answers to the specific questions asked.**

- Data table is a real `<table>` with a real `<th>` per column (`src/components/ui/table.tsx:11`
  and `:68`). No column is sortable, so `aria-sort` is correctly absent. `scope="col"` is
  absent; the primitive spreads props, so `<TableHead scope="col">` at
  `src/components/admin/AdminDashboard.tsx:156` to `:162` is a one-word fix. A single header
  row gets implicit column scope in current browsers, so this is recorded here rather than
  as a finding. The table has no `<caption>` and no accessible name.
- There are no per-row action buttons. The whole row is the control, which is finding 1.
- The password field is a real `<input type="password">` with `autoComplete="current-password"`
  and an `aria-label`, so it has an accessible name. It has no visible `<label>`, which is
  in row 14.
- `RequestDetail` does leave a static cue after a state change. The badge in the dialog
  title re-renders from the new status, and a text notice appears
  (`src/components/admin/RequestDetail.tsx:116` to `:118`, `:291` to `:298`). The current
  state is unambiguous on arrival for pending and approved records. It is not unambiguous
  for a rejected one, which is part of row 2.

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility | `src/components/admin/AdminDashboard.tsx:174` to `:178` | `<TableRow key={item.id} onClick={() => setSelected(item)} className="cursor-pointer">` | Put a real `<button>` or a link in the Ticket cell that opens the same dialog, and drop the row `onClick`. If the whole row must stay clickable, keep the in-cell control as the keyboard path. | Every pointer interaction needs a keyboard path. The `<tr>` has no `tabIndex`, no `role`, and no key handler, so a keyboard user cannot open a request. The dialog is the only place to approve, reject, edit public copy, or read the full submitted body, so the entire moderation task is pointer-only. It is also the only place the truncated title (`:182`) and email (`:185`) can be read in full, and neither cell carries a `title` attribute. `cursor-pointer` is a mouse-only cue, so touch and keyboard users get no affordance at all. |
| HIGH | UI | `src/components/admin/RequestDetail.tsx:214` to `:222` and `:272` to `:280` | Both buttons call `patch({ id: item.id, action: 'reject', reason })` straight from `onClick`, with no confirmation step | Add a confirmation before both. Follow `better-writing`: the confirm button repeats the consequence (`Reject and notify`, `Take down`) beside a `Cancel`, and the body states that the dashboard cannot undo it. | Both are one-way doors. `api/admin/feature-requests.ts:262` returns 409 `Already rejected.` on a second attempt, `approve` only accepts `pending`, and `set_status` only accepts an approved status, so nothing in the interface can restore a record once it is rejected. `Reject & notify` also emails the submitter on click, which cannot be recalled. Once `status === 'rejected'`, `isPending` and `isApproved` are both false (`:126`, `:127`), so the dialog renders the Public title and Public description fields with no save button at all (`Save public copy` sits inside the `isApproved` block at `:250`). The record's own dead-end state is therefore invisible until the moderator looks for a control that is not there. |
| HIGH | UI | `src/components/admin/RequestDetail.tsx:79` to `:86` with `:232` to `:237` | `onValueChange` patches `set_status` at once. `onUpdated` sets a new `item`, and the `useEffect` on `[item]` runs `setPublicTitle(item.publicTitle ?? item.title)` and `setPublicBody(...)`. | Seed the two fields from the item id, not the item object, or merge the server response without overwriting fields the moderator has edited. Warn before discarding, or disable the status control while the copy fields are dirty. | Edits typed into Public title or Public description are silently discarded when the moderator changes the roadmap status, because the status patch returns a fresh item and the effect resets both fields from it. There is no dirty marker and no warning. The moderator sees the copy revert with no explanation and the notice reads `Saved.`, which is true of the status and false of the copy. |
| HIGH | Accessibility | `src/components/admin/RequestDetail.tsx:231` to `:240` | `<Label>Roadmap status</Label>` followed by `<SelectTrigger className="w-44">` | Give the label an id and point the trigger at it: `<Label id="admin-roadmap-status">` plus `<SelectTrigger aria-labelledby="admin-roadmap-status">`. The other three fields on this dialog already use the `htmlFor` and `id` pair, so match them where the primitive allows it. | An interactive control with no accessible name. `Label` is `LabelPrimitive.Root`, which renders a `<label>` (`src/components/ui/label.tsx:13`). With no `htmlFor` and no wrapped control it labels nothing, and `SelectTrigger` receives no `aria-label` (`src/components/ui/select.tsx:38`). A screen reader announces the current status value with no indication of what it controls. The control fires an immediate write on change, so the unnamed control is also a mutating one. |
| HIGH | Accessibility | `src/components/admin/AdminLogin.tsx:84` | `focus:outline-none focus:ring-2 focus:ring-sumi/25` | Delete `focus:outline-none` and keep the browser indicator, which is the cheapest fix here. If a house ring is wanted, raise it to a solid token value and move it to `focus-visible:`. | A keyboard-reachable control with no visible focus indicator. `focus:outline-none` removes the browser ring and the replacement is `--sumi` at 25% alpha. Composited over `--washi` that computes to `#bebcb5` and a contrast of 1.69:1 against the paper, and 1.80:1 against the `--card` value the `paper-card` form uses. WCAG 1.4.11 requires 3:1 for a non-text indicator. This is the only control on the login screen, so the session entry point has no usable focus state. The bare `focus:` prefix also shows the ring to mouse users. |
| HIGH | Colors | `src/components/admin/RequestDetail.tsx:47`, `:153`, `:218`, `:260`, `:276`, `:294`; `src/components/admin/AdminDashboard.tsx:147`; `src/components/admin/AdminLogin.tsx:87` | `in_progress: 'text-hinomaru-ink border-hinomaru/40 bg-hinomaru/[0.06]'`, alongside `text-hinomaru-ink` on every error line, on the admin note, and on both destructive buttons | Move `in_progress` to the unused `aizome` token (`--color-aizome`, defined light and dark at `src/styles.css:97` and `:174`). Give `planned` a treatment distinct from `pending`. Reserve `hinomaru` for errors and destructive controls only, and give the admin note at `:153` a neutral color. | One color, one meaning. On this surface `hinomaru` carries four jobs at once: error text, destructive action, the healthy `in_progress` roadmap state, and an informational admin note. A request that is progressing normally wears the same red as the Reject button beside it and the failure line below it, so the status column reads as a problem list. `pending` and `planned` compound it by sharing `kin` and differing only in background alpha, 0.08 against 0.06. `PRODUCT.md` sets the bar directly: do not rely on color alone to communicate status. |
| HIGH | Accessibility | `src/components/admin/AdminDashboard.tsx:122` | `className={\`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}\`}` | `motion-safe:animate-spin`, matching the project's own spinner, which already branches at `src/styles.css:1080` to `:1085`. | Motion with no `prefers-reduced-motion` branch. Tailwind's `animate-spin` is an unguarded infinite rotation. The project has an established convention for exactly this case in `.enso-spinner`, so this is a deviation from its own rule, not a missing rule. Ranked last of the HIGH rows: the icon is 14px, the motion is user-initiated and ends with the request, so its real reach is the smallest here. |
| MEDIUM | Accessibility | `src/components/admin/AdminDashboard.tsx:136` to `:144` with `:152` | `<Tabs>` renders `TabsList` and seven `TabsTrigger` elements. No `TabsContent` is imported (`:3`) or rendered, and the table sits outside the `<Tabs>` element. | These are filters, not tabs, so remove the ARIA rather than add to it: use plain buttons with `aria-pressed`, or a `radiogroup`. If the tab pattern is wanted, wrap the table in a `<TabsContent value={filter}>`. | Broken ARIA reference. `TabsTrigger` always emits `aria-controls={contentId}` (verified in `@radix-ui/react-tabs@1.1.13`), so all seven triggers point at element ids that do not exist in the DOM. A screen reader announces "tab, 1 of 7" and then finds no panel, and arrow-key navigation moves through a tablist that controls nothing visible to it. |
| MEDIUM | UI | `src/components/admin/AdminDashboard.tsx:166` to `:171` | `{items.length === 0 && !loading ? (<TableRow>…Nothing here.</TableRow>) : (items.map(…))}` | Add a third branch for `loading && items.length === 0` with skeleton rows or a status row. Name the active filter in the empty state and offer the exit: `No pending requests. Show all`. | Two of the table's async states are wrong. The empty branch requires `!loading`, and `items` is cleared on every filter change (`:94`), so the first load and every filter switch render a header row above an empty body with no message, no skeleton, and no busy cue except a 14px icon in the header. The empty state is then a shrug: it names neither the filter that produced it nor a way out, and a moderator reading `Nothing here.` under the `rejected` tab cannot tell an empty filter from a failed one. |
| MEDIUM | Accessibility | `src/components/admin/AdminLogin.tsx:86` to `:90`; `src/components/admin/AdminDashboard.tsx:146` to `:150`; `src/components/admin/RequestDetail.tsx:291` to `:298` | All three mount the live region together with its text. `RequestDetail` also swaps the role on the same node: `role={error ? 'alert' : 'status'}` | Render each region unconditionally with an empty string inside, and update only its text. Use two separate nodes in `RequestDetail`, one `role="alert"` for errors and one `role="status"` for notices, rather than one node that changes role. | Dynamically inserted live regions announce inconsistently across screen readers, and a repeated update to a region that was just inserted is the least reliable case of all. This surface hits that case on every failed login retry and every save. Changing the role of an existing node is worse: assistive technology reads the role at insertion, so an error after a success may be announced as a polite status or not at all. |
| MEDIUM | Colors | `src/components/admin/RequestDetail.tsx:49` | `rejected: 'text-nezumi border-[var(--line)] opacity-70'` | Drop `opacity-70`. Distinguish the rejected badge with the border and a lighter font weight, and leave the text color at full strength. | An opacity multiplier stacked on a text color that is already near the floor. `--nezumi` (`#8a847c`) against the `--card` value the `paper-card` table uses computes to 3.39:1 from the declared tokens, which is already under the 4.5:1 that this 10px semibold text needs. Multiplying the foreground by 0.7 can only lower it, to roughly 2.2:1. The exact rendered figure is in **Not verified** because `paper-card` paints a gradient plus a 0.35-opacity grain layer. The base `text-nezumi` pair is a site-wide token question (40 files use it) and belongs to whoever owns `src/styles.css:84`, but the `opacity-70` on top of it is this surface's own decision. |
| MEDIUM | Typography | `src/components/admin/AdminLogin.tsx:62`, `:63`, `:87`; `src/components/admin/AdminDashboard.tsx:112`, `:120`, `:128`, `:147`, `:210`; `src/components/admin/RequestDetail.tsx:133`, `:286`, `:294` | `text-[0.8125rem]` in eight places, `text-[0.9375rem]`, `text-[1.125rem]`, `text-[1.25rem]` | Use the utilities the scale already generates: `text-caption` for `0.8125rem`, `text-body-sm` for `0.9375rem`, `text-h4` for `1.125rem`. Pick one size for the `Feature board admin` heading and use it in both places. | The project defines a named scale at `src/styles.css:306` to `:314`, and this surface retypes three of its steps as raw values instead. `text-[0.8125rem]` is `--text-caption` exactly, `text-[0.9375rem]` is `--text-body-sm`, `text-[1.125rem]` is `--text-h4`. The same `Feature board admin` heading then renders at `text-h4` on the login screen (`AdminLogin.tsx:71`) and at `text-[1.25rem]` on the dashboard, a step that is on no scale at all. A scale nothing references stops constraining anything. |
| MEDIUM | Typography | `src/components/admin/AdminDashboard.tsx:195` to `:197`; `src/components/admin/RequestDetail.tsx:152` | `{new Date(item.createdAt).toLocaleString()}` in a cell with no `tabular-nums` | Add one formatter beside `formatLongDate` in `src/lib/format-date.ts` for timestamps, fixed to `en-GB` and to explicit day, month, year, hour and minute options, then use it in both places. Add `tabular-nums` to the Received cell. | Two defects, one root cause. `toLocaleString()` follows the reader's machine locale, so the same record reads `07/09/2026, 11:28:14` on one moderator's machine and `9/7/2026, 11:28:14 AM` on another, which is ambiguous for any day under 13. It also contradicts the site's stated one-shape rule at `src/lib/format-date.ts:1` to `:8`. Note that `formatLongDate` cannot be called directly here: it appends `T12:00:00Z` to its argument (`:31`), so a full timestamp yields `NaN` and falls back to the raw ISO string. Without tabular numerals the Received column's digits shift width per row, so the dates do not align down a column that is only ever scanned vertically. |
| MEDIUM | Typography | `src/components/admin/AdminLogin.tsx:76` to `:85` | Hand-rolled input with `text-[0.875rem]`, labelled by `placeholder="Admin key"` plus `aria-label="Admin key"` | Raise the size to `text-base sm:text-[0.875rem]`, matching the project's own `Input` primitive. Add a visible `<label htmlFor>` above the field and keep the placeholder for the format hint or drop it. | 14px input text makes iOS Safari zoom the whole page on focus, and the page does not zoom back out. The project already solved this: `src/components/ui/input.tsx:11` and `src/components/ui/textarea.tsx:10` both use `text-base md:text-sm` for exactly this reason, so the hand-rolled control reintroduces a fixed defect. A placeholder is also never a label; it vanishes on the first keystroke, which on a password field leaves an unlabelled box of dots. The `aria-label` gives the control a name, so this is not a naming failure. |
| MEDIUM | Writing | `src/components/admin/AdminLogin.tsx:47`; `src/components/admin/AdminDashboard.tsx:79`, `:86`; `src/components/admin/RequestDetail.tsx:112`, `:120` | `'Login failed.'`, `'Failed to load requests.'`, `'Network error.'` (twice), `'Update failed.'` | Give each error the next action: `Login failed. Check the key and try again.`, `Unable to load requests. Check your connection, then use Refresh.`, `Unable to save. Check your connection and try again.` | An error is an instruction. Four of these five strings name a failure and stop, so a moderator cannot tell a wrong key from a rate limit from an outage, and cannot tell whether retrying is worth anything. `'Network error. Try again.'` at `AdminLogin.tsx:50` is the one string on this surface that gets it right, so the fix is to match the pattern already here. The dialog case is the worst of them: it has no Refresh or retry control anywhere near it. |

## Verification

**Checks run.**

- Read all four in-scope files in full, plus `src/components/ui/table.tsx`,
  `src/components/ui/label.tsx`, `src/components/ui/select.tsx`,
  `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`,
  `src/components/ui/dialog.tsx` and `src/components/ui/tabs.tsx` to establish inherited
  behaviour. Result: findings 4, 8, 14 confirmed at the primitive boundary.
- Accessible name on every interactive control on the surface. Result: one control has
  none (row 4). The dialog close button carries an `sr-only` "Close"
  (`src/components/ui/dialog.tsx:78`). Every icon on the surface is `aria-hidden` beside a
  text label.
- `grep -n "focus-visible" src/styles.css`. Result: no global focus rule, and no other
  admin control removes its outline. Row 5 is limited to the one input.
- `grep -n "prefers-reduced-motion" src/styles.css`. Result: five guarded blocks, none
  covering Tailwind `animate-*`. Row 7 confirmed.
- `aria-controls` in `@radix-ui/react-tabs@1.1.13` dist bundle. Result:
  `"aria-controls": contentId` is emitted unconditionally. Row 8 confirmed.
- `api/admin/feature-requests.ts:234` to `:296`. Result: the `Take down` label at
  `RequestDetail.tsx:261` is accurate. Only a reject from `pending` emails the submitter
  (`:266`). No copy finding there. The same read confirmed that no server action restores a
  rejected record, which is row 2.
- Contrast computed from declared token pairs (WCAG relative luminance, sRGB):
  `--sumi` at 25% over `--washi` = 1.69:1 and over `--card` = 1.80:1 (row 5);
  `--nezumi` over `--washi` = 3.18:1 and over `--card` = 3.39:1, dropping to about 2.2:1
  once `opacity-70` is applied (row 11).
- Single `<h1>` per view state, one `<main>` landmark (`src/routes/admin.tsx:23`). Result:
  correct. No skip link is needed, because the route renders no chrome before `<main>`.
- Every user-facing string against `CONTEXT.md`. Result: no retired term appears.

**Not verified.** No browser was used, per the shared brief. The orchestrator should run:

1. Tab from page load through login, the filter row, the table and the dialog. Confirm
   that no tab stop reaches a table row, and that no tab stop on the login input shows a
   visible ring. Expected to confirm rows 1 and 5.
2. Measure the rendered pair for the `rejected` badge over `paper-card`, which paints a
   gradient (`src/styles.css:880`) under a 0.35-opacity grain layer (`:896` to `:903`).
   A result under 4.5:1 escalates row 11 to HIGH.
3. Measure the `in_progress` and `pending` badge text against the same background in both
   themes, and confirm side by side whether `pending` and `planned` read apart.
4. Load `/admin` at 320px and at 200% zoom. The table sits inside two nested
   `overflow-x-auto` containers (`AdminDashboard.tsx:152` and `src/components/ui/table.tsx:9`),
   neither of which is keyboard-focusable, so check whether a keyboard-only user can scroll
   the seven columns horizontally in Safari and Firefox.
5. Read the accessibility tree for the filter tablist and confirm the dangling
   `aria-controls` targets, and for the roadmap Select to confirm it has no name.
6. Watch the Refresh icon with `prefers-reduced-motion: reduce` set.
7. Open a request with a title longer than the `max-w-64` cell and an email longer than
   `max-w-48`, and confirm no tooltip appears on either truncated cell.

## Verdict

`Block`. Seven HIGH findings remain. The moderation task cannot be completed with a
keyboard, and both destructive actions are one-way doors with no confirmation and no route
back from the interface.
