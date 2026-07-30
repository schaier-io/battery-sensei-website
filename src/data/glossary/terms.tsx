import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

export type TermLink = {
  /** Either an internal slug (`cycle-count`) for /glossary/<slug>, an
   * internal app path (`/features/travel-mode`, `/blog/<slug>`), or an
   * external URL (`https://support.apple.com/...`). */
  href: string
  label: string
}

export type GlossaryTerm = {
  slug: string
  /** Display title (sentence case). */
  title: string
  /** One-sentence canonical definition. Used as Schema.org DefinedTerm
   * description, OG description, and the lead paragraph on the page. */
  shortDef: string
  /** Long-form body. Plain prose paragraphs as ReactNode children so we
   * can interleave <Link>s and external <a>s for SEO juice. */
  body: () => ReactNode
  /** Related glossary slugs + feature/blog paths. Renders as the
   * "Related" footer. */
  related: TermLink[]
  /** Authoritative sources cited in the body. Renders as the "Sources"
   * footer, with rel="noreferrer" on externals. */
  sources?: TermLink[]
  /** Broader cluster. Drives the grouped headings on the glossary index,
   * so it is required: an uncategorized term would silently vanish from
   * the list rather than land in a fallback bucket nobody maintains. */
  category: 'health' | 'charging' | 'thermal' | 'app-feature'
}

const para = (children: ReactNode) => (
  <p className="text-[1.0625rem] leading-[1.7] text-sumi md:leading-[1.75]">{children}</p>
)

/** Sibling of `para()` for the entries that announce a list. Two bodies used
 * to say "the headline numbers:" or "three reasons to care:" and then deliver
 * one run-on paragraph of bolded lead-ins; the markup now matches the
 * sentence, so the items are countable by eye and by an answer engine. */
const list = (children: ReactNode) => (
  <ul className="ml-1 list-outside list-disc space-y-2 pl-5 text-[1.0625rem] leading-[1.7] text-sumi marker:text-nezumi md:leading-[1.75]">
    {children}
  </ul>
)

const ApplePage = ({ id, label }: { id: string; label: string }) => (
  <a
    href={`https://support.apple.com/en-us/${id}`}
    target="_blank"
    rel="noreferrer"
    className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru-ink hover:decoration-hinomaru/40"
  >
    {label}
  </a>
)

const G = ({ slug, children }: { slug: string; children: ReactNode }) => (
  <Link
    to="/glossary/$slug"
    params={{ slug }}
    className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru-ink hover:decoration-hinomaru/40"
  >
    {children}
  </Link>
)

const F = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="underline decoration-[var(--line-strong)] decoration-1 underline-offset-[4px] transition-colors hover:text-hinomaru-ink hover:decoration-hinomaru/40"
  >
    {children}
  </Link>
)

