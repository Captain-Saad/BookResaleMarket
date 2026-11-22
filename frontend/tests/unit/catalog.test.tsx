import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import BooksCatalog from "@/components/domain/books-catalog";
import BookCard from "@/components/domain/book-card";
import { catalogBooks } from "@/lib/api/mocks/catalog";
import { API_BASE_URL, CATALOG_API, CATALOG_COPY } from "@/lib/constants";
import { catalogFilters } from "@/lib/catalog";
import { server } from "../utils/msw";
import { axeViolations } from "../utils/axe";

it("loads public copies, flags incoming stock and supports text search", async () => {
  render(<BooksCatalog copy={CATALOG_COPY} />);
  expect(await screen.findByRole("link", { name: /View book: Frankenstein/ })).toBeInTheDocument();
  expect(screen.getByText(CATALOG_COPY.incoming)).toBeInTheDocument();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(CATALOG_COPY.query), "Dispossessed");
  await user.click(screen.getByRole("button", { name: CATALOG_COPY.search }));
  expect(
    await screen.findByRole("link", { name: /View book: The Dispossessed/ }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /View book: Frankenstein/ })).not.toBeInTheDocument();
});

it("combines currency, condition, fulfillment and price filters", async () => {
  render(<BooksCatalog copy={CATALOG_COPY} />);
  await screen.findByRole("link", { name: /View book: Frankenstein/ });
  const user = userEvent.setup();
  await user.selectOptions(
    screen.getByRole("combobox", { name: CATALOG_COPY.condition }),
    "very_good",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: CATALOG_COPY.fulfillment }),
    "warehouse",
  );
  await user.selectOptions(screen.getByRole("combobox", { name: CATALOG_COPY.currency }), "EUR");
  await user.type(screen.getByLabelText(CATALOG_COPY.maxPrice), "10.00");
  await user.click(screen.getByRole("button", { name: CATALOG_COPY.apply }));
  expect(await screen.findByRole("link", { name: /View book: Frankenstein/ })).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /View book: The Dispossessed/ }),
  ).not.toBeInTheDocument();
});

it("requires a currency for a price range without discarding results", async () => {
  render(<BooksCatalog copy={CATALOG_COPY} />);
  await screen.findByRole("link", { name: /View book: Frankenstein/ });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(CATALOG_COPY.minPrice), "1.00");
  await user.click(screen.getByRole("button", { name: CATALOG_COPY.apply }));
  expect(screen.getByRole("alert")).toHaveTextContent(CATALOG_COPY.invalidFilters);
  expect(screen.getByRole("link", { name: /View book: Frankenstein/ })).toBeInTheDocument();
});

it("renders empty results and clears filters", async () => {
  render(<BooksCatalog copy={CATALOG_COPY} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(CATALOG_COPY.query), "no matching title here");
  await user.click(screen.getByRole("button", { name: CATALOG_COPY.search }));
  expect(await screen.findByText(CATALOG_COPY.empty)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: CATALOG_COPY.reset }));
  expect(await screen.findByRole("link", { name: /View book: Frankenstein/ })).toBeInTheDocument();
});

it("offers a working retry after a failed catalog request", async () => {
  server.use(
    http.get(`${API_BASE_URL}${CATALOG_API}`, () => HttpResponse.json({}, { status: 503 })),
  );
  render(<BooksCatalog copy={CATALOG_COPY} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(CATALOG_COPY.failed);
  server.resetHandlers();
  await userEvent.click(screen.getByRole("button", { name: CATALOG_COPY.retry }));
  expect(await screen.findByRole("link", { name: /View book: Frankenstein/ })).toBeInTheDocument();
});

it("uses public book cards with accessible covers and links", async () => {
  const { container } = render(<BookCard book={catalogBooks[0]!} copy={CATALOG_COPY} />);
  expect(screen.getByRole("link")).toHaveAttribute("href", `/books/${catalogBooks[0]!.id}`);
  expect(await axeViolations(container)).toEqual([]);
});

it("keeps the query transport in integer minor units", () => {
  expect(
    catalogFilters(new URLSearchParams("currency=USD&min_price=0&max_price=1234")).max_price,
  ).toBe(1234);
  expect(() => catalogFilters(new URLSearchParams("min_price=100"))).toThrow();
  expect(catalogFilters(new URLSearchParams("isbn=978-0-441-47812-5")).isbn).toBe("9780441478125");
  expect(() => catalogFilters(new URLSearchParams("isbn=9780441478124"))).toThrow();
  expect(() =>
    catalogFilters(new URLSearchParams("currency=USD&min_price=200&max_price=100")),
  ).toThrow();
});

it("ignores a slow previous page after the filters change", async () => {
  let started = false;
  let finish = () => {};
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  server.use(
    http.get(`${API_BASE_URL}${CATALOG_API}`, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (params.has("cursor")) {
        started = true;
        await pending;
        return HttpResponse.json({ items: [catalogBooks[2]], nextCursor: null });
      }
      return HttpResponse.json(
        params.has("q")
          ? { items: [catalogBooks[1]], nextCursor: null }
          : { items: [catalogBooks[0]], nextCursor: "next" },
      );
    }),
  );
  render(<BooksCatalog copy={CATALOG_COPY} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: CATALOG_COPY.more }));
  await waitFor(() => expect(started).toBe(true));
  await user.type(screen.getByLabelText(CATALOG_COPY.query), "Frankenstein");
  await user.click(screen.getByRole("button", { name: CATALOG_COPY.search }));
  expect(await screen.findByRole("link", { name: /View book: Frankenstein/ })).toBeInTheDocument();
  finish();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(
    screen.queryByRole("link", { name: /View book: The Dispossessed/ }),
  ).not.toBeInTheDocument();
});
