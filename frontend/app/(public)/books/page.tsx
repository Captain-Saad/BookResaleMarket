import type { Metadata } from "next";
import BooksCatalog from "@/components/domain/books-catalog";
import { catalogClient } from "@/lib/api/catalog";
import { catalogFilters } from "@/lib/catalog";
import { CATALOG_COPY, EMPTY_CATALOG_FILTERS, PUBLIC_FRESHNESS_MS } from "@/lib/constants";
import type { CatalogFilters, CatalogPageProps } from "@/lib/types";
export const metadata: Metadata = {
  title: CATALOG_COPY.search,
  description: CATALOG_COPY.description,
};
const BooksPage = async ({ searchParams }: CatalogPageProps) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    const selected = Array.isArray(value) ? value[0] : value;
    if (selected !== undefined) params.set(key, selected);
  }
  let filters: CatalogFilters = { ...EMPTY_CATALOG_FILTERS };
  let initialError = "";
  try {
    filters = catalogFilters(params);
  } catch {
    initialError = CATALOG_COPY.invalidFilters;
  }
  let initial;
  try {
    initial = await catalogClient.page(
      filters,
      undefined,
      AbortSignal.timeout(PUBLIC_FRESHNESS_MS),
    );
  } catch {
    /* The client retries transient server failures. */
  }
  return (
    <BooksCatalog
      copy={CATALOG_COPY}
      initialFilters={filters}
      initial={initial}
      initialError={initialError}
      syncUrl
    />
  );
};
export default BooksPage;
