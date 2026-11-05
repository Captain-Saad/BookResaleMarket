import { Package, Search, Tag, User } from "lucide-react";

import { AuthFormId, HealthStatus, ToastTone, VerifyEmailStatus } from "@/lib/types";

export const SITE_NAME = "BookLoop";
export const SITE_DESCRIPTION = "Buy and sell used books.";

export const THEME_STORAGE_KEY = "bookloop-theme";

export const THEME_TOGGLE_LABEL = "Toggle color theme";

export const OPEN_LIBRARY_COVER_URL = "https://covers.openlibrary.org/b/id";

export const COVER_SIZES = "(min-width: 64rem) 176px, (min-width: 30rem) 144px, 128px";

export const AURORA_ORB_CLASSES =
  "absolute aspect-square rounded-full blur-[80px] motion-reduce:animate-none";

export const SECTION_IDS = { shelves: "shelves", howItWorks: "how-it-works" } as const;

export const ROUTES = {
  home: "/",
  search: "/search",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  verifyEmail: "/verify-email",
  suspended: "/suspended",
} as const;

export const PRIMARY_NAV = [
  { id: "browse", href: ROUTES.search, label: "Browse" },
  { id: "sell", href: "/sell", label: "Sell" },
  { id: "orders", href: "/orders", label: "Orders" },
  { id: "account", href: ROUTES.login, label: "Account" },
] as const;

export const NAV_ICONS = { browse: Search, sell: Tag, orders: Package, account: User } as const;

export const PLACEHOLDER_PAGES = {
  search: { title: "Search", description: "Search and filters arrive in slice S3." },
  orders: { title: "Your orders", description: "Order history and tracking arrive in slice S8." },
  sell: { title: "Sell a book", description: "The listing wizard arrives in slice S2." },
  warehouse: { title: "Warehouse console", description: "The staff console arrives in slice S6." },
  courier: { title: "Courier app", description: "Pickup and delivery tasks arrive in slice S7." },
  admin: { title: "Admin console", description: "Operations and disputes arrive in slice S10." },
  suspended: {
    title: "Account suspended",
    description:
      "Your account has been suspended, so you can't buy or sell right now. Please contact support if you think this is a mistake.",
  },
  notFound: { title: "Page not found", description: "This page doesn't exist or has moved." },
} as const;

export const HERO = {
  title: "Buy and sell used books",
  subtitle:
    "Every book's condition is verified, and your payment is held until you confirm it arrived.",
  primaryCta: { href: `#${SECTION_IDS.shelves}`, label: "Browse books" },
  secondaryCta: { href: `#${SECTION_IDS.howItWorks}`, label: "How it works" },
} as const;

export const FEATURED_SHELVES_TITLE = "Featured shelves";

export const FEATURED_SHELVES = [
  {
    id: "classics",
    title: "Timeless classics",
    books: [
      {
        isbn: "9780141439518",
        coverId: 12645114,
        title: "Pride and Prejudice",
        author: "Jane Austen",
      },
      { isbn: "9780142437247", coverId: 110556, title: "Moby-Dick", author: "Herman Melville" },
      { isbn: "9780141439471", coverId: 109033, title: "Frankenstein", author: "Mary Shelley" },
      { isbn: "9780141441146", coverId: 109090, title: "Jane Eyre", author: "Charlotte Brontë" },
      {
        isbn: "9780140449136",
        coverId: 14935910,
        title: "Crime and Punishment",
        author: "Fyodor Dostoevsky",
      },
    ],
  },
  {
    id: "modern",
    title: "Modern favourites",
    books: [
      {
        isbn: "9780743273565",
        coverId: 13028546,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
      },
      { isbn: "9780451524935", coverId: 15257377, title: "1984", author: "George Orwell" },
      {
        isbn: "9780061120084",
        coverId: 15162569,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
      },
      { isbn: "9780547928227", coverId: 12003329, title: "The Hobbit", author: "J.R.R. Tolkien" },
      { isbn: "9780307387899", coverId: 14818095, title: "The Road", author: "Cormac McCarthy" },
    ],
  },
] as const;

export const HOW_IT_WORKS_TITLE = "How it works";

export const HOW_IT_WORKS_STEPS = [
  {
    title: "List your book",
    description:
      "Send it to our warehouse, or keep it at home and a courier collects it once it sells.",
  },
  {
    title: "Condition is verified",
    description:
      "Warehouse books are inspected on arrival; pickup books are checked by the courier at collection.",
  },
  {
    title: "Paid safely",
    description:
      "The buyer's payment is held until they confirm the book arrived, or the post-delivery window passes, then released to the seller.",
  },
] as const;

export const NAV_LABELS = {
  main: "Main",
  search: "Search",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  menuTitle: "Menu",
} as const;

export const BADGE_DOT_COLORS = {
  neutral: "bg-ink-3",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
} as const;

export const TOAST_TONE_BORDERS = {
  [ToastTone.Neutral]: "border-s-glass-border",
  [ToastTone.Success]: "border-s-success",
  [ToastTone.Danger]: "border-s-danger",
} as const;