export const GLOSSARY_TERMS: ReadonlyArray<GlossaryTerm> = [
  {
    slug: 'cycle-count',
    title: 'Cycle count',
    shortDef:
      'One battery cycle equals one full equivalent discharge of your MacBook’s battery. Discharging from 100% to 50%, then charging back, then discharging to 50% again counts as one cycle, not two.',
    category: 'health',
    body: () => (
      <>
        {para(
          <>
            Cycles are cumulative. They don’t reset. macOS counts fractional usage in
            firmware: if you use 30% of capacity each day for four days, that’s roughly
            1.2 cycles total. You never have to track this manually.
          </>,
        )}
        {para(
          <>
            Modern MacBooks (Apple Silicon, plus most 2018+ Intel models) are rated for{' '}
            <strong>1,000 cycles</strong> before capacity is expected to drop below 80%
            of design. Older models were lower; see{' '}
            <G slug="cycle-count-threshold">cycle-count threshold</G> for the per-model
            list.
          </>,
        )}
        {para(
          <>
            One subtlety: the cycle count itself doesn’t damage the battery. It’s a
            measurement, not a cause. What actually ages cells is{' '}
            <em>time at high voltage</em> and <em>heat</em>, not the counter ticking up.
            That’s why a charge limit (Sensei or macOS Sequoia’s built-in) extends
            calendar lifespan even when the cycle count keeps climbing.
          </>,
        )}
        {para(
          <>
            <strong>How to check it on Apple Silicon:</strong> System Settings → Battery
            → click the ⓘ next to Battery Health. The current cycle count appears next
            to “Maximum Capacity.”
          </>,
        )}
      </>
    ),
    related: [
      { href: 'battery-health', label: 'Battery health' },
      { href: 'design-capacity', label: 'Design capacity' },
      { href: 'cycle-count-threshold', label: 'Cycle-count threshold' },
      { href: '/features/battery-journal', label: 'Saga (feature)' },
      { href: '/guides/healthy-cycle-count-macbook', label: "What's a healthy cycle count?" },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/102888',
        label: 'Apple Support: Determine battery cycle count for Mac laptops',
      },
    ],
  },
  {
    slug: 'battery-health',
    title: 'Battery health',
    shortDef:
      'Battery health is the current maximum capacity of your MacBook’s battery, expressed as a percentage of its original design capacity. A new battery starts at 100%; macOS marks it “Service Recommended” at 80%.',
    category: 'health',
    body: () => (
      <>
        {para(
          <>
            Battery health is easy to confuse with <strong>state of charge</strong>,
            which is how full the battery is <em>right now</em>. Health is the ceiling;
            charge is the level. A perfectly healthy battery can be at 12%, and a
            heavily worn one can be at 100%. They’re measuring different things.
          </>,
        )}
        {para(
          <>
            Health drops gradually. A typical curve looks roughly like 95% at 200
            cycles, 88% at 500, and 80% at 1,000 (the design target). Heat and time
            spent at high charge push the curve down faster.
          </>,
        )}
        {para(
          <>
            macOS surfaces two values in Settings → Battery → Battery Health:{' '}
            <strong>Maximum Capacity</strong> (the percentage) and{' '}
            <strong>Condition</strong> (Normal or Service Recommended). Apple replaces
            the battery at no charge if it’s below 80% during a valid AppleCare plan.
            See <ApplePage id="108376" label="Apple’s service notes" />. Below 80%
            doesn’t mean the battery is broken; it just means it holds less of what it
            used to.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'cycle-count', label: 'Cycle count' },
      { href: 'design-capacity', label: 'Design capacity' },
      { href: 'calibration', label: 'Calibration' },
      { href: '/features/battery-journal', label: 'Saga (feature)' },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/108376',
        label: 'Apple Support: If you see battery “Service Recommended” on your Mac',
      },
      {
        href: 'https://support.apple.com/en-us/102589',
        label: 'Apple Support: About battery health management in Mac notebooks',
      },
    ],
  },
  {
    slug: 'design-capacity',
    title: 'Design capacity',
    shortDef:
      'Design capacity is the original mAh (or Wh) capacity your MacBook’s battery was built to hold when new. Current capacity is measured against this baseline to produce the Battery Health percentage.',
    category: 'health',
    body: () => (
      <>
        {para(
          <>
            Design capacity is set at the factory and lives in the battery’s firmware.
            It never changes unless the cell is physically replaced.
          </>,
        )}
        {para(
          <>
            Knowing both design and current capacity gives you Battery Health by simple
            division: <code>current ÷ design × 100</code>. macOS hides design capacity
            from the user; third-party tools, including Battery Sensei, surface it
            alongside the live percentage.
          </>,
        )}
        {para(
          <>
            <strong>Why it matters when buying used:</strong> a Mac advertised at
            “95% capacity” after a third-party battery swap may have a{' '}
            <em>smaller</em> replacement cell. 95% of a reduced design capacity hides
            the real wear. Always check design capacity alongside the percentage.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'battery-health', label: 'Battery health' },
      { href: 'cycle-count', label: 'Cycle count' },
    ],
  },
  {
    slug: 'optimized-battery-charging',
    title: 'Optimized Battery Charging',
    shortDef:
      'Optimized Battery Charging (OBC) is Apple’s on-device feature that uses machine learning to delay charging your MacBook past 80% until it predicts you’ll need a full charge, usually just before you unplug.',
    category: 'charging',
    body: () => (
      <>
        {para(
          <>
            OBC is available on Apple Silicon Macs and Intel Macs with the T2 chip
            (2018 or later). It needs roughly <strong>14 days</strong> of routine
            usage data before it starts deferring charge past 80%. Most users assume
            it’s broken in week one, but it’s simply learning.
          </>,
        )}
        {para(
          <>
            When OBC is actively holding charge, the battery icon in the menu bar
            shows <strong>“Charging On Hold.”</strong> Click the icon and choose{' '}
            <strong>“Charge to Full Now”</strong> to override it for the current
            charge cycle.
          </>,
        )}
        {para(
          <>
            OBC is distinct from <strong>Charge Limit</strong>, the manual cap added
            in macOS Sequoia 15 (80 / 90 / 95 / 100 %). The two compose: Charge Limit
            sets a hard ceiling, OBC opportunistically delays within that ceiling.
            Sensei’s <F to="/features/travel-mode">Travel Mode</F> pauses OBC for the
            trip window and restores it on the auto-reset, so the system doesn’t
            second-guess your flight day.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'travel-mode', label: 'Travel Mode' },
      { href: 'cycle-count', label: 'Cycle count' },
      { href: 'battery-health', label: 'Battery health' },
      { href: '/features/travel-mode', label: 'Travel Mode (feature)' },
      { href: '/guides/optimized-battery-charging-explained', label: 'Deep guide: OBC explained' },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/102338',
        label: 'Apple Support: About Optimized Battery Charging and Charge Limit on Mac',
      },
    ],
  },
  {
    slug: 'travel-mode',
    title: 'Travel Mode',
    shortDef:
      'Travel Mode is Battery Sensei’s one-tap setting for trip days. It lifts your charge cap to 100%, switches to stricter low-battery warnings (30 / 15 / 5%), pauses macOS Optimized Battery Charging, and automatically restores your normal cap the next morning at 9 AM.',
    category: 'app-feature',
    body: () => (
      <>
        {para(
          <>
            Travel Mode exists because the typical pre-flight ritual (“I’ll just
            leave it plugged in tonight to top up”) usually turns into a week or two
            of the laptop sitting at 100% before someone remembers to undo the cap.
            That’s exactly the condition that ages lithium-ion cells fastest.
          </>,
        )}
        {para(
          <>
            The stricter alert thresholds (30 / 15 / 5%) are a deliberate inversion of
            normal etiquette: on a plane, the cost of running flat is higher than the
            cost of one extra notification. Sensei warns earlier and louder for the
            trip window only.
          </>,
        )}
        {para(
          <>
            The 9 AM auto-reset is local time, fired by{' '}
            <code>nextTravelResetDate</code> in the app, not by detecting that you’re
            home, which is unreliable. That means even if you forget to undo it, the
            cap comes back automatically. See{' '}
            <G slug="optimized-battery-charging">Optimized Battery Charging</G> for
            how Travel Mode composes with macOS’s own deferral logic.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'optimized-battery-charging', label: 'Optimized Battery Charging' },
      { href: 'cycle-count', label: 'Cycle count' },
      { href: '/features/travel-mode', label: 'Travel Mode (feature)' },
      { href: '/guides/should-i-keep-macbook-plugged-in', label: 'Should I keep my MacBook plugged in?' },
    ],
  },
  {
    slug: 'thermal-throttling',
    title: 'Thermal throttling',
    shortDef:
      'Thermal throttling is what happens when your MacBook’s chip slows itself down because it’s too hot. The CPU drops below its rated clock speed to avoid damage, and the same heat also pauses battery charging.',
    category: 'thermal',
    body: () => (
      <>
        {para(
          <>
            macOS triggers throttling around <strong>100°C</strong> internal silicon
            temp. When charging pauses for heat (separate from throttling, but
            usually caused by the same condition), the menu bar can read “Not
            Charging” even with the adapter plugged in. The system isn’t broken; it’s
            protecting the cells.
          </>,
        )}
        {para(
          <>
            Heat is also the single biggest accelerator of battery aging.
            Industry-standard estimates put the curve at roughly{' '}
            <strong>+10°C ≈ halved lifespan</strong>. A MacBook left in a hot car or
            charging on a duvet ages its battery measurably faster than one running
            warm on a desk.
          </>,
        )}
        {para(
          <>
            Common causes: dust-clogged vents, sustained 100% CPU load, sun on the
            lid, hot ambient temperature, or a video call that won’t release the GPU.
            Sensei surfaces the live thermal state next to the watts readout. When
            charge holds steady while plugged in, that’s usually why.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'battery-health', label: 'Battery health' },
      { href: 'charge-cycle', label: 'Charge cycle' },
      { href: 'watts-in-out', label: 'Watts in / out' },
      { href: '/features/energy-usage', label: 'Energy usage (feature)' },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/102589',
        label: 'Apple Support: About battery health management in Mac notebooks',
      },
    ],
  },
  {
    slug: 'charge-cycle',
    title: 'Charge cycle',
    shortDef:
      'A charge cycle is the full equivalent of using 100% of your battery’s capacity, in any combination. Two days at 50% drained each equals one cycle. Five days at 20% equals one cycle.',
    category: 'health',
    body: () => (
      <>
        {para(
          <>
            “Charge cycle” gets confused with “plug-in event” constantly. They’re
            unrelated. Plugging in five times in one day adds zero cycles if you
            barely used the battery. Using 80% of capacity over one long meeting then
            charging fully adds 0.8 cycles.
          </>,
        )}
        {para(
          <>
            macOS tallies fractional cycles in battery firmware, so you never see the
            decimals. The headline <G slug="cycle-count">cycle count</G> rounds when
            it ticks over to the next integer.
          </>,
        )}
        {para(
          <>
            Cycles count toward the battery’s rated lifetime, but the real wear comes
            from <em>heat</em> and <em>time at high state of charge</em>. A charge
            limit at 80% doesn’t directly slow cycle accumulation; it reduces voltage
            stress per cycle, so capacity stays above the 80% Service Recommended
            threshold for more cycles total.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'cycle-count', label: 'Cycle count' },
      { href: 'battery-health', label: 'Battery health' },
    ],
  },
  {
    slug: 'calibration',
    title: 'Battery calibration',
    shortDef:
      'Battery calibration is the process of re-aligning your MacBook’s charge gauge with the battery’s actual capacity. Modern Apple Silicon MacBooks calibrate automatically. Manual calibration is unnecessary and can shorten lifespan.',
    category: 'health',
    body: () => (
      <>
        {para(
          <>
            The “drain to 0%, charge to 100%, leave for five hours” ritual you’ll
            find on older forums is left over from{' '}
            <strong>NiCd / NiMH chemistry</strong> that hasn’t shipped in a MacBook
            since 2008. Lithium-ion doesn’t suffer from memory effect and doesn’t
            need full discharges to estimate capacity.
          </>,
        )}
        {para(
          <>
            On Apple Silicon (M1 and later), macOS continuously tracks individual
            cell behavior through battery firmware and corrects gauge drift silently.
            Manual calibration is only worth doing in two cases: right after
            replacing the battery, or on pre-2019 Intel MacBooks with a visibly
            stuck or wildly inaccurate meter.
          </>,
        )}
        {para(
          <>
            Repeatedly draining a modern MacBook to 0% as a calibration habit just
            spends cycles for no benefit. If you’re reading a guide that recommends
            it, the guide is outdated.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'battery-health', label: 'Battery health' },
      { href: 'cycle-count', label: 'Cycle count' },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/102589',
        label: 'Apple Support: About battery health management in Mac notebooks',
      },
    ],
  },
  {
    slug: 'low-power-mode',
    title: 'Low Power Mode',
    shortDef:
      'Low Power Mode is a macOS setting that reduces processor speed, display brightness, and background activity to extend battery life. Available on MacBooks running macOS Monterey or later.',
    category: 'charging',
    body: () => (
      <>
        {para(
          <>
            Find it in System Settings → Battery → the Energy Mode menus. macOS keeps
            separate settings for <strong>On battery</strong> and{' '}
            <strong>On power adapter</strong>, so you can stay in High Power when
            plugged in and only drop into Low Power on the move.
          </>,
        )}
        {para(
          <>
            Sequoia 15.1 added a third use case for Low Power Mode (reducing fan
            noise during quiet work) and surfaced it in Control Center. The trade-off
            stays the same: longer runtime, a slight latency cost on app launch, a
            dimmer screen.
          </>,
        )}
        {para(
          <>
            Low Power Mode affects power <em>use</em>; charge limiting affects how the
            battery is <em>charged</em>. They’re complementary, not competing. Pair
            LPM with Sensei’s{' '}
            <F to="/features/alert-presets">alert presets</F> so longer battery life
            doesn’t mean later warnings. Heavy customizers can edit each tier’s
            threshold under <F to="/features/custom-thresholds">custom thresholds</F>.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'thermal-throttling', label: 'Thermal throttling' },
      { href: '/features/alert-presets', label: 'Alert presets (feature)' },
      { href: '/features/custom-thresholds', label: 'Custom thresholds (feature)' },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/101613',
        label: 'Apple Support: About Power Modes on your Mac',
      },
    ],
  },
  {
    slug: 'cycle-count-threshold',
    title: 'Cycle-count threshold',
    shortDef:
      'The cycle-count threshold is the number of charge cycles your specific MacBook is rated for before capacity is expected to fall below 80%. Modern MacBooks (Apple Silicon and 2018+ Intel) are rated for 1,000 cycles.',
    category: 'health',
    body: () => (
      <>
        {para(
          <>
            Apple publishes a per-model table on its support site. The headline
            numbers:
          </>,
        )}
        {list(
          <>
            <li>
              <strong>Apple Silicon (M1-M4):</strong> 1,000 cycles across the entire
              lineup.
            </li>
            <li>
              <strong>Intel 2018-2019:</strong> 1,000.
            </li>
            <li>
              <strong>Intel 2010-2017:</strong> 1,000 for most, with 500-cycle
              outliers (some MacBook Air 13" Mid 2010 and Late 2017 units).
            </li>
            <li>
              <strong>Pre-2010:</strong> 300 cycles.
            </li>
          </>,
        )}
        {para(
          <>
            Reaching the threshold doesn’t kill the Mac. macOS surfaces a “Service
            Recommended” notice, but the laptop keeps working at reduced runtime.
            Many cells hold up well past the design target; Sensei’s{' '}
            <F to="/features/battery-journal">Saga page</F> shows the curve over time
            so you can see how yours is actually trending.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'cycle-count', label: 'Cycle count' },
      { href: 'battery-health', label: 'Battery health' },
    ],
    sources: [
      {
        href: 'https://support.apple.com/en-us/102888',
        label: 'Apple Support: Determine battery cycle count for Mac laptops',
      },
    ],
  },
  {
    slug: 'trickle-charging',
    title: 'Trickle charging',
    shortDef:
      'Trickle charging is feeding a small continuous current to a fully charged battery to compensate for self-discharge. Modern MacBooks don’t trickle-charge. Once the cell is full, charging stops, and resumes only when capacity drops several percent.',
    category: 'charging',
    body: () => (
      <>
        {para(
          <>
            Old laptops trickle-charged continuously, which contributed measurably to
            battery wear over years of always-plugged use. Apple’s charge controller
            cuts charging at the top of the curve and waits for natural drop before
            resuming.
          </>,
        )}
        {para(
          <>
            That waiting window is why a plugged-in MacBook routinely shows{' '}
            <strong>“Not Charging”</strong> at 96-100% even with the adapter
            connected. The behavior is intentional. It’s also why{' '}
            <G slug="optimized-battery-charging">Optimized Battery Charging</G> can
            extend the window deliberately. Once you’re near full, the system is
            already holding by default.
          </>,
        )}
      </>
    ),
    related: [
      { href: 'optimized-battery-charging', label: 'Optimized Battery Charging' },
      { href: 'battery-health', label: 'Battery health' },
    ],
  },
  {
    slug: 'watts-in-out',
    title: 'Watts in / out',
    shortDef:
      'Watts in / out is the real-time rate of energy flowing into or out of your MacBook’s battery, in watts. Positive watts in = charging; positive watts out = running on battery; near-zero balance = the system is pulling exactly what the adapter provides.',
    category: 'charging',
    body: () => (
      <>
        {para(
          <>
            macOS doesn’t surface this number natively, only the abstracted “time
            until full” or “time on battery” estimate. Sensei reads the wattage
            directly via IOKit and shows it live in the menu bar.
          </>,
        )}
        {para(<>Three reasons to care about the raw watts number:</>)}
        {list(
          <>
            <li>
              <strong>Diagnosing an underpowered adapter.</strong> If the laptop
              pulls more than the adapter supplies under load, the balance is zero
              or negative, and the battery drains while plugged in. Watts in / out
              makes this visible in seconds.
            </li>
            <li>
              <strong>Spotting a hung app.</strong> When watts-out spikes with no
              obvious cause, an app is doing background work it shouldn’t be. Pair
              with <F to="/features/energy-usage">energy usage</F> to identify the
              culprit.
            </li>
            <li>
              <strong>Validating charging speed.</strong> MacBook Pro 14" typically
              charges at 60-96W; lower numbers point to a weak adapter, a cheap
              cable, or a thermally throttled charge port.
            </li>
          </>,
        )}
      </>
    ),
    related: [
      { href: 'thermal-throttling', label: 'Thermal throttling' },
      { href: '/features/energy-usage', label: 'Energy usage (feature)' },
    ],
  },
]

export const TERMS_BY_SLUG: Readonly<Record<string, GlossaryTerm>> = Object.freeze(
  Object.fromEntries(GLOSSARY_TERMS.map((t) => [t.slug, t])),
)
