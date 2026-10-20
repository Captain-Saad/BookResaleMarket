import Link from "next/link";
import ThemeToggle from "@/components/theme/theme-toggle";
import type { SiteHeaderProps } from "@/lib/types";

const SiteHeader = ({ siteName, navLinks, themeToggleLabel }: SiteHeaderProps) => (
  <header className="sticky top-0 z-20 px-4 pt-4">
    <div className="glass glass--2 mx-auto flex max-w-page items-center justify-between gap-4 py-2 ps-5 pe-2">
      <Link href="/" className="font-display text-h3 font-semibold text-ink-1">
        {siteName}
      </Link>
      <div className="flex items-center gap-1">
        <nav aria-label="Main" className="hidden sm:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle label={themeToggleLabel} />
      </div>
    </div>
  </header>
);

export default SiteHeader;
