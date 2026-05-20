import { Hanko } from '#/components/zen/Hanko'

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--line)] py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center">
        <div className="flex items-center gap-3">
          <img
            src="/app-icon.png"
            srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
            alt=""
            aria-hidden
            className="h-12 w-12"
          />
          <span className="flex flex-col items-start gap-[3px] leading-none">
            <span className="display-title text-[12px] font-semibold uppercase tracking-[0.22em] text-sumi">
              Battery Sensei
            </span>
            <span className="font-jp text-[10px] tracking-[0.36em] text-hinomaru/70">
              電池先生
            </span>
          </span>
        </div>

        <span aria-hidden className="block h-px w-12 bg-[var(--line-strong)]" />

        <Hanko kanji="禅" />

        <p className="max-w-md text-xs tracking-[0.12em] text-nezumi uppercase">
          Made by a MacBook owner, for MacBook owners
        </p>
        <p className="text-[11px] tracking-wider text-nezumi">
          © {new Date().getFullYear()} · Battery Sensei
          <span className="mx-2 text-nezumi/60" aria-hidden>·</span>
          <time dateTime="2026-05-20">Last updated 20 May 2026</time>
        </p>
      </div>
    </footer>
  )
}
