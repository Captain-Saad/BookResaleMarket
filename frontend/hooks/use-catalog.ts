import { useEffect, useState, useRef, type FormEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import { CATALOG_API, EMPTY_CATALOG_FILTERS } from "@/lib/constants";
import { catalogForm, catalogParams } from "@/lib/catalog";
import {
  LoadStatus,
  type CatalogCopy,
  type CatalogFilters,
  type PublicBook,
  type PublicBookPage,
} from "@/lib/types";

const useCatalog = (copy: CatalogCopy) => {
  const [filters, setFilters] = useState<CatalogFilters>({ ...EMPTY_CATALOG_FILTERS });
  const [items, setItems] = useState<PublicBook[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState(LoadStatus.Loading);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const moreRequest = useRef<AbortController | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${CATALOG_API}?${catalogParams(filters)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok) {
          setStatus(LoadStatus.Failed);
          setError(copy.failed);
          return;
        }
        const page = result.body as PublicBookPage;
        setItems(page.items);
        setCursor(page.nextCursor);
        setStatus(LoadStatus.Ready);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(copy.failed);
          setStatus(LoadStatus.Failed);
        }
      });
    return () => {
      controller.abort();
      moreRequest.current?.abort();
    };
  }, [filters, attempt, copy.failed]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const next = catalogForm(event.currentTarget, filters);
      moreRequest.current?.abort();
      setMoreBusy(false);
      setError("");
      setStatus(LoadStatus.Loading);
      setFilters(next);
      setMobileOpen(false);
    } catch {
      setError(copy.invalidFilters);
    }
  };
  const retry = () => {
    setError("");
    setStatus(LoadStatus.Loading);
    setAttempt((value) => value + 1);
  };
  const reset = () => {
    moreRequest.current?.abort();
    setMoreBusy(false);
    setError("");
    setStatus(LoadStatus.Loading);
    setFilters({ ...EMPTY_CATALOG_FILTERS });
    setMobileOpen(false);
  };
  const more = async () => {
    if (!cursor || moreBusy) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    setMoreBusy(true);
    try {
      const result = await apiFetch(`${CATALOG_API}?${catalogParams(filters, cursor)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (controller.signal.aborted) return;
      if (!result.ok) throw new Error();
      const page = result.body as PublicBookPage;
      setItems((current) => [
        ...new Map([...current, ...page.items].map((item) => [item.id, item])).values(),
      ]);
      setCursor(page.nextCursor);
    } catch {
      if (!controller.signal.aborted) setError(copy.failed);
    } finally {
      if (moreRequest.current === controller) {
        moreRequest.current = null;
        setMoreBusy(false);
      }
    }
  };
  return {
    filters,
    items,
    cursor,
    status,
    error,
    mobileOpen,
    setMobileOpen,
    moreBusy,
    submit,
    retry,
    reset,
    more,
  };
};
export default useCatalog;
