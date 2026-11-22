import type { PublicSitemapPage } from "@/lib/types";
import { http, HttpResponse } from "msw";
import Sitemap from "@/app/sitemap";
import Robots from "@/app/robots";
import { getPublicSitemaps, catalogMetadata } from "@/lib/api/catalog-server";
import { server } from "../utils/msw";
import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import ListingOverview from "@/components/domain/listing-overview";
import { catalogBooks, mockPublicDetail } from "@/lib/api/mocks/catalog";
import { API_BASE_URL, CATALOG_COPY, DETAIL_COPY } from "@/lib/constants";
import { bookMetadata, bookStructuredData, bookUrl, serializeStructuredData } from "@/lib/seo";

it("builds canonical and OpenGraph metadata from public book fields", () => {
  const book = mockPublicDetail();
  const url = bookUrl(book.id);
  const metadata = bookMetadata(book, url);
  expect(bookUrl(book.id.toUpperCase())).toBe(url);
  expect(url).toMatch(new RegExp(`/books/${book.id}$`));
  expect(metadata.title).toBe(book.title);
  expect(metadata.alternates?.canonical).toBe(url);
  expect(metadata.openGraph).toMatchObject({ type: "book", title: book.title, url });
  expect(JSON.stringify(metadata)).not.toMatch(/Berlin|postalCode|sellerId|addressId/);
});
for (const status of ["active", "incoming", "reserved", "sold"] as const) {
  it(`describes ${status} stock without invented shipping or seller data`, () => {
    const book = { ...mockPublicDetail(catalogBooks[0]), status, available: status === "active" };
    const data = bookStructuredData(book, bookUrl(book.id));
    expect(data["@type"]).toBe("Book");
    expect(data.offers.price).toBe("12.34");
    expect(data.offers.priceCurrency).toBe("USD");
    expect(data.offers.availability).toMatch(
      new RegExp(
        `/${status === "active" ? "InStock" : status === "sold" ? "SoldOut" : "OutOfStock"}$`,
      ),
    );
    expect(JSON.stringify(data)).not.toMatch(
      /Boston|shippingDetails|deliveryTime|sellerId|addressId/,
    );
  });
}
it("preserves cents at the maximum safe integer price", () => {
  const book = { ...mockPublicDetail(), priceMinor: Number.MAX_SAFE_INTEGER };
  expect(bookStructuredData(book, bookUrl(book.id)).offers.price).toBe("90071992547409.91");
});
it("keeps malicious titles inside JSON data instead of creating markup", () => {
  const book = {
    ...mockPublicDetail(),
    title: '</script><img id="attack" src=x onerror=alert(1)>',
  };
  const value = bookStructuredData(book, bookUrl(book.id));
  expect(serializeStructuredData(value)).not.toContain("<");
  expect(JSON.parse(serializeStructuredData(value)).name).toBe(book.title);
  const { container } = render(
    <ListingOverview book={book} copy={DETAIL_COPY} canonicalUrl={bookUrl(book.id)} />,
  );
  expect(container.querySelector("#attack")).toBeNull();
  expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
});

it("indexes the base catalog and canonicalizes filtered results without indexing them", () => {
  const base = catalogMetadata(new URLSearchParams(), "http://localhost/books", CATALOG_COPY);
  expect(base.robots).toMatchObject({ index: true });
  for (const query of [
    "q=Frankenstein",
    "condition=good",
    "currency=USD&min_price=100",
    "condition=invalid",
  ]) {
    expect(
      catalogMetadata(new URLSearchParams(query), "http://localhost/books", CATALOG_COPY),
    ).toMatchObject({
      robots: { index: false },
      alternates: { canonical: "http://localhost/books" },
    });
  }
});
it("builds paginated sitemap files from public IDs and publishes every segment in robots", async () => {
  const first = catalogBooks[0]!;
  const second = catalogBooks[1]!;
  server.use(
    http.get(`${API_BASE_URL}/api/v1/catalog/sitemap`, ({ request }) =>
      HttpResponse.json<PublicSitemapPage>(
        new URL(request.url).searchParams.has("cursor")
          ? { items: [{ id: second.id, updatedAt: "2026-11-22T00:00:00Z" }], nextCursor: null }
          : { items: [{ id: first.id, updatedAt: "2026-11-22T00:00:00Z" }], nextCursor: first.id },
      ),
    ),
  );
  expect(await getPublicSitemaps()).toEqual([{ id: "start" }, { id: first.id }]);
  const initial = await Sitemap({ id: Promise.resolve("start") });
  expect(initial.map(({ url }) => url)).toContain(bookUrl(first.id));
  const later = await Sitemap({ id: Promise.resolve(first.id) });
  expect(later).toEqual([{ url: bookUrl(second.id), lastModified: "2026-11-22T00:00:00Z" }]);
  const rules = await Robots();
  expect(rules.sitemap).toHaveLength(2);
  expect(rules.rules).toMatchObject({
    disallow: expect.arrayContaining(["/account", "/sell", "/login"]),
  });
  expect(JSON.stringify(initial)).not.toMatch(/Boston|sellerId|addressId|postalCode/);
});
it("can build its initial sitemap segment before the API starts, while live XML reads fail visibly", async () => {
  server.use(
    http.get(`${API_BASE_URL}/api/v1/catalog/sitemap`, () =>
      HttpResponse.json({}, { status: 503 }),
    ),
  );
  expect(await getPublicSitemaps()).toEqual([{ id: "start" }]);
  await expect(Sitemap({ id: Promise.resolve("start") })).rejects.toMatchObject({ status: 503 });
});
