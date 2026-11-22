import { http, HttpResponse } from "msw";
import { API_BASE_URL, CATALOG_API } from "@/lib/constants";
import type { PublicBook, PublicBookDetail, PublicBookPage } from "@/lib/types";

export const catalogBooks: PublicBook[] = [
  {
    id: "01900000-0000-7000-8000-000000000101",
    isbn: "9780441478125",
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    condition: "good",
    fulfillment: "on_demand",
    priceMinor: 1234,
    currency: "USD",
    status: "active",
    available: true,
    location: { city: "Boston", region: "MA", country: "US" },
    coverUrl: null,
  },
  {
    id: "01900000-0000-7000-8000-000000000102",
    isbn: null,
    title: "Frankenstein",
    author: "Mary Shelley",
    condition: "very_good",
    fulfillment: "warehouse",
    priceMinor: 800,
    currency: "EUR",
    status: "incoming",
    available: false,
    location: { city: "Berlin", region: "Berlin", country: "DE" },
    coverUrl: null,
  },
  {
    id: "01900000-0000-7000-8000-000000000103",
    isbn: null,
    title: "The Dispossessed",
    author: "Ursula K. Le Guin",
    condition: "like_new",
    fulfillment: "warehouse",
    priceMinor: 1600,
    currency: "USD",
    status: "active",
    available: true,
    location: { city: "Portland", region: "OR", country: "US" },
    coverUrl: null,
  },
];
export const mockCatalogPage = (params: URLSearchParams): PublicBookPage => {
  const items = catalogBooks.filter((book) => {
    if (book.status !== "active" && book.status !== "incoming") return false;
    const q = params.get("q")?.toLowerCase();
    if (q && !`${book.title} ${book.author}`.toLowerCase().includes(q)) return false;
    if (
      params.get("author") &&
      !book.author.toLowerCase().includes(params.get("author")!.toLowerCase())
    )
      return false;
    for (const key of ["isbn", "condition", "fulfillment", "currency"] as const)
      if (params.get(key) && params.get(key) !== book[key]) return false;
    if (params.has("min_price") && book.priceMinor < Number(params.get("min_price"))) return false;
    if (params.has("max_price") && book.priceMinor > Number(params.get("max_price"))) return false;
    return true;
  });
  return { items, nextCursor: null };
};
export const catalogHandlers = [
  http.get(`${API_BASE_URL}${CATALOG_API}`, ({ request }) =>
    HttpResponse.json(mockCatalogPage(new URL(request.url).searchParams)),
  ),
];

export const mockPublicDetail = (book: PublicBook = catalogBooks[1]!): PublicBookDetail => ({
  ...book,
  notes: "A clean reading copy with light wear at the spine. No missing pages.",
  deliveryEstimate: null,
  updatedAt: "2026-11-22T12:00:00Z",
  photos: [
    {
      id: "01900000-0000-7000-8000-000000000201",
      position: 0,
      url: "https://covers.openlibrary.org/b/id/109033-L.jpg",
    },
    {
      id: "01900000-0000-7000-8000-000000000202",
      position: 1,
      url: "https://covers.openlibrary.org/b/id/109033-M.jpg",
    },
  ],
});
catalogHandlers.push(
  http.get(`${API_BASE_URL}${CATALOG_API}/:id`, ({ params }) => {
    const book = catalogBooks.find((item) => item.id === params.id);
    return book
      ? HttpResponse.json(mockPublicDetail(book))
      : HttpResponse.json({ code: "not_found" }, { status: 404 });
  }),
);
