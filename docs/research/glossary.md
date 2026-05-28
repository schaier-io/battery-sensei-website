# Glossary research — Battery Sensei

12 seed terms. Each: definition (Sensei's own words, plain-English), longer explanation (~150-300 words), related terms, related features, source citations, target keyword.

Format conventions for final pages:
- One canonical sentence at the top (lifted into Schema.org `DefinedTerm.description`).
- 2-4 paragraphs of body.
- "Related" section: 3-5 internal links.
- "Sources" section if citing Apple docs.

---

## 1. cycle-count

- **Primary keyword**: macbook cycle count (10-15k/mo)
- **Definition**: One battery cycle equals one full equivalent discharge of your MacBook's battery. Discharging from 100% to 50%, then charging back, then discharging to 50% again counts as one cycle — not two.
- **Body** (~250 words):
  - Cycles are cumulative. They don't reset.
  - macOS counts fractional usage; if you use 30% of capacity each day for 4 days, that's roughly 1.2 cycles total.
  - Modern MacBooks (2018+) are rated for **1,000 cycles** before capacity is expected to drop below 80% of design.
  - Older models had lower limits (300 or 500).
  - The cycle count itself doesn't damage the battery — it's a measurement, not a cause. What ages cells is **time at high voltage** and **heat**, not the cycle counter ticking.
  - How to check: Settings → Battery → Battery Health → ⓘ
- **Source**: [Apple Support 102888](https://support.apple.com/en-us/102888)
- **Related**: [[battery-health]], [[design-capacity]], [[charge-cycle]], /features/battery-journal, /blog/healthy-cycle-count-macbook

## 2. battery-health

- **Primary keyword**: macbook battery health (high volume, ~25k/mo)
- **Definition**: Battery health is the current maximum capacity of your MacBook's battery, expressed as a percentage of its original design capacity. A new battery starts at 100%. When it reaches 80%, macOS marks it "Service Recommended."
- **Body** (~250 words):
  - Not to be confused with **state of charge** (how full it is right now)
  - Drops gradually with use; expected curve: ~95% at 200 cycles, ~88% at 500, ~80% at 1,000
  - macOS shows two values: Maximum Capacity and Condition (Normal / Service Recommended)
  - Apple replaces under AppleCare if below 80% during plan validity
  - Health below 80% does NOT mean the battery is broken — it just means it holds less of what it used to
- **Source**: [Apple Support 108376](https://support.apple.com/en-us/108376), [Apple Support 102589](https://support.apple.com/en-us/102589)
- **Related**: [[cycle-count]], [[design-capacity]], [[calibration]], /features/battery-journal

## 3. design-capacity

- **Primary keyword**: macbook design capacity battery
- **Definition**: Design capacity is the original mAh (or Wh) capacity your MacBook's battery was built to hold when new. Current capacity is measured against this baseline to produce the Battery Health percentage.
- **Body** (~180 words):
  - Lives in the battery's firmware; set at manufacture
  - Doesn't change over time (unless service replaces the cell)
  - Knowing it lets you compute Battery Health: `current ÷ design × 100`
  - macOS hides this from the user; third-party tools (including Battery Sensei) surface it
  - Useful when buying used: a Mac advertised at "95% capacity" with a swapped (smaller) replacement cell will hide the real wear
- **Related**: [[battery-health]], [[cycle-count]]

## 4. optimized-battery-charging

- **Primary keyword**: optimized battery charging mac (~8k/mo)
- **Definition**: Optimized Battery Charging (OBC) is Apple's on-device feature that uses machine learning to delay charging your MacBook past 80% until it predicts you'll need a full charge — usually right before you unplug.
- **Body** (~280 words):
  - Available on Apple Silicon Macs and Intel Macs with the T2 chip (2018+)
  - Requires a 14-day learning period before activating
  - When deferring, the menu bar shows "Charging On Hold"
  - Override: click the battery icon → "Charge to Full Now"
  - Adaptive: if your routine is predictable, OBC delays past 80% reliably; if not, it stays at 100%
  - Distinct from **Charge Limit** (Sequoia 15+, manual 80/90/95/100 cap)
  - Pauses automatically when you set Sensei's Travel Mode (we want a full charge for the trip)
- **Source**: [Apple Support 102338](https://support.apple.com/en-us/102338)
- **Related**: [[travel-mode]], [[cycle-count]], [[battery-health]], /features/travel-mode, /blog/optimized-battery-charging-explained

## 5. travel-mode

- **Primary keyword**: travel mode mac battery (low volume but high intent — Sensei-specific)
- **Definition**: Travel Mode is Battery Sensei's one-tap setting for trip days. It temporarily lifts your charge cap to 100%, switches to stricter low-battery warnings (30 / 15 / 5%), pauses macOS Optimized Battery Charging, and automatically returns to your normal cap the next morning at 9 AM.
- **Body** (~220 words):
  - Solves the "I'll just leave it plugged in tonight before my flight" problem — and then it ages at 100% for a week
  - Stricter alert thresholds because the cost of running flat on a plane > the cost of an extra notification
  - Auto-reset eliminates the most common failure mode: forgetting to undo the cap raise
  - Compatible with OBC (Sensei pauses it during the window, then unpauses)
- **Related**: [[optimized-battery-charging]], [[cycle-count]], /features/travel-mode, /blog/should-i-keep-plugged-in

## 6. thermal-throttling

- **Primary keyword**: macbook thermal throttling (~5k/mo)
- **Definition**: Thermal throttling is what happens when your MacBook's chip slows itself down because it's too hot. The CPU drops below its rated clock speed to avoid damage; the same heat also pauses battery charging.
- **Body** (~240 words):
  - macOS triggers throttling around 100°C internal silicon temp
  - When charging is paused for heat, the menu bar can show "Not Charging" even with the adapter plugged in
  - Heat is also the single biggest accelerator of battery aging — +10°C ≈ halved lifespan
  - Common causes: dust-clogged vents, hot ambient temp, sustained 100% CPU load, sun on the lid
  - Visual cue in Sensei: when charge holds steady while plugged in, Sensei surfaces the thermal-pause reason instead of leaving you guessing
- **Source**: [Apple Support 102589](https://support.apple.com/en-us/102589)
- **Related**: [[battery-health]], [[charge-cycle]], /features/energy-usage

## 7. charge-cycle

- **Primary keyword**: what is a charge cycle (~6k/mo)
- **Definition**: A charge cycle is the full equivalent of using 100% of your battery's capacity, in any combination. Two days at 50% drained each = one cycle. Five days at 20% = one cycle.
- **Body** (~200 words):
  - Often confused with "plug-in event" — they're unrelated
  - macOS tallies fractional cycles in firmware; you never have to track manually
  - Cycles count toward the battery's rated lifetime, but the *real* wear comes from heat and time at high state-of-charge
  - Charge limit at 80% won't slow cycle accumulation directly, but reduces voltage stress per cycle
- **Related**: [[cycle-count]], [[battery-health]]

## 8. calibration

- **Primary keyword**: macbook battery calibration (~3k/mo, mostly outdated info)
- **Definition**: Battery calibration is the process of re-aligning your MacBook's charge gauge with the battery's actual capacity. Modern Apple Silicon MacBooks (M1 and later) calibrate automatically — manual calibration is unnecessary and may even shorten battery life.
- **Body** (~220 words):
  - Old NiCd / NiMH batteries (pre-2008) needed regular full-discharge calibration. Lithium-ion does not.
  - macOS continuously tracks cells through firmware; gauge drift is corrected silently
  - The "drain to 0%, charge to 100%, leave for 5 hours" ritual you'll find on old forums actively wears the battery faster than just using it normally
  - Manual calibration is only useful: (a) after replacing the battery, (b) on Intel MacBooks from 2019 or earlier with a stuck/inaccurate meter
- **Source**: [Apple Support 102589](https://support.apple.com/en-us/102589)
- **Related**: [[battery-health]], [[cycle-count]]

## 9. low-power-mode

- **Primary keyword**: macos low power mode (~4k/mo)
- **Definition**: Low Power Mode is a macOS setting that reduces processor speed, display brightness, and background activity to extend battery life. Available on MacBooks running macOS Monterey or later.
- **Body** (~200 words):
  - Settings → Battery → Low Power Mode pop-up (separate settings for "On battery" / "On power adapter")
  - macOS Sequoia 15.1+ added a third "Quiet" use case (reduce fan noise)
  - Trade-off: longer runtime, slightly slower app launch, dimmer screen
  - Different from charge limiting — LPM affects power *use*; charge limit affects *charging*
  - Pairs well with Sensei's low-battery presets (LPM stretches runtime, alerts make sure you don't get caught)
- **Source**: [Apple Support 101613](https://support.apple.com/en-us/101613)
- **Related**: [[thermal-throttling]], /features/alert-presets

## 10. cycle-count-threshold

- **Primary keyword**: macbook cycle count limit
- **Definition**: The cycle count threshold is the number of charge cycles your specific MacBook is rated for before capacity is expected to fall below 80%. Modern MacBooks (Apple Silicon and 2018+ Intel) are rated for 1,000 cycles.
- **Body** (~180 words):
  - Apple Silicon MacBooks (M1–M4): **1,000 cycles**
  - 2010–2018 Intel: 1,000 (most), 500 for some MBA 13" Mid 2010 / Late 2017
  - Pre-2010: 300 cycles
  - At the threshold, macOS may show "Service Recommended" — but the Mac still works
  - The threshold is a design target, not a death sentence; many batteries last beyond it at lower capacity
- **Source**: [Apple Support 102888](https://support.apple.com/en-us/102888)
- **Related**: [[cycle-count]], [[battery-health]]

## 11. trickle-charging

- **Primary keyword**: trickle charging battery laptop
- **Definition**: Trickle charging is the practice of feeding a small current to a fully charged battery to compensate for self-discharge. Modern MacBooks do not trickle-charge: once the cell is full, charging stops, and only resumes when capacity drops about 5%.
- **Body** (~180 words):
  - Old laptops trickle-charged continuously, which contributed to battery wear
  - Apple's charge controller cuts charging at ~100% and waits for natural drop
  - This is why a plugged-in MacBook can show "Not Charging" at 96-100% even while connected
  - Optimized Battery Charging extends this idle window deliberately
- **Related**: [[optimized-battery-charging]], [[battery-health]]

## 12. watts-in-out

- **Primary keyword**: macbook power draw watts (low volume but useful for users investigating charging issues)
- **Definition**: Watts in/out is the real-time rate of energy flowing into or out of your MacBook's battery, measured in watts. Positive watts in = charging; positive watts out = running on battery; near-zero = balanced (system pulling exactly what the adapter provides).
- **Body** (~200 words):
  - macOS doesn't show this natively — only "Time until full" or "Time on battery"
  - Sensei surfaces live watts in/out in the menu bar
  - Use cases:
    - Diagnosing a weak adapter (laptop pulls more than adapter supplies → balance is zero / negative → battery drains while plugged in)
    - Spotting hung apps (watts out spikes for no visible reason)
    - Validating MagSafe vs USB-C charging speed
  - Typical MacBook Pro 14" charging: 60-96W in; idle 5-12W out; heavy load 30-50W out
- **Related**: [[thermal-throttling]], /features/energy-usage

---

## Internal linking matrix

Each term links to: 2-4 other glossary terms + 1-2 feature pages + 0-1 blog posts.

Coverage check:
- /features/travel-mode is linked from: travel-mode, optimized-battery-charging
- /features/battery-journal is linked from: cycle-count, battery-health
- /features/custom-thresholds is linked from: (none — add cross-link from low-power-mode)
- /features/alert-presets is linked from: low-power-mode
- /features/energy-usage is linked from: thermal-throttling, watts-in-out
- /features/meeting-battery-guard is linked from: (none) — leave; low organic relevance to glossary terms

Adjustment: also link low-power-mode → /features/custom-thresholds to give that feature a backlink.
