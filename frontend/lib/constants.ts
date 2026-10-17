export const SITE_NAME = "BookLoop";
export const SITE_DESCRIPTION = "Buy and sell used books.";

export const THEME_STORAGE_KEY = "bookloop-theme";

export const OPEN_LIBRARY_COVER_URL = "https://covers.openlibrary.org/b/id";

export const NAV_LINKS = [
  { href: "#shelves", label: "Browse" },
  { href: "#how-it-works", label: "How it works" },
] as const;

export const HERO = {
  title: "Buy and sell used books",
  subtitle:
    "Every book's condition is verified, and your payment is held until you confirm it arrived.",
  primaryCta: { href: "#shelves", label: "Browse books" },
  secondaryCta: { href: "#how-it-works", label: "How it works" },
} as const;

export const FEATURED_SHELVES = [
  {
    id: "classics",
    title: "Timeless classics",
    books: [
      { isbn: "9780141439518", coverId: 12645114, title: "Pride and Prejudice", author: "Jane Austen" },
      { isbn: "9780142437247", coverId: 110556, title: "Moby-Dick", author: "Herman Melville" },
      { isbn: "9780141439471", coverId: 109033, title: "Frankenstein", author: "Mary Shelley" },
      { isbn: "9780141441146", coverId: 109090, title: "Jane Eyre", author: "Charlotte Brontë" },
      { isbn: "9780140449136", coverId: 14935910, title: "Crime and Punishment", author: "Fyodor Dostoevsky" },
    ],
  },
  {
    id: "modern",
    title: "Modern favourites",
    books: [
      { isbn: "9780743273565", coverId: 13028546, title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
      { isbn: "9780451524935", coverId: 15257377, title: "1984", author: "George Orwell" },
      { isbn: "9780061120084", coverId: 15162569, title: "To Kill a Mockingbird", author: "Harper Lee" },
      { isbn: "9780547928227", coverId: 12003329, title: "The Hobbit", author: "J.R.R. Tolkien" },
      { isbn: "9780307387899", coverId: 14818095, title: "The Road", author: "Cormac McCarthy" },
    ],
  },
] as const;

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
