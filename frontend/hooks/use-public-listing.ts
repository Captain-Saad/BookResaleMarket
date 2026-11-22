import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { CATALOG_API } from "@/lib/constants";
import { LoadStatus, type PublicBookDetail, type DetailCopy } from "@/lib/types";

const usePublicListing = (id: string, copy: DetailCopy, initial?: PublicBookDetail) => {
  const [book, setBook] = useState(initial);
  const [status, setStatus] = useState(initial ? LoadStatus.Ready : LoadStatus.Loading);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${CATALOG_API}/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok) {
          setError(result.status === 404 ? copy.notFound : copy.failed);
          setStatus(LoadStatus.Failed);
          return;
        }
        setBook(result.body as PublicBookDetail);
        setStatus(LoadStatus.Ready);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(copy.failed);
          setStatus(LoadStatus.Failed);
        }
      });
    return () => controller.abort();
  }, [id, attempt, copy.notFound, copy.failed]);
  const retry = () => {
    setStatus(LoadStatus.Loading);
    setError("");
    setAttempt((value) => value + 1);
  };
  return { book, status, error, retry };
};
export default usePublicListing;
