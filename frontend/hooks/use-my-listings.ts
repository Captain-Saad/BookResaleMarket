import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { listingClient, ListingRequestError } from "@/lib/api/listings";
import {
  LoadStatus,
  ProblemCode,
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
  const router = useRouter();
  const pathname = usePathname();
  const fail = useCallback(
    (failure: unknown) => {
      if (failure instanceof ListingRequestError) {
        if (failure.status === 401) router.push(`/login?next=${encodeURIComponent(pathname)}`);
        if (failure.code === ProblemCode.AccountSuspended) router.push("/suspended");
        setError(
          failure.status === 401
            ? copy.signIn
            : failure.status === 403
              ? copy.forbidden
              : copy.failed,
        );
      } else setError(copy.failed);
      setStatus(LoadStatus.Failed);
    },
    [copy, router, pathname],
  );
  const accept = useCallback((data: SellerListingPage, append = false) => {
    setItems((current) => (append ? [...current, ...data.items] : data.items));
    setCursor(data.nextCursor);
    setStatus(LoadStatus.Ready);
  }, []);
  const load = async (next?: string) => {
    try {
      accept(await listingClient.page(next), !!next);
    } catch (failure) {
      fail(failure);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    listingClient
      .page(undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) accept(result);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) fail(failure);
      });
    return () => controller.abort();
  }, [accept, fail]);
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
      await listingClient.deactivate(deactivating.id);
      close();
      await load();
    } catch (failure) {
      fail(failure);
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
