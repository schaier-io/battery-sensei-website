# Blog research — Battery Sensei (EN only)

Source of truth for the 3 seed posts. Each section: target keyword, secondary, citable facts (with URLs), outline, headline candidates. Final TSX articles live in `src/data/blog/<slug>.tsx`.

App-side citations (verified from `public/llms.txt`, app i18n):
- Charge limit at any %, default 85% in app (80% in marketing copy — 80% is Apple's reference). Sensei uses 80% as suggested cap.
- Travel Mode: lifts to 100%, switches to stricter thresholds (30/15/5%), auto-resets at 9 AM the next morning, pauses Apple's OBC during the trip window.
- Sensei Saga: Battery Health panel (capacity, cycles, temperature, condition).
- Heat-throttling awareness with explanation of macOS pause behavior.

---

## Post 1: should-i-keep-macbook-plugged-in

### Targeting
- Primary keyword: **should I keep my MacBook plugged in** (high intent, "should I" = decision query, ~9.9k/mo according to Ahrefs trend data)
- Secondary: macbook always plugged in, leave macbook plugged in battery, charge MacBook overnight, macbook plugged in 24/7
- Search intent: informational, mild commercial (people are nervous about damage)
- SERP today: dominated by Macworld, MakeUseOf, Lifewire — all generic content farms. Opportunity: be more concrete, cite Apple primary sources, show the actual tools.

### Citable facts
1. **Apple's own position:** Optimized Battery Charging "is designed to reduce the wear on your battery and improve its lifespan by reducing the time that your Mac spends fully charged" — [Apple Support 102338](https://support.apple.com/en-us/102338).
2. **Apple confirms lithium-ion chemistry:** A battery's lifespan depends on its **chemical age**, affected by temperature history and charging pattern — [Apple Support 102589](https://support.apple.com/en-us/102589).
3. **Industry consensus:** Lithium-ion cells live longest between **40–80% state of charge**; sustained 100% accelerates wear (cathode oxidation, electrolyte breakdown).
4. **Heat is the bigger killer:** Per Battery University / NREL, every **+10°C** roughly halves cell lifespan. Plugged-in laptops generally run hotter than unplugged ones (charging adds heat to CPU heat).
5. **The OBC learning period is 14 days** before it starts deferring charge past 80% — Apple's [102338](https://support.apple.com/en-us/102338) confirms this. Most users never wait that long for it to "kick in."

### Outline (~1600 words)
1. **Short answer first** (paragraph): No, not all the time. Three reasons in one sentence each (heat, voltage stress, calendar age). One concession: occasional all-day plugged-in is fine — daily and the months add up.
2. **The two things that age a Mac battery** (~250 words)
   - Time spent at high state of charge (≥80%)
   - Heat (cite +10°C halves lifespan)
   - These compound; plugged-in cures the first concern (chemical age clock keeps ticking either way) but worsens the second.
3. **What Apple actually does about it** (~300 words)
   - Optimized Battery Charging: ML model, 14-day learning, defers past 80%
   - Limitation #1: it only works if your schedule is *predictable*
   - Limitation #2: it's invisible — you don't know when it kicked in
   - Limitation #3: travel breaks it (the ML model has no idea you're leaving tomorrow)
4. **The 80% rule, demystified** (~250 words)
   - Why 80% and not 90% or 70%? — voltage curve, oxidation kinetics
   - Diminishing returns table (rough estimates from Battery University):
     - 100% daily: ~300-500 cycles to 80% capacity
     - 90%: ~600 cycles
     - 80%: ~1500 cycles
     - 70%: ~2400 cycles
   - Verdict: 80% is the sweet spot — meaningful gain over 100% without giving up much runtime.
5. **When plugged-in is fine** (~200 words)
   - You almost never unplug (desktop user) → set a hard 80% cap, leave it
   - You unplug daily → cap at 80%, raise to 100% via Travel Mode the night before flights
   - Long weekend away from the Mac → store at ~50%, not 100%
6. **What to actually do (decision tree)** (~250 words)
   - macOS Sequoia 14+: Settings → Battery → Battery Health → set Charge Limit (limited control)
   - For per-percent control + Travel Mode + per-tier alerts → mention Battery Sensei (~1-sentence pitch, link to /features/travel-mode + /features/custom-thresholds)
7. **FAQ** (~250 words): Schema markup
   - "Is it bad to leave my MacBook plugged in overnight?" → No, if cap is set. Yes, if it's been charging to 100% nightly for months.
   - "Does charging fast (Pro chargers) damage the battery more?" → Marginally, mostly from heat. Apple's adapter is fine.
   - "Should I drain it to 0 sometimes?" → No, lithium-ion ≠ NiCd, full discharges hurt.
   - "How often should I unplug to 'cycle' it?" → Don't. Cycles are accumulated automatically; deliberately discharging just spends them.

### Headline candidates
- A: "Should I keep my MacBook plugged in all the time?" (matches query exactly — best for CTR)
- B: "Leaving your MacBook plugged in: what actually happens to the battery"
- C: "Is it bad to keep your MacBook plugged in? The honest answer"
- **Pick A** — exact-match wins.

### Meta
- Title: `Should I keep my MacBook plugged in? — Battery Sensei` (62 chars)
- Description: `What happens to a MacBook battery when you leave it plugged in 24/7 — and the three settings that change the answer. Plain English, Apple sources cited.` (155 chars)

---

## Post 2: healthy-cycle-count-macbook

### Targeting
- Primary: **MacBook battery cycle count** (15-20k/mo, mostly informational)
- Secondary: healthy cycle count macbook, what is a battery cycle, cycle count limit MacBook, MacBook battery 1000 cycles
- Search intent: informational ("I just checked, is 350 bad?"). High purchase intent for replacement battery, but here we're funneling to a *prevention* tool (Sensei).
- SERP today: 9to5Mac, MacRumors, Beebom — short list-style posts. Opportunity: a definitive guide with the per-model table.

### Citable facts
1. **1000 cycles is the Apple Silicon default**: All M-series MacBooks (M1, M2, M3, M4) are rated for **1,000 cycles** before capacity drops below 80% — [Apple Support 102888](https://support.apple.com/en-us/102888).
2. **Older models were lower**: Pre-2009 Macs were rated for 300; 2010-2018 for 1,000 with some 500-cycle outliers. (List from same Apple page.)
3. **80% capacity = "Service Recommended"** threshold — [Apple Support 108376](https://support.apple.com/en-us/108376). Phone shows this; Mac shows it in Battery Settings.
4. **AppleCare covers ≤80% replacement** at no charge during plan validity.
5. **How to check** (M-series): Settings → Battery → Battery Health → cycle count + capacity (cite Apple's official path).
6. **Cycle = full equivalent**: Two days at 50% each = 1 cycle. Not "plugging in" — cumulative drained capacity.

### Outline (~1700 words)
1. **TL;DR up top** (~80 words)
   - Modern MacBooks (2018+): 1,000 cycles design lifetime; at that point, **expect ~80% capacity remaining**
   - "Healthy" = whatever percentage of design lifetime you've used, given how old the Mac is
   - The number alone is meaningless without age + capacity
2. **What a cycle actually is** (~200 words)
   - One cycle = one full equivalent discharge (100% used, in any combination)
   - Diagram-equivalent in prose (using "two half-days = one cycle" framing)
   - Cycles are NOT plug-in events
3. **Cycle count limits by MacBook model** (~300 words + TABLE)
   - 2024+ Apple Silicon (M3/M4): 1,000
   - 2020-2023 M1/M2: 1,000
   - 2018-2019 Intel (T2): 1,000
   - 2010-2017 Intel: 1,000 (most), 500 (some MBA 13" 2017)
   - Pre-2009: 300 (rare)
   - Citation to Apple 102888
4. **What "healthy" looks like at your age** (~250 words)
   - Months-of-ownership × ~30-40 cycles/month average use ≈ expected cycles
   - At 12 months: 350-450 cycles is normal
   - At 24 months: 700-900 cycles is normal
   - Above expected → you're a power user, replace earlier
   - Below expected → you barely use it; cycle count isn't your enemy, *calendar age* is (cite chemical age)
5. **How to check it (M-series)** (~150 words)
   - Settings → Battery → click ⓘ next to Battery Health → cycle count + condition
   - Terminal: `system_profiler SPPowerDataType | grep "Cycle Count"`
   - Mention Battery Sensei surfaces this in the menu bar live
6. **When to replace** (~200 words)
   - Service Recommended notice = capacity below threshold OR cycle count exceeded
   - Apple replaces at ≤80% if AppleCare active
   - Out-of-AppleCare cost (cite Apple's own page)
   - Reality check: most 4-year-old MacBooks still on 90%+ are fine
7. **Slowing cycle accumulation** (~250 words)
   - Charge limit at 80% reduces the *depth* per cycle, but does NOT change the count math — you'd think 80% caps the cycle at 0.8, but cycles are full-equivalents (still accumulated linearly)
   - The real win: less time at high SOC = less voltage stress = capacity stays above 80% longer
   - Travel Mode for trip days
   - Link: /features/battery-journal (cycles surfaced live), /glossary/cycle-count
8. **FAQ** (~250 words): Schema markup
   - "Is 500 cycles a lot for a 2-year-old MacBook?" → Slightly above average, fine
   - "Why is my cycle count different from my capacity?" → They track different things
   - "Can I reset cycle count?" → No
   - "Does sleep increase cycle count?" → No

### Headline candidates
- A: "What's a healthy MacBook battery cycle count?"
- B: "MacBook battery cycle count: what's normal at every age"
- **Pick B** — broader appeal, captures "I'm at 350, is that fine?" intent.

### Meta
- Title: `MacBook battery cycle count: what's healthy at every age` (58)
- Description: `Modern MacBooks are rated for 1,000 cycles. Here's what's normal at 1, 2, and 4 years — and when "Service Recommended" actually means it.` (143)

---

## Post 3: optimized-battery-charging-explained

### Targeting
- Primary: **Optimized Battery Charging** (5-10k/mo, mostly Mac-specific)
- Secondary: optimized battery charging mac, OBC not working, charge limit mac, macOS battery charging settings, why is my mac stuck at 80%
- Search intent: confused users (why won't it charge past 80%) + investigators (does it actually work).
- SERP today: Apple Support + a few comparison pieces. Opportunity: be the explainer that's also honest about OBC's limits.

### Citable facts
1. **On-device ML**: OBC uses on-device machine learning to learn your daily charging routine — [Apple Support 102338](https://support.apple.com/en-us/102338).
2. **14-day learning period** before OBC starts deferring past 80%.
3. **"Charging On Hold"** is the menu-bar indicator when active.
4. **"Charge to Full Now"** override is available from the battery menu.
5. **Charge Limit (separate, newer feature)**: macOS Sequoia 15+ added a manual Charge Limit (80/90/95/100), distinct from OBC. Both can be enabled.
6. **Adaptive logic**: "If your Mac is usually plugged in, macOS will pause charging at 80% full" — Apple's own wording.

### Outline (~1600 words)
1. **The 30-second version** (~80 words)
   - OBC is Apple's automatic battery-saving feature. It uses on-device ML to delay charging past 80% when it thinks your Mac will stay plugged in for a long time.
   - It's invisible. It's adaptive. It works — sometimes.
2. **How OBC actually works** (~350 words)
   - The two-stage charge: fast to 80%, hold, then top up timed to when you'd unplug
   - On-device ML — no cloud, no telemetry (cite Apple)
   - 14-day learning before activation
   - Trigger conditions: routine charging pattern + extended plug-in predicted
3. **OBC vs. Charge Limit (the new one)** (~250 words)
   - Charge Limit (Sequoia 15+) is the manual hard cap: 80/90/95/100
   - OBC is opportunistic (learned)
   - They compose: Charge Limit acts as ceiling, OBC delays within that ceiling
   - Table comparing the two
4. **Where OBC falls short** (~300 words)
   - Demands a predictable routine. Real lives aren't predictable.
   - Invisible — you can't tell *if* it's even active until "Charging On Hold" appears
   - No travel mode — the ML can't read your calendar
   - No per-day customization — the ML averages over 14 days
   - When you most need 100% (flight tomorrow) it's least helpful
5. **The third option** (~250 words)
   - Manual charge cap (Sequoia 15+) gets you the predictability OBC lacks
   - Tools like Battery Sensei add Travel Mode (one-click 100% for trip days, auto-reset) and integrate with both
   - Link: /features/travel-mode, /glossary/optimized-battery-charging
6. **Troubleshooting: why is my Mac stuck at 80%?** (~200 words)
   - OBC is active — click "Charge to Full Now"
   - Charge Limit is set — Settings → Battery → Battery Health → toggle
   - Thermal pause — Mac is too hot (cite [102589](https://support.apple.com/en-us/102589))
   - Battery service needed — check Battery Health status
7. **FAQ** (~250 words): Schema markup
   - "Does OBC work if my schedule changes?" → Partially; ML retrains slowly
   - "Should I turn OBC off?" → No, unless using a hard cap instead
   - "Does it work on Intel MacBooks?" → Yes, 2018+ (T2 chip needed)
   - "Why is OBC not working on my new Mac?" → 14-day learning period

### Headline candidates
- A: "Optimized Battery Charging on Mac, explained — and where it falls short"
- B: "What is Optimized Battery Charging on a MacBook? (And does it actually work?)"
- **Pick A** — captures both queries (explainer + skeptics).

### Meta
- Title: `Optimized Battery Charging on Mac: explained — and where it falls short` (70)
- Description: `Apple's OBC uses on-device ML to delay charging past 80%. Here's how it actually works, where it falls short, and what to do about the gaps.` (143)

---

## Internal linking map (for cross-post linking)

```
should-i-keep-plugged-in ──→ /glossary/optimized-battery-charging
                       ──→ /glossary/cycle-count
                       ──→ /features/travel-mode
                       ──→ /features/custom-thresholds
                       ──→ /blog/healthy-cycle-count-macbook
                       ──→ /blog/optimized-battery-charging-explained

healthy-cycle-count   ──→ /glossary/cycle-count
                       ──→ /glossary/battery-health
                       ──→ /features/battery-journal
                       ──→ /blog/should-i-keep-plugged-in

obc-explained          ──→ /glossary/optimized-battery-charging
                       ──→ /features/travel-mode
                       ──→ /features/custom-thresholds
                       ──→ /blog/should-i-keep-plugged-in
```

Every post: 4-6 internal links. Every glossary term referenced gets a backlink from at least one post (lifts /glossary URLs).
