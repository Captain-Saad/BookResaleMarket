import { Search } from "lucide-react";
import Link from "next/link";
import NavDrawer from "@/components/layout/nav-drawer";
import ThemeToggle from "@/components/theme/theme-toggle";
import type { SiteHeaderProps } from "@/lib/types";

const SiteHeader = ({
  siteName,
  homeHref,
  searchHref,
  navLinks,
  labels,
  themeToggleLabel,
}: SiteHeaderProps) => (
  <header className="sticky top-0 z-20 px-4 pt-4">
    <div className="glass glass--2 mx-auto flex max-w-page items-center justify-between gap-4 py-2 ps-5 pe-2">
      <Link href={homeHref} className="font-display text-h3 font-semibold text-ink-1">
        {siteName}
      </Link>
      <div className="flex items-center gap-1">
        <nav aria-label={labels.main} className="hidden lg:block">
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
        <Link
          href={searchHref}
          aria-label={labels.search}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-1 transition-colors hover:bg-glass-3 md:hidden"
        >
          <Search aria-hidden="true" className="size-5" />
        </Link>
        <NavDrawer navLinks={navLinks} labels={labels} />
        <ThemeToggle label={themeToggleLabel} />
      </div>
    </div>
  </header>
);

export default SiteHeader;
