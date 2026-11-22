import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import ListingOverview from "@/components/domain/listing-overview";
import { catalogBooks, mockPublicDetail } from "@/lib/api/mocks/catalog";
import { DETAIL_COPY } from "@/lib/constants";
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
