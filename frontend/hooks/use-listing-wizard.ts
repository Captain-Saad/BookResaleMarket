import { useState, useEffect, type ChangeEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import { EMPTY_LISTING_DRAFT, LISTING_API } from "@/lib/constants";
import { listingDraft, normalizeIsbn, validIsbn, parsePrice } from "@/lib/listings";
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
  const [price, setPrice] = useState(
    initial?.priceMinor ? (initial.priceMinor / 100).toFixed(2) : "",
  );
  const [addresses, setAddresses] = useState<import("@/lib/types").Address[]>([]);
  useEffect(() => {
    let active = true;
    apiFetch("/api/v1/me/addresses")
      .then((result) => {
        if (active && result.ok) setAddresses(result.body as import("@/lib/types").Address[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const changePrice = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPrice(value);
    setDraft((current) => ({ ...current, priceMinor: parsePrice(value) }));
    setMessage("");
  };

  const change = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setDraft((current) => ({
      ...current,
      [name]: (name === "isbn" || name === "addressId") && !value ? null : value,
    }));
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
    if (step === 4 && parsePrice(price) === null) {
      setError(copy.priceInvalid);
      return;
    }
    if (!draft.title?.trim() || !draft.author?.trim()) {
      setError(copy.missing);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, copy.steps.length - 1));
  };
  const goToStep = (index: number) => () => {
    setError("");
    setStep(index);
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
      const saved = result.body as SellerListing;
      setListing(saved);
      setMessage(copy.saved);
      return saved;
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (
      (listing?.photos.length ?? 0) + files.length > 6 ||
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError(copy.photoInvalid);
      return;
    }
    let current = await save();
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        const ticket = await apiFetch(`${LISTING_API.listings}/${current.id}/photos/upload-url`, {
          method: "POST",
          body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
        });
        if (!ticket.ok) throw new Error();
        const { uploadUrl, photoId } =
          ticket.body as import("@bookloop/api-client/schema").components["schemas"]["PhotoUploadResponse"];
        const result = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error();
        const complete = await apiFetch(`${LISTING_API.listings}/${current.id}/photos/complete`, {
          method: "POST",
          body: JSON.stringify({ photoId }),
        });
        if (!complete.ok) throw new Error();
        current = complete.body as SellerListing;
        setListing(current);
      }
      setMessage(copy.saved);
    } catch {
      setError(copy.photoInvalid);
    } finally {
      setBusy(false);
    }
  };
  const removePhoto = (photoId: string) => async () => {
    if (!listing) return;
    setBusy(true);
    try {
      const result = await apiFetch(`${LISTING_API.listings}/${listing.id}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!result.ok) throw new Error();
      setListing(result.body as SellerListing);
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (
      !draft.title.trim() ||
      !draft.author.trim() ||
      !draft.priceMinor ||
      !draft.addressId ||
      !listing?.photos.length
    ) {
      setError(copy.publishIncomplete);
      return;
    }
    const saved = await save();
    if (!saved) return;
    setBusy(true);
    try {
      const result = await apiFetch(`${LISTING_API.listings}/${saved.id}/publish`, {
        method: "POST",
      });
      if (!result.ok) {
        setError(result.status === 403 ? copy.verifiedRequired : copy.failed);
        return;
      }
      setListing(result.body as SellerListing);
      setMessage(copy.published);
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };
  return {
    draft,
    listing,
    step,
    error,
    message,
    busy,
    change,
    lookup,
    next,
    back,
    goToStep,
    save,
    price,
    changePrice,
    addresses,
    upload,
    removePhoto,
    publish,
  };
};
export default useListingWizard;
