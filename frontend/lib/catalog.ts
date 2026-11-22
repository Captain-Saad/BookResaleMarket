import { CATALOG_COPY, EMPTY_CATALOG_FILTERS } from "@/lib/constants";
import { normalizeIsbn, validIsbn } from "@/lib/listings";
import type { CatalogFilters } from "@/lib/types";

const option = <T extends string>(values: readonly T[], value: string | null): T | null => {
  if (!value) return null;
  const found = values.find((item) => item === value);
  if (!found) throw new RangeError();
  return found;
};
const price = (value: string | null): number | null => {
  if (!value) return null;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new RangeError();
  return Number(value);
};
export const catalogParams = (filters: CatalogFilters, cursor?: string) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== null && value !== "") params.set(key, String(value));
  if (cursor) params.set("cursor", cursor);
  return params;
};
export const catalogFilters = (params: URLSearchParams): CatalogFilters => {
  for (const name of ["q", "author"] as const) {
    const value = params.get(name);
    if (value && (value.length > 200 || value.includes("\0"))) throw new RangeError();
  }
  if ((params.get("isbn")?.length ?? 0) > 32) throw new RangeError();
  const filters = {
    ...EMPTY_CATALOG_FILTERS,
    q: params.get("q")?.trim() || null,
    isbn: params.get("isbn")?.trim() ? normalizeIsbn(params.get("isbn")!) : null,
    author: params.get("author")?.trim() || null,
    condition: option(
      CATALOG_COPY.conditions.map(({ value }) => value),
      params.get("condition"),
    ),
    fulfillment: option(
      CATALOG_COPY.fulfillments.map(({ value }) => value),
      params.get("fulfillment"),
    ),
    currency: option(CATALOG_COPY.currencies, params.get("currency")),
    min_price: price(params.get("min_price")),
    max_price: price(params.get("max_price")),
  };
  if (filters.isbn && !validIsbn(filters.isbn)) throw new RangeError();
  if ((filters.min_price !== null || filters.max_price !== null) && !filters.currency)
    throw new RangeError();
  if (
    filters.min_price !== null &&
    filters.max_price !== null &&
    filters.min_price > filters.max_price
  )
    throw new RangeError();
  return filters;
};
export const catalogForm = (form: HTMLFormElement, previous: CatalogFilters): CatalogFilters => {
  const params = catalogParams(previous);
  for (const [key, value] of new FormData(form)) {
    if (typeof value !== "string") continue;
    if (!value.trim()) {
      params.delete(key);
      continue;
    }
    if (key === "min_price" || key === "max_price") {
      if (!/^\d+(\.\d{0,2})?$/.test(value)) throw new RangeError();
      const [whole = "0", fraction = ""] = value.split(".");
      params.set(key, String(Number(whole) * 100 + Number(fraction.padEnd(2, "0"))));
    } else params.set(key, value);
  }
  return catalogFilters(params);
};
export const filterPrice = (value: number | null) =>
  value === null ? "" : (value / 100).toFixed(2);
