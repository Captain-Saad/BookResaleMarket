import { useCallback, useEffect, useState } from "react";
import { apiFetch, type ApiResult } from "@/lib/api/client";
import { LISTING_API } from "@/lib/constants";
import {
  LoadStatus,
  type ListingCopy,
  type SellerListing,
  type SellerListingPage,
} from "@/lib/types";

const useMyListings = (copy: ListingCopy) => {
  const [items, setItems] = useState<SellerListing[]>([]);
  const [status, setStatus] = useState(LoadStatus.Loading);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<SellerListing>();
  const [deactivating, setDeactivating] = useState<SellerListing>();
  const accept = useCallback(
    (result: ApiResult, append = false) => {
      if (!result.ok) {
        setError(
          result.status === 401
            ? copy.signIn
            : result.status === 403
              ? copy.forbidden
              : copy.failed,
        );
        setStatus(LoadStatus.Failed);
        return;
      }
      const data = result.body as SellerListingPage;
      setItems((current) => (append ? [...current, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setStatus(LoadStatus.Ready);
    },
    [copy],
  );
  const load = async (next?: string) => {
    try {
      accept(await apiFetch(`${LISTING_API.mine}${next ? `?cursor=${next}` : ""}`), !!next);
    } catch {
      setError(copy.failed);
      setStatus(LoadStatus.Failed);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(LISTING_API.mine, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) accept(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(copy.failed);
          setStatus(LoadStatus.Failed);
        }
      });
    return () => controller.abort();
  }, [accept, copy]);
  const retry = () => {
    setStatus(LoadStatus.Loading);
    setError("");
    void load();
  };
  const more = () => {
    if (cursor) void load(cursor);
  };
  const edit = (item: SellerListing) => () => setEditing(item);
  const askDeactivate = (item: SellerListing) => () => setDeactivating(item);
  const close = () => setDeactivating(undefined);
  const setOpen = (open: boolean) => {
    if (!open) close();
  };
  const deactivate = async () => {
    if (!deactivating) return;
    try {
      const result = await apiFetch(`${LISTING_API.listings}/${deactivating.id}/deactivate`, {
        method: "POST",
      });
      if (!result.ok) throw new Error();
      close();
      await load();
    } catch {
      setError(copy.failed);
    }
  };
  return {
    items,
    status,
    error,
    editing,
    deactivating,
    cursor,
    retry,
    more,
    edit,
    askDeactivate,
    close,
    setOpen,
    deactivate,
  };
};
export default useMyListings;
