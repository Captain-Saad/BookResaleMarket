import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { listingClient, ListingRequestError } from "@/lib/api/listings";
import { EMPTY_LISTING_DRAFT } from "@/lib/constants";
import { listingDraft, normalizeIsbn, validIsbn, parsePrice } from "@/lib/listings";
import { ProblemCode, type ListingCopy, ListingDraft, SellerListing } from "@/lib/types";

const useListingWizard = (copy: ListingCopy, initial?: SellerListing) => {
  const [draft, setDraft] = useState<ListingDraft>(() =>
    initial ? listingDraft(initial) : { ...EMPTY_LISTING_DRAFT },
  );
  const [listing, setListingState] = useState(initial);
  const listingRef = useRef(initial);
  const setListing = (value: SellerListing) => {
    listingRef.current = value;
    setListingState(value);
  };
  const router = useRouter();
  const pathname = usePathname();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const savedDraft = useRef(JSON.stringify(initial ? listingDraft(initial) : EMPTY_LISTING_DRAFT));
  const [edited, setEdited] = useState(false);
  const [autosavePaused, setAutosavePaused] = useState(false);
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);
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
    listingClient
      .addresses()
      .then((items) => {
        if (active) setAddresses(items);
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
    setEdited(true);
    setAutosavePaused(false);
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
    setEdited(true);
    setAutosavePaused(false);
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
      const book = await listingClient.lookup(isbn);
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
      setEdited(true);
      setAutosavePaused(false);
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
  const reportFailure = useCallback(
    (failure: unknown) => {
      if (failure instanceof ListingRequestError) {
        if (failure.status === 401) router.push(`/login?next=${encodeURIComponent(pathname)}`);
        if (failure.code === ProblemCode.AccountSuspended) router.push("/suspended");
        const messages = new Map<string, string>([
          [ProblemCode.StaleListing, copy.stale],
          [ProblemCode.SellerNotVerified, copy.verifiedRequired],
          [ProblemCode.InvalidPhoto, copy.photoInvalid],
          [ProblemCode.PhotoLimitReached, copy.photoInvalid],
          [ProblemCode.PhotoUploadExpired, copy.photoInvalid],
          [ProblemCode.ListingPurchaseLocked, copy.purchased],
          [ProblemCode.ListingIdentityLocked, copy.locked],
        ]);
        setError(messages.get(failure.code ?? "") ?? copy.failed);
      } else setError(copy.failed);
    },
    [copy, pathname, router],
  );
  const persist = useCallback(
    (snapshot: ListingDraft) => {
      const work = queue.current.then(async () => {
        if (listingRef.current && JSON.stringify(snapshot) === savedDraft.current)
          return listingRef.current;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const saved = await listingClient.save(snapshot, listingRef.current);
          listingRef.current = saved;
          setListingState(saved);
          savedDraft.current = JSON.stringify(snapshot);
          if (JSON.stringify(latestDraft.current) === savedDraft.current) setMessage(copy.saved);
          setAutosavePaused(false);
          return saved;
        } catch (failure) {
          reportFailure(failure);
          setAutosavePaused(true);
        } finally {
          setBusy(false);
        }
      });
      queue.current = work.then(
        () => undefined,
        () => undefined,
      );
      return work;
    },
    [copy.saved, reportFailure],
  );
  const save = () => persist(draft);
  useEffect(() => {
    if (
      !edited ||
      busy ||
      autosavePaused ||
      listing?.purchaseLocked ||
      JSON.stringify(draft) === savedDraft.current ||
      (draft.isbn && !validIsbn(normalizeIsbn(draft.isbn)))
    )
      return;
    const timer = setTimeout(() => {
      void persist(draft);
    }, 800);
    return () => clearTimeout(timer);
  }, [draft, edited, busy, autosavePaused, listing?.purchaseLocked, persist]);
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
        const { uploadUrl, photoId } = await listingClient.ticket(current.id, file);
        const result = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error();
        current = await listingClient.complete(current.id, photoId);
        setListing(current);
      }
      setMessage(copy.saved);
    } catch (failure) {
      if (failure instanceof ListingRequestError) reportFailure(failure);
      else setError(copy.photoInvalid);
    } finally {
      setBusy(false);
    }
  };
  const removePhoto = (photoId: string) => async () => {
    if (!listing) return;
    setBusy(true);
    try {
      setListing(await listingClient.removePhoto(listing.id, photoId));
    } catch (failure) {
      reportFailure(failure);
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
      setListing(await listingClient.publish(saved.id));
      setMessage(copy.published);
    } catch (failure) {
      reportFailure(failure);
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
