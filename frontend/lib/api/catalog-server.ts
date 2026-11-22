import type { Metadata } from "next";
import { catalogFilters, catalogParams } from "@/lib/catalog";
import type { CatalogCopy } from "@/lib/types";
import { cache } from "react";
import { catalogClient } from "@/lib/api/catalog";
import { PUBLIC_FRESHNESS_MS, SITEMAP_START_ID } from "@/lib/constants";

export const getPublicBook = cache((id: string) =>
  catalogClient.detail(id, AbortSignal.timeout(PUBLIC_FRESHNESS_MS)),
);

export const getPublicSitemaps = async () => {
  const segments: { id: string }[] = [];
  let cursor: string | undefined;
  try {
    do {
      segments.push({ id: cursor ?? SITEMAP_START_ID });
      const page = await catalogClient.sitemap(cursor, AbortSignal.timeout(PUBLIC_FRESHNESS_MS));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return segments;
  } catch {
    return [{ id: SITEMAP_START_ID }];
  }
};

export const catalogMetadata = (
  params: URLSearchParams,
  url: string,
  copy: CatalogCopy,
): Metadata => {
  let index = false;
  try {
    index = catalogParams(catalogFilters(params)).toString() === "";
  } catch {
    index = false;
  }
  return {
    title: copy.search,
    description: copy.description,
    alternates: { canonical: url },
    robots: { index, follow: true },
  };
};
