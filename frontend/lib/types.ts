import type { Dialog, Select as SelectPrimitive, Toast as ToastPrimitive } from "radix-ui";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { PRIMARY_NAV } from "@/lib/constants";

export enum Theme {
  Dark = "dark",
  Light = "light",
}

export enum ToastTone {
  Neutral = "neutral",
  Success = "success",
  Danger = "danger",
}

export enum HealthStatus {
  Checking = "checking",
  Online = "online",
  Offline = "offline",
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

export type SelectOption = { value: string; label: string };

export type SelectProps = ComponentProps<typeof SelectPrimitive.Root> & {
  id?: string;
  options: readonly SelectOption[];
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
};

type OverlayProps = ComponentProps<typeof Dialog.Root> & {
  trigger?: ReactNode;
  title: string;
  description?: string;
  closeLabel: string;
  className?: string;
};

export type ModalProps = OverlayProps;

export type DrawerProps = OverlayProps & { side?: "end" | "bottom" };

export type ToastProps = ComponentProps<typeof ToastPrimitive.Root> & {
  title: string;
  description?: string;
  dismissLabel: string;
  tone?: ToastTone;
};

export type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
};

export type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export type HealthBadgeProps = {
  labels: Readonly<Record<HealthStatus, string>>;
  tones: Readonly<Record<HealthStatus, "neutral" | "success" | "danger">>;
};
