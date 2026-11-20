import { api } from "@/lib/api/client";
import { problemSchema } from "@/lib/auth/schemas";
import { API_PATHS } from "@/lib/constants";
import type { ApiOutcome, ListingDraft, SellerListing } from "@/lib/types";

export class ListingRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(code ?? "listing_request_failed");
  }
}

const data = <T>(result: ApiOutcome<T>): T => {
  if (!result.response.ok || result.data === undefined)
    throw new ListingRequestError(
      result.response.status,
      problemSchema.safeParse(result.error).data?.code,
    );
  return result.data;
};

export const listingClient = {
  page: async (cursor?: string, signal?: AbortSignal) =>
    data(await api.GET("/api/v1/me/listings", { params: { query: { cursor } }, signal })),
  ticket: async (listing_id: string, file: File) =>
    data(
      await api.POST("/api/v1/listings/{listing_id}/photos/upload-url", {
        params: { path: { listing_id } },
        body: { contentType: file.type, sizeBytes: file.size },
      }),
    ),
  complete: async (listing_id: string, photoId: string) =>
    data(
      await api.POST("/api/v1/listings/{listing_id}/photos/complete", {
        params: { path: { listing_id } },
        body: { photoId },
      }),
    ),
  removePhoto: async (listing_id: string, photo_id: string) =>
    data(
      await api.DELETE("/api/v1/listings/{listing_id}/photos/{photo_id}", {
        params: { path: { listing_id, photo_id } },
      }),
    ),
  publish: async (listing_id: string) =>
    data(
      await api.POST("/api/v1/listings/{listing_id}/publish", { params: { path: { listing_id } } }),
    ),
  deactivate: async (listing_id: string) =>
    data(
      await api.POST("/api/v1/listings/{listing_id}/deactivate", {
        params: { path: { listing_id } },
      }),
    ),
  addresses: async () => data(await api.GET(API_PATHS.addresses)),
  lookup: async (isbn: string) =>
    data(await api.GET("/api/v1/isbn/{isbn}", { params: { path: { isbn } } })),
  save: async (draft: ListingDraft, previous?: SellerListing) =>
    data(
      previous
        ? await api.PATCH("/api/v1/listings/{listing_id}", {
            params: { path: { listing_id: previous.id } },
            body: { ...draft, version: previous.version },
          })
        : await api.POST("/api/v1/listings", { body: draft }),
    ),
};
