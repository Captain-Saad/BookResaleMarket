import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import ListingWizard from "@/components/domain/listing-wizard";
import { listingHandlers, resetMockListings } from "@/lib/api/mocks/listings";
import { LISTING_COPY } from "@/lib/constants";
import { validIsbn } from "@/lib/listings";
import { server } from "../utils/msw";
import { axeViolations } from "../utils/axe";

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
