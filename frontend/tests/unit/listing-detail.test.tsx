import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import ListingDetail from "@/components/domain/listing-detail";
import ListingOverview from "@/components/domain/listing-overview";
import BookGallery from "@/components/domain/book-gallery";
import { catalogBooks, mockPublicDetail } from "@/lib/api/mocks/catalog";
import { API_BASE_URL, CATALOG_API, DETAIL_COPY } from "@/lib/constants";
import { server } from "../utils/msw";
import { axeViolations } from "../utils/axe";

it("loads a public copy with notes, coarse area and the approved delivery message", async () => {
  render(<ListingDetail id={catalogBooks[1]!.id} copy={DETAIL_COPY} />);
  expect(
    await screen.findByRole("heading", { level: 1, name: "Frankenstein" }),
  ).toBeInTheDocument();
  expect(screen.getByText(DETAIL_COPY.deliveryPending)).toBeInTheDocument();
  expect(screen.getByText("Berlin, Berlin")).toBeInTheDocument();
  expect(screen.getByText(mockPublicDetail().notes)).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("button", { name: DETAIL_COPY.incoming })
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
});

for (const status of ["reserved", "sold"] as const) {
  it(`keeps a ${status} copy visible while disabling purchasing`, async () => {
    server.use(
      http.get(`${API_BASE_URL}${CATALOG_API}/:id`, () =>
        HttpResponse.json({ ...mockPublicDetail(), status, available: false }),
      ),
    );
    render(<ListingDetail id={catalogBooks[1]!.id} copy={DETAIL_COPY} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Frankenstein" }),
    ).toBeInTheDocument();
    const label = status === "sold" ? DETAIL_COPY.sold : DETAIL_COPY.reserved;
    expect(
      screen
        .getAllByRole("button", { name: label })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen.getByText(status === "sold" ? DETAIL_COPY.soldHelp : DETAIL_COPY.reservedHelp),
    ).toBeInTheDocument();
  });
}

it("switches gallery photos after an image error and returns focus after zoom closes", async () => {
  const book = mockPublicDetail();
  render(<BookGallery book={book} copy={DETAIL_COPY} />);
  const user = userEvent.setup();
  const zoom = screen.getByRole("button", { name: `${DETAIL_COPY.zoom}: ${book.title}` });
  fireEvent.error(zoom.querySelector("img")!);
  await user.click(screen.getByRole("button", { name: "Photo 2" }));
  expect(zoom.querySelector("img")).toHaveAttribute("src", book.photos[1]!.url);
  expect(zoom.querySelector("img")).toBeVisible();
  expect(screen.getByRole("button", { name: "Photo 2" })).toHaveAttribute("aria-pressed", "true");
  await user.click(zoom);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(zoom).toHaveFocus());
});

it("shows a missing-copy message and can retry", async () => {
  server.use(
    http.get(`${API_BASE_URL}${CATALOG_API}/:id`, () => HttpResponse.json({}, { status: 404 })),
  );
  render(<ListingDetail id={catalogBooks[1]!.id} copy={DETAIL_COPY} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(DETAIL_COPY.notFound);
  server.resetHandlers();
  await userEvent.click(screen.getByRole("button", { name: DETAIL_COPY.retry }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Frankenstein" }),
  ).toBeInTheDocument();
});

it("renders a gallery fallback without inventing a photo", () => {
  render(<BookGallery book={{ ...mockPublicDetail(), photos: [] }} copy={DETAIL_COPY} />);
  expect(screen.getByText(DETAIL_COPY.noPhotos)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("has accessible detail semantics", async () => {
  const { container } = render(<ListingOverview book={mockPublicDetail()} copy={DETAIL_COPY} />);
  expect(await axeViolations(container)).toEqual([]);
});

it("shows a retry when the detail service fails", async () => {
  server.use(http.get(`${API_BASE_URL}${CATALOG_API}/:id`, () => HttpResponse.error()));
  render(<ListingDetail id={catalogBooks[1]!.id} copy={DETAIL_COPY} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(DETAIL_COPY.failed);
  expect(screen.getByRole("button", { name: DETAIL_COPY.retry })).toBeInTheDocument();
});
