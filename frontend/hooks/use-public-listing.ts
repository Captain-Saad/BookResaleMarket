import { useEffect, useState, useRef } from "react";
import { catalogClient, observePublic, PublicRequestError } from "@/lib/api/catalog";
import { LoadStatus, type PublicBookDetail, type DetailCopy } from "@/lib/types";

const usePublicListing = (id: string, copy: DetailCopy, initial?: PublicBookDetail) => {
  const freshAt = useRef(0);
  const [book, setBook] = useState(initial);
  const [status, setStatus] = useState(initial ? LoadStatus.Ready : LoadStatus.Loading);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(
    () =>
      observePublic(
        (signal) => catalogClient.detail(id, signal),
        (result, started) => {
          freshAt.current = started;
          setBook(result);
          setStatus(LoadStatus.Ready);
          setError("");
        },
        (error) => {
          setError(
            error instanceof PublicRequestError && (error.status === 404 || error.status === 422)
              ? copy.notFound
              : copy.failed,
          );
          setStatus(LoadStatus.Failed);
        },
        freshAt.current,
      ),
    [id, attempt, copy.notFound, copy.failed],
  );
  const retry = () => {
    freshAt.current = 0;
    setStatus(LoadStatus.Loading);
    setError("");
    setAttempt((value) => value + 1);
  };
  return { book, status, error, retry };
};
export default usePublicListing;
