import { cache } from "react";
import { catalogClient } from "@/lib/api/catalog";
import { PUBLIC_FRESHNESS_MS } from "@/lib/constants";

export const getPublicBook = cache((id: string) =>
  catalogClient.detail(id, AbortSignal.timeout(PUBLIC_FRESHNESS_MS)),
);
