import type { Metadata } from "next";
import BooksCatalog from "@/components/domain/books-catalog";
import { catalogClient } from "@/lib/api/catalog";
import { catalogFilters } from "@/lib/catalog";
import {
  CATALOG_COPY,
  EMPTY_CATALOG_FILTERS,
  PUBLIC_FRESHNESS_MS,
  PUBLIC_SITE_URL,
} from "@/lib/constants";
import { catalogMetadata } from "@/lib/api/catalog-server";
import type { CatalogFilters, CatalogPageProps } from "@/lib/types";
const catalogPageParams = (query: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const selected = Array.isArray(value) ? value[0] : value;
    if (selected !== undefined) params.set(key, selected);
  }
  return params;
};

export const generateMetadata = async ({ searchParams }: CatalogPageProps): Promise<Metadata> =>
  catalogMetadata(
    catalogPageParams(await searchParams),
    new URL(CATALOG_COPY.detailBase, PUBLIC_SITE_URL).toString(),
    CATALOG_COPY,
  );
const BooksPage = async ({ searchParams }: CatalogPageProps) => {
  const params = catalogPageParams(await searchParams);
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
