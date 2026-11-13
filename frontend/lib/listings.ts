import type { ListingDraft, SellerListing } from "@/lib/types";

export const normalizeIsbn = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

export const validIsbn = (value: string) => {
  const isbn = normalizeIsbn(value);
  if (/^\d{9}[\dX]$/.test(isbn)) {
    return (
      [...isbn].reduce(
        (sum, digit, index) => sum + (digit === "X" ? 10 : Number(digit)) * (10 - index),
        0,
      ) %
        11 ===
      0
    );
  }
  return (
    /^\d{13}$/.test(isbn) &&
    [...isbn].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10 === 0
  );
};

export const listingDraft = (listing: SellerListing): ListingDraft => ({
  isbn: listing.isbn,
  title: listing.title,
  author: listing.author,
  condition: listing.condition,
  notes: listing.notes,
  fulfillment: listing.fulfillment,
  priceMinor: listing.priceMinor,
  currency: listing.currency,
  addressId: listing.addressId,
});