export const OVERLAY_LABELS = { close: "Close", dismiss: "Dismiss" } as const;

export const LOADING_LABEL = "Loading…";

export const BACK_HOME_LINK = { href: ROUTES.home, label: "Back to home" } as const;

export const ERROR_PAGE = {
  title: "Something went wrong",
  description: "Please try again. If it keeps happening, come back later.",
  retryLabel: "Try again",
} as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";
export const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "local";

export const DEV_ROLES = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "warehouse", label: "Warehouse staff" },
  { value: "courier", label: "Courier" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "admin", label: "Admin" },
] as const;

export const HEALTH_BADGE_LABELS = {
  [HealthStatus.Checking]: "Checking API…",
  [HealthStatus.Online]: "API online",
  [HealthStatus.Offline]: "API offline",
} as const;

export const HEALTH_BADGE_TONES = {
  [HealthStatus.Checking]: "neutral",
  [HealthStatus.Online]: "success",
  [HealthStatus.Offline]: "danger",
} as const;

export const API_PATHS = {
  login: "/api/v1/auth/login",
  register: "/api/v1/auth/register",
  forgotPassword: "/api/v1/auth/forgot-password",
  resetPassword: "/api/v1/auth/reset-password",
  verifyEmail: "/api/v1/auth/verify-email",
  resendVerification: "/api/v1/auth/resend-verification",
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export const VALIDATION = {
  required: "This field is required.",
  email: "Enter a valid email address.",
  passwordTooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  passwordTooLong: "That password is too long. Use a shorter one.",
  country: "Use the two-letter country code, like PK or US.",
} as const;

export const AUTH_ERROR_MESSAGES = {
  default: "Something went wrong. Please try again.",
  invalid_credentials: "That email and password don't match.",
  email_taken: "An account with this email already exists.",
  invalid_token: "This link has expired or was already used. Please request a new one.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  account_suspended: "This account has been suspended.",
} as const;

const EMAIL_FIELD = {
  name: "email",
  label: "Email",
  type: "email",
  autoComplete: "email",
} as const;

const NEW_PASSWORD_FIELD = {
  name: "password",
  label: "Password",
  type: "password",
  autoComplete: "new-password",
  hint: `At least ${PASSWORD_MIN_LENGTH} characters.`,
} as const;

export const AUTH_FORMS = {
  [AuthFormId.Login]: {
    title: "Sign in",
    description: "Welcome back to your bookshelf.",
    submitLabel: "Sign in",
    fields: [
      EMAIL_FIELD,
      { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
    ],
    links: [
      { href: ROUTES.forgotPassword, label: "Forgot your password?" },
      { href: ROUTES.register, label: "Create an account" },
    ],
  },
  [AuthFormId.Register]: {
    title: "Create your account",
    description: "One account lets you both buy and sell.",
    submitLabel: "Create account",
    fields: [
      { name: "displayName", label: "Name", type: "text", autoComplete: "name" },
      EMAIL_FIELD,
      NEW_PASSWORD_FIELD,
    ],
    successMessage: "Almost there. Check your email for a link to verify your address.",
    links: [{ href: ROUTES.login, label: "Already have an account? Sign in" }],
  },
  [AuthFormId.ForgotPassword]: {
    title: "Reset your password",
    description: "We'll email you a link to choose a new one.",
    submitLabel: "Send reset link",
    fields: [EMAIL_FIELD],
    successMessage: "If that email has an account, a reset link is on its way.",
    links: [{ href: ROUTES.login, label: "Back to sign in" }],
  },
  [AuthFormId.ResetPassword]: {
    title: "Choose a new password",
    description: "You'll be signed out on your other devices.",
    submitLabel: "Save new password",
    fields: [NEW_PASSWORD_FIELD],
    successMessage: "Your password has been changed. You can sign in now.",
    links: [{ href: ROUTES.login, label: "Back to sign in" }],
  },
  [AuthFormId.ResendVerification]: {
    title: "Verify your email",
    description: "Enter your email and we'll send a new verification link.",
    submitLabel: "Send verification link",
    fields: [EMAIL_FIELD],
    successMessage: "If that email needs verifying, a new link is on its way.",
    links: [{ href: ROUTES.login, label: "Back to sign in" }],
  },
} as const;

export const VERIFY_EMAIL_COPY = {
  title: "Verify your email",
  [VerifyEmailStatus.Pending]: "Checking your link…",
  [VerifyEmailStatus.Verified]: "Your email is verified. You're all set.",
  [VerifyEmailStatus.Invalid]: "This link has expired or was already used.",
  loginLink: { href: ROUTES.login, label: "Continue to sign in" },
} as const;

export const RESET_LINK_INVALID = {
  title: "Reset link missing",
  description: "This page needs the link from your email. You can request a new one.",
  link: { href: ROUTES.forgotPassword, label: "Request a new link" },
} as const;
