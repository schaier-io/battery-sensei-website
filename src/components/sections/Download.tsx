import { Download as DownloadIcon, Github } from 'lucide-react'

export function Download() {
  return (
    <section id="download" className="zen-section px-6">
      <div className="relative mx-auto max-w-3xl text-center">
        <img
          src="/app-icon.png"
          srcSet="/app-icon-256.png 1x, /app-icon.png 2x"
          alt="Battery Sensei logo"
          className="mx-auto mb-8 h-24 w-24 sm:h-32 sm:w-32 drop-shadow-[0_8px_18px_rgba(28,26,23,0.18)]"
        />
        <p className="font-jp text-base text-hinomaru/80 mb-3 tracking-widest">
          ようこそ
        </p>
        <h2 className="display-title text-3xl font-semibold text-sumi md:text-5xl">
          Bring Sensei home.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-sumi-soft">
          12 MB · single-purpose · respects your time and your battery.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#"
            data-todo="dmg-url"
            className="btn-sumi inline-flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-medium"
          >
            <DownloadIcon className="h-4 w-4" strokeWidth={1.8} />
            Download .dmg
          </a>
          <a
            href="https://github.com/sandro/battery-sensei"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-sumi-soft hover:text-sumi transition-colors"
          >
            <Github className="h-4 w-4" strokeWidth={1.5} />
            Source
          </a>
        </div>
      </div>
    </section>
  )
}
