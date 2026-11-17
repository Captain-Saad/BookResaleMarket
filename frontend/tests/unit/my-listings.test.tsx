import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import MyListings from "@/components/domain/my-listings";
import ListingWizard from "@/components/domain/listing-wizard";
import { mockListing } from "@/lib/api/mocks/listings";
import { API_BASE_URL, LISTING_API, LISTING_COPY } from "@/lib/constants";
import { parsePrice } from "@/lib/listings";
import { server } from "../utils/msw";

it("parses decimal prices without rounding away fractional minor units", () => {
  expect(parsePrice("12.34")).toBe(1234);
  expect(parsePrice("0.01")).toBe(1);
  for (const input of ["0", "-1", "1.001", "1e2", "Infinity", "1000001"])
    expect(parsePrice(input)).toBeNull();
});
it("shows the empty listing state", async () => {
  server.use(
    http.get(`${API_BASE_URL}${LISTING_API.mine}`, () =>
      HttpResponse.json({ items: [], nextCursor: null }),
    ),
  );
  render(<MyListings copy={LISTING_COPY} />);
  expect(await screen.findByText(LISTING_COPY.empty)).toBeInTheDocument();
});
it("shows locked fields and disables buyer-committed changes", async () => {
  const listing = {
    ...mockListing(),
    title: "An owned book",
    author: "An author",
    identityLocked: true,
    purchaseLocked: true,
  };
  render(<ListingWizard copy={LISTING_COPY} initial={listing} />);
  expect(screen.getByLabelText(LISTING_COPY.isbn)).toBeDisabled();
  expect(screen.getByText(LISTING_COPY.purchased)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  expect(screen.getByLabelText(LISTING_COPY.notes)).toBeDisabled();
});
it("offers recovery when listing loading fails", async () => {
  server.use(
    http.get(`${API_BASE_URL}${LISTING_API.mine}`, () => HttpResponse.json({}, { status: 500 })),
  );
  render(<MyListings copy={LISTING_COPY} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(LISTING_COPY.failed);
  expect(screen.getByRole("button", { name: LISTING_COPY.retry })).toBeInTheDocument();
});
it("requires confirmation before deactivating a listing", async () => {
  const listing = { ...mockListing(), title: "An owned book" };
  server.use(
    http.get(`${API_BASE_URL}${LISTING_API.mine}`, () =>
      HttpResponse.json({ items: [listing], nextCursor: null }),
    ),
  );
  render(<MyListings copy={LISTING_COPY} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: LISTING_COPY.deactivate }));
  expect(screen.getByRole("dialog")).toHaveTextContent(LISTING_COPY.deactivateHelp);
  await user.click(screen.getByRole("button", { name: LISTING_COPY.cancel }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("uploads a photo and publishes the reviewed on-demand listing", async () => {
  server.use(
    http.get(`${API_BASE_URL}/api/v1/me/addresses`, () =>
      HttpResponse.json([
        {
          id: "01900000-0000-7000-8000-000000000001",
          recipientName: "Ada",
          line1: "Private street",
          line2: null,
          city: "Boston",
          region: "MA",
          postalCode: "02108",
          country: "US",
        },
      ]),
    ),
  );
  render(<ListingWizard copy={LISTING_COPY} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(LISTING_COPY.titleLabel), "A physical book");
  await user.type(screen.getByLabelText(LISTING_COPY.author), "An author");
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  await user.upload(
    screen.getByLabelText(LISTING_COPY.upload),
    new File(["image bytes"], "cover.png", { type: "image/png" }),
  );
  expect(await screen.findByAltText(LISTING_COPY.photoAlt)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  await user.selectOptions(
    screen.getByLabelText(LISTING_COPY.address),
    "01900000-0000-7000-8000-000000000001",
  );
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  await user.type(screen.getByLabelText(LISTING_COPY.price, { exact: true }), "12.34");
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  await user.click(screen.getByRole("button", { name: LISTING_COPY.publish }));
  expect(await screen.findByRole("status")).toHaveTextContent(LISTING_COPY.published);
});
