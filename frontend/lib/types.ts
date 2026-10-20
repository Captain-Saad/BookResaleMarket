export enum Theme {
  Dark = "dark",
  Light = "light",
}

export type NavLink = { href: string; label: string };

export type Book = { isbn: string; coverId: number; title: string; author: string };

export type Shelf = { id: string; title: string; books: readonly Book[] };

export type Step = { title: string; description: string };

export type SiteHeaderProps = {
  siteName: string;
  navLinks: readonly NavLink[];
  themeToggleLabel: string;
};

export type SiteFooterProps = { siteName: string; description: string };

export type HeroProps = {
  title: string;
  subtitle: string;
  primaryCta: NavLink;
  secondaryCta: NavLink;
};

export type BookShelfProps = { shelf: Shelf };

export type BookCoverProps = { coverId: number; title: string; author: string; sizes: string };

export type HowItWorksProps = { id: string; title: string; steps: readonly Step[] };

export type ThemeToggleProps = { label: string };
