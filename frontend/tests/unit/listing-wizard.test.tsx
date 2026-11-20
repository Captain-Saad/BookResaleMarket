import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import ListingWizard from "@/components/domain/listing-wizard";
import { listingHandlers, mockListing, resetMockListings } from "@/lib/api/mocks/listings";
import type { ListingDraft } from "@/lib/types";
import { API_BASE_URL, LISTING_API, LISTING_COPY } from "@/lib/constants";
import { validIsbn } from "@/lib/listings";
import { server } from "../utils/msw";
import { axeViolations } from "../utils/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/sell",
}));

beforeEach(() => {
  resetMockListings();
  server.use(...listingHandlers);
});
it("validates ISBN checksums", () => {
  expect(validIsbn("978-0-441-47812-5")).toBe(true);
  expect(validIsbn("0-306-40615-2")).toBe(true);
  expect(validIsbn("9780441478124")).toBe(false);
  expect(validIsbn("127.0.0.1")).toBe(false);
});
it("requires metadata before progressing and supports manual entry", async () => {
  render(<ListingWizard copy={LISTING_COPY} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  expect(await screen.findByRole("alert")).toHaveTextContent(LISTING_COPY.missing);
  await user.type(screen.getByLabelText(LISTING_COPY.titleLabel), "A book");
  await user.type(screen.getByLabelText(LISTING_COPY.author), "An author");
  await user.click(screen.getByRole("button", { name: LISTING_COPY.next }));
  expect(screen.getByLabelText(LISTING_COPY.condition)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: LISTING_COPY.back }));
  expect(screen.getByLabelText(LISTING_COPY.titleLabel)).toHaveValue("A book");
});
it("looks up an ISBN and saves a draft", async () => {
  render(<ListingWizard copy={LISTING_COPY} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(LISTING_COPY.isbn), "9780441478125");
  await user.click(screen.getByRole("button", { name: LISTING_COPY.lookup }));
  expect(await screen.findByDisplayValue("The Left Hand of Darkness")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: LISTING_COPY.save }));
  expect(await screen.findByRole("status")).toHaveTextContent(LISTING_COPY.saved);
});
it("has accessible initial fields", async () => {
  const { container } = render(<ListingWizard copy={LISTING_COPY} />);
  expect(await axeViolations(container)).toEqual([]);
});

it("autosaves incomplete drafts and patches the same listing after later edits", async () => {
  let creates = 0;
  let patches = 0;
  const listing = mockListing();
  server.use(
    http.post<never, ListingDraft>(
      `${API_BASE_URL}${LISTING_API.listings}`,
      async ({ request }) => {
        creates++;
        return HttpResponse.json({ ...listing, ...(await request.json()) }, { status: 201 });
      },
    ),
    http.patch<{ id: string }, ListingDraft & { version: number }>(
      `${API_BASE_URL}${LISTING_API.listings}/:id`,
      async ({ request, params }) => {
        expect(params.id).toBe(listing.id);
        patches++;
        return HttpResponse.json({ ...listing, ...(await request.json()), version: 2 });
      },
    ),
  );
  render(<ListingWizard copy={LISTING_COPY} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(LISTING_COPY.titleLabel), "An unfinished draft");
  await waitFor(() => expect(creates).toBe(1), { timeout: 3000 });
  expect(await screen.findByRole("status")).toHaveTextContent(LISTING_COPY.saved);
  await user.type(screen.getByLabelText(LISTING_COPY.author), "Author");
  await waitFor(() => expect(patches).toBe(1), { timeout: 3000 });
  expect(creates).toBe(1);
});

it("pauses failed autosave until another edit or explicit retry", async () => {
  let attempts = 0;
  server.use(
    http.post(`${API_BASE_URL}${LISTING_API.listings}`, () => {
      attempts++;
      return HttpResponse.json({ code: "storage_unavailable" }, { status: 503 });
    }),
  );
  render(<ListingWizard copy={LISTING_COPY} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(LISTING_COPY.titleLabel), "Draft");
  expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent(
    LISTING_COPY.failed,
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(attempts).toBe(1);
  await user.click(screen.getByRole("button", { name: LISTING_COPY.save }));
  await waitFor(() => expect(attempts).toBe(2));
});
