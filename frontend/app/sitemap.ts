import type { MetadataRoute } from "next";
import { notFound } from "next/navigation";
import { catalogClient } from "@/lib/api/catalog";
import { getPublicSitemaps } from "@/lib/api/catalog-server";
import {
  PUBLIC_FRESHNESS_MS,
  PUBLIC_SITE_URL,
  PUBLIC_UUID_PATTERN,
  SITEMAP_BASE_PATHS,
  SITEMAP_START_ID,
} from "@/lib/constants";
import { bookUrl } from "@/lib/seo";
import type { SitemapProps } from "@/lib/types";

export const dynamic = "force-dynamic";

export const generateSitemaps = async () => getPublicSitemaps();
const Sitemap = async ({ id }: SitemapProps): Promise<MetadataRoute.Sitemap> => {
  const key = await id;
  if (key !== SITEMAP_START_ID && !PUBLIC_UUID_PATTERN.test(key)) notFound();
  const page = await catalogClient.sitemap(
    key === SITEMAP_START_ID ? undefined : key,
    AbortSignal.timeout(PUBLIC_FRESHNESS_MS),
  );
  return [
    ...(key === SITEMAP_START_ID
      ? SITEMAP_BASE_PATHS.map((path) => ({ url: new URL(path, PUBLIC_SITE_URL).toString() }))
      : []),
    ...page.items.map((entry) => ({ url: bookUrl(entry.id), lastModified: entry.updatedAt })),
  ];
};
export default Sitemap;
