import { api } from "@/lib/api/client";
import { problemSchema } from "@/lib/auth/schemas";
import { API_PATHS } from "@/lib/constants";
import type { ListingDraft, SellerListing } from "@/lib/types";

export class ListingRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(code ?? "listing_request_failed");
  }
}

const data = <T>(result: { data?: T; error?: unknown; response: Response }): T => {
  if (!result.response.ok || result.data === undefined)
    throw new ListingRequestError(
      result.response.status,
      problemSchema.safeParse(result.error).data?.code,
    );
  return result.data;
};

export const listingClient = {
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
