import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";

const SiteFooter = () => (
  <footer className="px-4 pb-6">
    <div className="glass glass--1 mx-auto flex max-w-page flex-col gap-2 px-6 py-6 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-display text-base font-semibold text-ink-1">{SITE_NAME}</p>
      <p>{SITE_DESCRIPTION}</p>
      <p>
        © {new Date().getFullYear()} {SITE_NAME}
      </p>
    </div>
  </footer>
);

export default SiteFooter;
