import { useState, type ChangeEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import { EMPTY_LISTING_DRAFT, LISTING_API } from "@/lib/constants";
import { listingDraft, normalizeIsbn, validIsbn } from "@/lib/listings";
import type { IsbnMetadata, ListingCopy, ListingDraft, SellerListing } from "@/lib/types";

const useListingWizard = (copy: ListingCopy, initial?: SellerListing) => {
  const [draft, setDraft] = useState<ListingDraft>(() =>
    initial ? listingDraft(initial) : { ...EMPTY_LISTING_DRAFT },
  );
  const [listing, setListing] = useState(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setMessage("");
  };
  const lookup = async () => {
    const isbn = normalizeIsbn(draft.isbn ?? "");
    if (!validIsbn(isbn)) {
      setError(copy.invalidIsbn);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch(`${LISTING_API.isbn}/${isbn}`);
      if (!result.ok) {
        setError(copy.lookupFailed);
        return;
      }
      const book = result.body as IsbnMetadata;
      if (!book.found) {
        setMessage(copy.lookupMissing);
        return;
      }
      setDraft((current) => ({
        ...current,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
      }));
    } catch {
      setError(copy.lookupFailed);
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    if (!draft.title?.trim() || !draft.author?.trim()) {
      setError(copy.missing);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, copy.steps.length - 1));
  };
  const back = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  };
  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch(
        listing ? `${LISTING_API.listings}/${listing.id}` : LISTING_API.listings,
        {
          method: listing ? "PATCH" : "POST",
          body: JSON.stringify({ ...draft, ...(listing && { version: listing.version }) }),
        },
      );
      if (!result.ok) {
        setError(copy.failed);
        return;
      }
      setListing(result.body as SellerListing);
      setMessage(copy.saved);
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };
  return { draft, listing, step, error, message, busy, change, lookup, next, back, save };
};
export default useListingWizard;
