import type { ReactNode } from "react";
import type { PRIMARY_NAV } from "@/lib/constants";

export enum Theme {
  Dark = "dark",
  Light = "light",
}

export type ChildrenProps = Readonly<{ children: ReactNode }>;

export type NavLink = { href: string; label: string };

export type Book = { isbn: string; coverId: number; title: string; author: string };

export type Shelf = { id: string; title: string; books: readonly Book[] };

export type Step = { title: string; description: string };

export type NavLabels = {
  main: string;
  search: string;
  openMenu: string;
  closeMenu: string;
  menuTitle: string;
};

export type SiteHeaderProps = {
  siteName: string;
  homeHref: string;
  searchHref: string;
  navLinks: readonly NavLink[];
  labels: NavLabels;
  themeToggleLabel: string;
};

export type SiteFooterProps = { siteName: string; description: string };

export type HeroProps = {
  title: string;
  subtitle: string;
  primaryCta: NavLink;
  secondaryCta: NavLink;
};

export type BookShelfProps = { shelf: Shelf; coverSizes: string };

export type BookCoverProps = { coverId: number; title: string; author: string; sizes: string };

export type HowItWorksProps = { id: string; title: string; steps: readonly Step[] };

export type ThemeToggleProps = { label: string };

export type PrimaryNavItem = (typeof PRIMARY_NAV)[number];

export type BottomTabBarProps = { navItems: readonly PrimaryNavItem[]; label: string };

export type NavDrawerProps = { navLinks: readonly NavLink[]; labels: NavLabels };

export type PlaceholderPageProps = { title: string; description: string; homeLink: NavLink };

export type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};
