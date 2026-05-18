import { Hanko } from '#/components/zen/Hanko'

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] py-14">
      <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-5 text-center">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/app-icon.png"
            srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
            alt="Battery Sensei logo"
            className="h-24 w-24"
          />
          <span className="flex flex-col items-center gap-0.5 leading-none">
            <span className="display-title text-[11px] font-semibold uppercase tracking-[0.18em] text-sumi">
              Battery Sensei
            </span>
            <span className="font-jp text-[10px] tracking-[0.3em] text-nezumi">電池先生</span>
          </span>
        </div>
        <Hanko kanji="禅" />
        <p className="text-xs text-nezumi tracking-wider">
          Crafted with care for MacBooks worldwide. © {new Date().getFullYear()}.
        </p>
      </div>
    </footer>
  )
}
