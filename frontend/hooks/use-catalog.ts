import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo, type FormEvent } from "react";
import { catalogClient, observePublic } from "@/lib/api/catalog";
import { EMPTY_CATALOG_FILTERS } from "@/lib/constants";
import { catalogFilters, catalogForm, catalogParams } from "@/lib/catalog";
import { LoadStatus, type CatalogProps, type CatalogFilters } from "@/lib/types";

const useCatalog = ({
  copy,
  initialFilters = EMPTY_CATALOG_FILTERS,
  initial,
  initialError = "",
  syncUrl = false,
}: CatalogProps) => {
  const freshAt = useRef(0);
  const [localFilters, setFilters] = useState<CatalogFilters>(initialFilters);
  const searchParams = useSearchParams();
  const urlKey = syncUrl && searchParams ? searchParams.toString() : null;
  const urlState = useMemo(() => {
    if (urlKey === null) return { filters: localFilters, error: "" };
    try {
      return { filters: catalogFilters(new URLSearchParams(urlKey)), error: "" };
    } catch {
      return { filters: { ...EMPTY_CATALOG_FILTERS }, error: copy.invalidFilters };
    }
  }, [urlKey, localFilters, copy.invalidFilters]);
  const filters = urlState.filters;
  const filterKey = catalogParams(filters).toString();
  const [loadedKey, setLoadedKey] = useState(() => catalogParams(initialFilters).toString());
  const [page, setPage] = useState(initial);
  const [status, setStatus] = useState(initial ? LoadStatus.Ready : LoadStatus.Loading);
  const [error, setError] = useState(initialError);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [pages, setPages] = useState(1);
  const [attempt, setAttempt] = useState(0);
  useEffect(
    () =>
      observePublic(
        (signal) => catalogClient.pages(filters, pages, signal),
        (result, started) => {
          freshAt.current = started;
          setPage(result);
          setLoadedKey(filterKey);
          setStatus(LoadStatus.Ready);
          setMoreBusy(false);
          setError((current) => (current === copy.failed ? "" : current));
        },
        () => {
          setStatus(LoadStatus.Failed);
          setMoreBusy(false);
          setError(copy.failed);
        },
        freshAt.current,
      ),
    [filters, filterKey, pages, attempt, copy.failed],
  );
  useEffect(() => {
    if (!syncUrl) return;
    const restore = () => {
      freshAt.current = 0;
      try {
        if (urlKey === null)
          setFilters(catalogFilters(new URLSearchParams(window.location.search)));
        setError("");
        setStatus(LoadStatus.Loading);
        setPages(1);
        setMoreBusy(false);
      } catch {
        setError(copy.invalidFilters);
        setStatus(LoadStatus.Failed);
      }
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [syncUrl, urlKey, copy.invalidFilters]);
  const apply = (next: CatalogFilters) => {
    freshAt.current = 0;
    setError("");
    setStatus(LoadStatus.Loading);
    setMoreBusy(false);
    setPages(1);
    if (urlKey === null) setFilters(next);
    setMobileOpen(false);
    if (syncUrl) {
      const query = catalogParams(next).toString();
      window.history.pushState(null, "", `${copy.detailBase}${query ? `?${query}` : ""}`);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      apply(catalogForm(event.currentTarget, filters));
    } catch {
      setError(copy.invalidFilters);
    }
  };
  const retry = () => {
    freshAt.current = 0;
    setError("");
    setStatus(LoadStatus.Loading);
    setAttempt((value) => value + 1);
  };
  const more = () => {
    if (!page?.nextCursor || moreBusy) return;
    setMoreBusy(true);
    setPages((count) => count + 1);
  };
  return {
    filters,
    items: page?.items ?? [],
    cursor: page?.nextCursor,
    status: status === LoadStatus.Failed || loadedKey === filterKey ? status : LoadStatus.Loading,
    error: urlState.error || error,
    mobileOpen,
    setMobileOpen,
    moreBusy,
    submit,
    retry,
    reset: () => apply({ ...EMPTY_CATALOG_FILTERS }),
    more,
  };
};
export default useCatalog;
