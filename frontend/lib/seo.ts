import type { Metadata } from "next";
import { PUBLIC_SITE_URL, SCHEMA_ORG } from "@/lib/constants";
import type { PublicBookDetail } from "@/lib/types";

export const bookUrl = (id: string) =>
  new URL(`/books/${encodeURIComponent(id.toLowerCase())}`, PUBLIC_SITE_URL).toString();
export const bookMetadata = (book: PublicBookDetail, url: string): Metadata => {
  const description = book.notes.trim().slice(0, 160) || `${book.title} · ${book.author}`;
  const images = book.photos.map((photo) => photo.url);
  return {
    title: book.title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "book",
      title: book.title,
      description,
      url,
      images,
      isbn: book.isbn ?? undefined,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: book.title,
      description,
      images,
    },
  };
};
export const bookStructuredData = (book: PublicBookDetail, url: string) => ({
  "@context": SCHEMA_ORG,
  "@type": "Book",
  "@id": `${url}#book`,
  url,
  name: book.title,
  author: { "@type": "Person", name: book.author },
  ...(book.isbn ? { isbn: book.isbn } : {}),
  description: book.notes,
  image: book.photos.map((photo) => photo.url),
  offers: {
    "@type": "Offer",
    url,
    priceCurrency: book.currency,
    price: `${Math.floor(book.priceMinor / 100)}.${String(book.priceMinor % 100).padStart(2, "0")}`,
    availability: `${SCHEMA_ORG}/${book.available ? "InStock" : book.status === "sold" ? "SoldOut" : "OutOfStock"}`,
    itemCondition: `${SCHEMA_ORG}/${book.condition === "new" ? "NewCondition" : "UsedCondition"}`,
  },
});
export const serializeStructuredData = (value: ReturnType<typeof bookStructuredData>) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
