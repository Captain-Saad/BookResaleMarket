import type { MetadataRoute } from "next";
import { getPublicSitemaps } from "@/lib/api/catalog-server";
import { PUBLIC_SITE_URL, ROBOTS_PRIVATE_PATHS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const Robots = async (): Promise<MetadataRoute.Robots> => ({
  rules: { userAgent: "*", allow: "/", disallow: [...ROBOTS_PRIVATE_PATHS] },
  sitemap: (await getPublicSitemaps()).map(({ id }) =>
    new URL(`/sitemap/${id}.xml`, PUBLIC_SITE_URL).toString(),
  ),
});
export default Robots;
