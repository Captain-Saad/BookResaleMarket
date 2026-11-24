import { api } from "@/lib/api/client";
import { PUBLIC_REFRESH_MS, PUBLIC_RETRY_MAX_MS, PUBLIC_FRESHNESS_MS } from "@/lib/constants";
import type { ApiOutcome, CatalogFilters, PublicBookPage } from "@/lib/types";

export class PublicRequestError extends Error {
  constructor(public readonly status: number) {
    super("public_request_failed");
  }
}
const data = <T>(result: ApiOutcome<T>): T => {
  if (!result.response.ok || result.data === undefined)
    throw new PublicRequestError(result.response.status);
  return result.data;
};
export const catalogClient = {
  page: async (filters: CatalogFilters, cursor?: string, signal?: AbortSignal, limit = 24) =>
    data(
      await api.GET("/api/v1/listings", {
        params: { query: { ...filters, cursor, limit } },
        signal,
        cache: "no-store",
      }),
    ),
  detail: async (listing_id: string, signal?: AbortSignal) =>
    data(
      await api.GET("/api/v1/listings/{listing_id}", {
        params: { path: { listing_id } },
        signal,
        cache: "no-store",
      }),
    ),
  sitemap: async (cursor?: string, signal?: AbortSignal) =>
    data(
      await api.GET("/api/v1/catalog/sitemap", {
        params: { query: { cursor, limit: 10000 } },
        signal,
        cache: "no-store",
      }),
    ),
  pages: async (
    filters: CatalogFilters,
    count: number,
    signal: AbortSignal,
  ): Promise<PublicBookPage> => {
    let cursor: string | undefined;
    const items: PublicBookPage["items"] = [];
    for (let remaining = count * 24; remaining > 0; remaining -= 100) {
      const result = await catalogClient.page(filters, cursor, signal, Math.min(remaining, 100));
      items.push(...result.items);
      cursor = result.nextCursor ?? undefined;
      if (!cursor) break;
    }
    return {
      items: [...new Map(items.map((book) => [book.id, book])).values()],
      nextCursor: cursor ?? null,
    };
  },
};

export const observePublic = <T>(
  load: (signal: AbortSignal) => Promise<T>,
  next: (value: T, started: number) => void,
  failed: (error: unknown) => void,
  previousFreshAt = 0,
) => {
  let stopped = false;
  let running = false;
  let controller: AbortController | undefined;
  let refresh: ReturnType<typeof setTimeout> | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let freshAt = previousFreshAt;
  let retryDelay = PUBLIC_REFRESH_MS;
  const expire = () => {
    clearTimeout(expiry);
    expiry = setTimeout(
      () => failed(new PublicRequestError(503)),
      Math.max(0, PUBLIC_FRESHNESS_MS - (Date.now() - freshAt)),
    );
  };
  const run = async () => {
    if (stopped || running || document.visibilityState === "hidden") return;
    running = true;
    clearTimeout(refresh);
    controller = new AbortController();
    const active = controller;
    const started = Date.now();
    let succeeded = false;
    const timeout = setTimeout(() => {
      active.abort();
      if (!stopped) failed(new PublicRequestError(503));
    }, PUBLIC_FRESHNESS_MS);
    try {
      const value = await load(active.signal);
      if (stopped || active.signal.aborted) return;
      if (Date.now() - started >= PUBLIC_FRESHNESS_MS) throw new PublicRequestError(503);
      retryDelay = PUBLIC_REFRESH_MS;
      freshAt = started;
      next(value, started);
      expire();
      succeeded = true;
    } catch (error) {
      retryDelay = Math.min(retryDelay * 2, PUBLIC_RETRY_MAX_MS);
      if (!stopped) {
        clearTimeout(expiry);
        failed(error);
      }
    } finally {
      clearTimeout(timeout);
      running = false;
      if (!stopped)
        refresh = setTimeout(
          run,
          succeeded ? Math.max(0, PUBLIC_REFRESH_MS - (Date.now() - started)) : retryDelay,
        );
    }
  };
  const foreground = () => {
    if (document.visibilityState === "hidden") return;
    if (freshAt && Date.now() - freshAt >= PUBLIC_FRESHNESS_MS) failed(new PublicRequestError(503));
    void run();
  };
  window.addEventListener("focus", foreground);
  document.addEventListener("visibilitychange", foreground);
  if (freshAt) expire();
  void run();
  return () => {
    stopped = true;
    controller?.abort();
    clearTimeout(refresh);
    clearTimeout(expiry);
    window.removeEventListener("focus", foreground);
    document.removeEventListener("visibilitychange", foreground);
  };
};
