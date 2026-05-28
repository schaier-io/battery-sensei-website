# Feature page extension research

Existing structure (FeaturePage.tsx): kicker → hanko → h1 → headingItalic → body → mockup → why. All from i18n. Above-fold copy stays untouched (translated to 5 locales already).

Extension plan: add an English-only `extendedContent` slot rendered *below* the existing "why it matters" block. Each ~1000-1500 words of deep guide content, structured for SEO:
- H2 sections (so they rank for long-tail "how does travel mode work" etc.)
- Internal links to glossary + related features + relevant blog posts
- One FAQ block per page with Schema markup
- "Specs" / details list per page (verifiable, citable)

---

## /features/travel-mode (canonical, full extension)

### Target keywords
- Primary: travel mode mac, macbook charge to 100 before flight
- Secondary: macbook travel charging, charge limit overnight before trip, lithium ion 100 percent storage

### Sections
1. **What Travel Mode is** — restate the above-fold copy in fresh words, no repeats
2. **Why one-tap and auto-reset matter** (the 9 AM problem)
3. **How it composes with macOS** — pauses OBC, respects Charge Limit, restores both
4. **What "stricter warnings" means** — list the per-tier % and dismiss times
5. **A note on heat** — short paragraph; if you charged to 100% the day before, *then drove the laptop in a hot car*, the worst-case combination
6. **Related features**: link to /features/alert-presets, /features/custom-thresholds
7. **FAQ** (4 Qs)

### Citable facts
- [Apple 102338](https://support.apple.com/en-us/102338) — OBC behavior
- App: 9 AM reset is local time (per i18n body, source: AppModel.swift comment)
- Aging at 100% chemistry context (link to /blog/should-i-keep-plugged-in)

---

## /features/battery-journal (the Saga page — extension)

### Target keywords
- Primary: macbook battery history, mac battery monitor app
- Secondary: macbook battery cycles chart, battery health timeline, mac battery wrapped

### Sections
1. **What Saga shows** — charge history, health tiles, top apps, weekly/monthly Wrapped, Rescue Receipts
2. **Why a battery needs a story** — repeat the headline argument; expand
3. **What each panel means** in plain English
4. **The 24h / 3d / 7d ranges and the unlimited (Premium) extension**
5. **Rescue Receipts: how the 30-minute window works**
6. **Privacy: nothing leaves the Mac** (this is also an SEO play — "private mac battery monitor" is a search)
7. **Related**: /glossary/cycle-count, /glossary/battery-health, /blog/healthy-cycle-count-macbook
8. **FAQ** (3 Qs)

---

## /features/custom-thresholds (extension)

### Target keywords
- Primary: macbook custom battery alerts, low battery warning custom percentage mac
- Secondary: change macbook battery alert percent

### Sections
1. **What custom thresholds change** — per-tier % + dismiss times
2. **The three escalation levels** — Info / Warning / Alert (rename if app uses different)
3. **Why one global threshold fails** — flight vs meeting day example
4. **Setting them in the app** — quick walkthrough
5. **Premium feature** — included in trial, then Lifetime
6. **Related**: /features/alert-presets, /glossary/low-power-mode
7. **FAQ** (3 Qs)

---

## /features/alert-presets (lighter extension)

### Target keywords
- Primary: macbook low battery alert, mac battery warning app

### Sections
1. **The three presets in detail**
   - Zen Mode (15%, 5s | 5%, 10s)
   - Regular Mode (5% red overlay, 2% persistent)
   - Teach Me Senpai (15% overlay, 5% full-screen flasher, stay until dismiss)
2. **When to use which**
3. **Customization path** — link to /features/custom-thresholds
4. **macOS's single 10% warning, and why it's not enough**
5. **FAQ** (2 Qs)

---

## /features/energy-usage (lighter extension)

### Target keywords
- Primary: top battery drain apps mac, what app is draining my macbook battery

### Sections
1. **What Sensei shows you** (1h / 24h / 7d)
2. **Activity Monitor's score, surfaced live in menu bar**
3. **Common culprits: hung helpers, sleepless tabs, GPU-holding video calls**
4. **No system extension, no kernel hooks** (privacy + reliability)
5. **Related**: /glossary/thermal-throttling, /glossary/watts-in-out
6. **FAQ** (2 Qs)

---

## /features/meeting-battery-guard (lighter extension)

### Target keywords
- Primary: macbook meeting battery alert, calendar battery warning mac

### Sections
1. **The 4-hour calendar lookahead** — EventKit, on-device
2. **The four severity levels** — Comfortable / Tight / Critical / Catastrophic
3. **Critical timing: 30 / 15 / 5 / 0 min before**
4. **Title privacy toggle**
5. **Premium** — included in trial
6. **FAQ** (2 Qs)
