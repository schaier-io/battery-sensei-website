# Shared brief for surface interface reviews

Read this first, then your surface prompt.

## Task shape
- Read-only review. Do NOT edit any source file. The only file you write is your own report.
- Load the `better-interface` skill with the Skill tool and follow it. It routes to
  `better-accessibility`, `better-layout`, `better-writing`, `better-typography`,
  `better-colors`, `better-ui`. Load each of those too and apply them as the owners of
  their rules. Also explicitly load `better-ui`.
- This is a SCREEN review, not a change review. Do not route to `interface-review`.
- Report at most 15 findings. Evidence, not taste. Every finding cites `path/to/file:line`
  and shows the current implementation.

## Runtime
- Do NOT use the browser / preview tools. One browser pane is shared by many agents and
  you will collide with them. The orchestrator runs the rendered-state pass separately.
- Any claim that needs a rendered page (measured contrast of a computed pair, real overflow
  at 320px, actual focus-ring visibility, animation timing on screen) goes in the
  **Not verified** list with the exact check the orchestrator should run. Do not guess it
  into a finding.
- Code-level findings you can prove from source are full findings. Examples: missing
  accessible name, `transition: all`, motion with no `prefers-reduced-motion` branch,
  color-only state, hardcoded hex outside the token system, a control that is a `div`.

## Project context (read these)
- `CONTEXT.md` — ubiquitous language. Plan names, tier names, content-surface names.
  Copy findings must use it. "Premium", "Journal" (for guides or history) and
  "Battery Journal" are retired labels.
- `PRODUCT.md` — brand register, design principles, accessibility bar.
- `src/styles.css` — the token system. Check whether the surface uses tokens or ad-hoc values.
- `components.json`, `src/components/ui/*` — shadcn-style primitives. Fixes must be in the
  project's own idiom.
- Stack: TanStack Start + TanStack Router, React 19, Tailwind v4, radix-ui, `motion`,
  react-i18next.

## i18n
The site is multi-locale. A hardcoded user-facing English string in a component that should
use `t()` is a finding. Check how neighbouring components do it before you report.

## Output
Write your report to the exact path given in your prompt, using the format in
`~/.agents/skills/better-interface/review-format.md`:
scope and coverage table, one ranked findings table, verification, verdict.

Prefix your report with YAML frontmatter:

```
---
surface: <surface name>
routes: <the URL paths this surface serves>
files_reviewed: <count>
findings: { high: N, medium: N, low: N }
verdict: Block | Approve
---
```

Keep the findings table columns exactly: Severity | Domain | Location | Before | After | Why.

## Writing rules for the report
Plain, short sentences. No em dashes or en dashes. No "crucial", "robust", "seamless",
"leverage", "ensure ...ing" tails. State the defect, not its significance.

## Return message
Reply to the orchestrator with only: the report path, the finding counts by severity, the
verdict, and the single highest-impact finding in one sentence. Do not paste the report.
