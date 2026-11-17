import { http, HttpResponse } from "msw";
import { API_BASE_URL, EMPTY_LISTING_DRAFT, LISTING_API } from "@/lib/constants";
import type { IsbnMetadata, ListingDraft, SellerListing } from "@/lib/types";

let listings: SellerListing[] = [];
export const resetMockListings = () => {
  listings = [];
};
export const mockListing = (draft: ListingDraft = EMPTY_LISTING_DRAFT): SellerListing => ({
  ...EMPTY_LISTING_DRAFT,
  ...draft,
  id: crypto.randomUUID(),
  isbn: draft.isbn ?? null,
  title: draft.title ?? "",
  author: draft.author ?? "",
  condition: draft.condition ?? "good",
  notes: draft.notes ?? "",
  fulfillment: draft.fulfillment ?? "on_demand",
  currency: draft.currency ?? "USD",
  priceMinor: draft.priceMinor ?? null,
  addressId: draft.addressId ?? null,
  status: "draft",
  version: 1,
  identityLocked: false,
  purchaseLocked: false,
  returnOrDonationPending: false,
  photos: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export const listingHandlers = [
  http.get(`${API_BASE_URL}${LISTING_API.isbn}/:isbn`, ({ params }) =>
    HttpResponse.json<IsbnMetadata>({
      isbn: String(params.isbn),
      title: "The Left Hand of Darkness",
      author: "Ursula K. Le Guin",
      found: true,
    }),
  ),
  http.post<never, ListingDraft>(`${API_BASE_URL}${LISTING_API.listings}`, async ({ request }) => {
    const listing = mockListing(await request.json());
    listings.push(listing);
    return HttpResponse.json(listing, { status: 201 });
  }),
  http.patch<{ id: string }, ListingDraft & { version: number }>(
    `${API_BASE_URL}${LISTING_API.listings}/:id`,
    async ({ params, request }) => {
      const body = await request.json();
      const current = listings.find((item) => item.id === params.id);
      if (!current) return HttpResponse.json({ code: "not_found" }, { status: 404 });
      if (body.version !== current.version)
        return HttpResponse.json({ code: "stale_listing" }, { status: 409 });
      const updated = { ...current, ...body, version: current.version + 1 };
      listings = listings.map((item) => (item.id === updated.id ? updated : item));
      return HttpResponse.json(updated);
    },
  ),
  http.post<{ id: string }>(`${API_BASE_URL}${LISTING_API.listings}/:id/publish`, ({ params }) => {
    const listing = listings.find((item) => item.id === params.id);
    if (!listing) return HttpResponse.json({ code: "not_found" }, { status: 404 });
    listing.status = listing.fulfillment === "warehouse" ? "incoming" : "active";
    listing.identityLocked = listing.status === "active";
    listing.version++;
    return HttpResponse.json(listing);
  }),
  http.post<{ id: string }>(
    `${API_BASE_URL}${LISTING_API.listings}/:id/deactivate`,
    ({ params }) => {
      const listing = listings.find((item) => item.id === params.id);
      if (!listing) return HttpResponse.json({ code: "not_found" }, { status: 404 });
      listing.status = "deactivated";
      listing.version++;
      return HttpResponse.json(listing);
    },
  ),
  http.post<{ id: string }>(`${API_BASE_URL}${LISTING_API.listings}/:id/photos/upload-url`, () => {
    const photoId = crypto.randomUUID();
    return HttpResponse.json({
      photoId,
      uploadUrl: `${API_BASE_URL}/mock-photo/${photoId}`,
      expiresIn: 300,
    });
  }),
  http.put(`${API_BASE_URL}/mock-photo/:id`, () => new HttpResponse(null, { status: 200 })),
  http.post<{ id: string }, { photoId: string }>(
    `${API_BASE_URL}${LISTING_API.listings}/:id/photos/complete`,
    async ({ params, request }) => {
      const listing = listings.find((item) => item.id === params.id);
      if (!listing) return HttpResponse.json({ code: "not_found" }, { status: 404 });
      const { photoId } = await request.json();
      listing.photos.push({
        id: photoId,
        url: "https://covers.openlibrary.org/b/isbn/9780441478125-M.jpg",
        position: listing.photos.length,
      });
      listing.version++;
      return HttpResponse.json(listing);
    },
  ),
  http.delete<{ id: string; photo: string }>(
    `${API_BASE_URL}${LISTING_API.listings}/:id/photos/:photo`,
    ({ params }) => {
      const listing = listings.find((item) => item.id === params.id);
      if (!listing) return HttpResponse.json({ code: "not_found" }, { status: 404 });
      listing.photos = listing.photos.filter((photo) => photo.id !== params.photo);
      listing.version++;
      return HttpResponse.json(listing);
    },
  ),
  http.get(`${API_BASE_URL}${LISTING_API.mine}`, () =>
    HttpResponse.json({ items: listings, nextCursor: null }),
  ),
];
