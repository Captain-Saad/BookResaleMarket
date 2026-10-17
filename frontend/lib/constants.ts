import { Package, Search, Tag, User } from "lucide-react";

export const SITE_NAME = "BookLoop";
export const SITE_DESCRIPTION = "Buy and sell used books.";

export const THEME_STORAGE_KEY = "bookloop-theme";

export const THEME_TOGGLE_LABEL = "Toggle color theme";

export const OPEN_LIBRARY_COVER_URL = "https://covers.openlibrary.org/b/id";

export const COVER_SIZES = "(min-width: 64rem) 176px, (min-width: 30rem) 144px, 128px";

export const AURORA_ORB_CLASSES =
  "absolute aspect-square rounded-full blur-[80px] motion-reduce:animate-none";

export const SECTION_IDS = { shelves: "shelves", howItWorks: "how-it-works" } as const;

export const ROUTES = { home: "/", search: "/search" } as const;

export const PRIMARY_NAV = [
  { id: "browse", href: ROUTES.search, label: "Browse" },
  { id: "sell", href: "/sell", label: "Sell" },
  { id: "orders", href: "/orders", label: "Orders" },
  { id: "account", href: "/login", label: "Account" },
] as const;

export const NAV_ICONS = { browse: Search, sell: Tag, orders: Package, account: User } as const;

export const PLACEHOLDER_PAGES = {
  search: { title: "Search", description: "Search and filters arrive in slice S3." },
  login: { title: "Sign in", description: "Sign-in and registration arrive in slice S1." },
  orders: { title: "Your orders", description: "Order history and tracking arrive in slice S8." },
  sell: { title: "Sell a book", description: "The listing wizard arrives in slice S2." },
  warehouse: { title: "Warehouse console", description: "The staff console arrives in slice S6." },
  courier: { title: "Courier app", description: "Pickup and delivery tasks arrive in slice S7." },
  admin: { title: "Admin console", description: "Operations and disputes arrive in slice S10." },
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

export const BACK_HOME_LINK = { href: ROUTES.home, label: "Back to home" } as const;

export const ERROR_PAGE = {
  title: "Something went wrong",
  description: "Please try again. If it keeps happening, come back later.",
  retryLabel: "Try again",
} as const;
