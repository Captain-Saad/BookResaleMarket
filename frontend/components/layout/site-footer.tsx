import type { SiteFooterProps } from "@/lib/types";

const SiteFooter = ({ siteName, description }: SiteFooterProps) => (
  <footer className="px-4 pb-6">
    <div className="glass glass--1 mx-auto flex max-w-page flex-col gap-2 px-6 py-6 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-display text-base font-semibold text-ink-1">{siteName}</p>
      <p>{description}</p>
      <p>
        © {new Date().getFullYear()} {siteName}
      </p>
    </div>
  </footer>
);

export default SiteFooter;
