/**
 * Mock "Rescue Receipt" — the shareable card Sensei produces after a
 * critical-low intervention succeeds. Pure SVG/HTML, no external assets.
 * Sits inside the kakejiku FrameBorder in the Saga section.
 */
export function RescueReceipt({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex flex-col gap-3 rounded-md bg-[color-mix(in_oklab,var(--washi)_85%,white)] p-5 shadow-[0_18px_50px_-20px_rgba(28,26,23,0.45)] ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent 0 27px, rgba(28,26,23,0.04) 27px 28px)',
        clipPath:
          'polygon(0 6px, 4px 0, 12px 4px, 20px 0, 28px 4px, 36px 0, 100% 0, 100% 100%, 36px 100%, 28px calc(100% - 4px), 20px 100%, 12px calc(100% - 4px), 4px 100%, 0 calc(100% - 6px))',
      }}
      aria-label="Rescue Receipt — Sensei intervention successful"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="font-jp text-[10px] tracking-[0.3em] text-sumi-soft uppercase">
          物 語 · #014
        </span>
        <span className="text-[10px] tracking-wider text-nezumi">
          14:32 · Mar 4
        </span>
      </div>

      {/* Headline */}
      <div>
        <h3 className="display-title text-[1.05rem] font-semibold leading-tight text-sumi">
          Intervention
          <span className="block italic text-sumi-soft font-normal">
            successful.
          </span>
        </h3>
      </div>

      {/* Battery dial */}
      <div className="flex items-end gap-3">
        <div>
          <p className="display-title text-[2.4rem] font-semibold leading-none text-sumi">
            12<span className="text-sumi-soft text-xl">%</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-nezumi">
            Lowest reached
          </p>
        </div>
        <div className="flex-1">
          {/* Sparkbar showing rescue path: drops to 12 then climbs */}
          <svg
            viewBox="0 0 80 26"
            className="h-7 w-full text-sumi-soft"
            aria-hidden
          >
            <path
              d="M 2 6 L 12 9 L 22 14 L 32 18 L 42 22 L 50 18 L 58 12 L 68 7 L 78 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="42" cy="22" r="2" fill="var(--hinomaru)" />
          </svg>
          <p className="mt-1 text-right text-[9px] tracking-wider text-nezumi">
            12% → 87%  ·  28 min
          </p>
        </div>
      </div>

      {/* Quote line */}
      <p className="font-jp text-[11px] leading-snug text-sumi-soft">
        静かに、電池に寄り添う。
      </p>

      {/* Footer with hanko */}
      <div className="mt-1 flex items-center justify-between border-t border-dashed border-[var(--line-strong)] pt-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-sumi-soft">
            Sensei
          </span>
          <span className="display-title text-xs font-semibold text-sumi">
            Battery saved.
          </span>
        </div>
        {/* mini hanko */}
        <span
          className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-hinomaru font-jp text-base font-bold text-[#fff8eb] -rotate-3 shadow-sm"
          style={{
            boxShadow:
              'inset 0 0 0 1.5px rgba(255,248,235,0.18), 0 1px 0 rgba(0,0,0,0.04)',
          }}
        >
          救
        </span>
      </div>
    </div>
  )
}
