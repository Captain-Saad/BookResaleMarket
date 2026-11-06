import type { components } from "@bookloop/api-client/schema";
import type { Dialog, Select as SelectPrimitive, Toast as ToastPrimitive } from "radix-ui";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
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

export enum AuthFormId {
  Login = "login",
  Register = "register",
  ForgotPassword = "forgot-password",
  ResetPassword = "reset-password",
  ResendVerification = "resend-verification",
  ChangePassword = "change-password",
}

export enum VerifyEmailStatus {
  Pending = "pending",
  Verified = "verified",
  Invalid = "invalid",
}

export enum LoadStatus {
  Loading = "loading",
  Ready = "ready",
  Failed = "failed",
}

export enum SaveStatus {
  Idle = "idle",
  Saved = "saved",
  Failed = "failed",
}

export enum UserRole {
  Buyer = "buyer",
  Seller = "seller",
  Warehouse = "warehouse",
  Courier = "courier",
  Dispatcher = "dispatcher",
  Admin = "admin",
}

export enum ProblemCode {
  AccountSuspended = "account_suspended",
}

export enum SellerVerificationStatus {
  NotStarted = "not_started",
  Pending = "pending",
  Verified = "verified",
  Rejected = "rejected",
}

export type ApiOutcome<T> = { data?: T; error?: unknown; response: Response };

export type Account = components["schemas"]["AccountResponse"];

export type Address = components["schemas"]["AddressResponse"];

export type AddressRequest = components["schemas"]["AddressRequest"];

export type AccountUpdateRequest = components["schemas"]["AccountUpdateRequest"];

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

export type AppShellProps = ChildrenProps & {
  siteName: string;
  description: string;
  homeHref: string;
  searchHref: string;
  navItems: readonly PrimaryNavItem[];
  labels: NavLabels;
  themeToggleLabel: string;
};

export type PlaceholderPageProps = {
  title: string;
  description: string;
  homeLink: NavLink;
  narrow?: boolean;
};

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

export type ErrorCardProps = {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
};

export type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export type AuthFormValues = Record<string, string>;

export type FormFieldConfig = {
  name: string;
  label: string;
  type: "email" | "password" | "text" | "tel";
  autoComplete: string;
  hint?: string;
};

export type FormFieldsProps = {
  form: UseFormReturn<AuthFormValues>;
  fields: readonly FormFieldConfig[];
  idPrefix: string;
};

export type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export type ProblemMessages = Readonly<Record<string, string>> & { default: string };

export type AuthFormCopy = {
  title: string;
  description: string;
  submitLabel: string;
  fields: readonly FormFieldConfig[];
  successMessage?: string;
  links: readonly NavLink[];
};

export type AuthFormProps = {
  formId: AuthFormId;
  copy: AuthFormCopy;
  errorMessages: ProblemMessages;
  token?: string;
  successHref?: string;
  suspendedHref?: string;
};

export type UseAuthFormOptions = Omit<AuthFormProps, "copy">;

export type LoginPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export type TokenPageProps = { searchParams: Promise<{ token?: string | string[] }> };

export type VerifyEmailCopy = Readonly<Record<VerifyEmailStatus, string>> & {
  title: string;
  loginLink: NavLink;
};

export type VerifyEmailStatusProps = { token: string; copy: VerifyEmailCopy };

export type RoleNavLink = NavLink & { role: UserRole };

export type RouteGuard = { prefix: string; role?: UserRole };

export type AccountNavProps = {
  label: string;
  links: readonly NavLink[];
  roleLinks: readonly RoleNavLink[];
  signOutLabel: string;
};

export type AccountCopy = {
  loading: string;
  loadFailed: string;
  retry: string;
  saved: string;
  saveFailed: string;
};

export type ResourceStateProps = {
  status: LoadStatus;
  copy: Pick<AccountCopy, "loading" | "loadFailed" | "retry">;
  onRetry: () => void;
};

export type ProfileFormCopy = AccountCopy & {
  title: string;
  emailLabel: string;
  emailUnverified: string;
  fields: readonly FormFieldConfig[];
  submitLabel: string;
  passwordLink: NavLink;
};

export type ProfileFormProps = { copy: ProfileFormCopy };

export type AddressManagerCopy = AccountCopy & {
  title: string;
  empty: string;
  addLabel: string;
  editLabel: string;
  deleteLabel: string;
  closeLabel: string;
  formTitle: string;
  submitLabel: string;
  cancelLabel: string;
  deleteTitle: string;
  deleteDescription: string;
  fields: readonly FormFieldConfig[];
};

export type AddressManagerProps = { copy: AddressManagerCopy };

export type SellerPanelCopy = AccountCopy & {
  title: string;
  becomeDescription: string;
  becomeLabel: string;
  startLabel: string;
  statusLabel: string;
  startableStatuses: readonly string[];
  statuses: Readonly<Record<SellerVerificationStatus, { badge: string; description: string }>>;
};

export type SellerPanelProps = { copy: SellerPanelCopy };
