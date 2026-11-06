import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { API_PATHS } from "@/lib/constants";
import { VerifyEmailStatus } from "@/lib/types";

const useVerifyEmail = (token: string) => {
  const [status, setStatus] = useState(VerifyEmailStatus.Pending);
  const submittedToken = useRef<string | null>(null);

  useEffect(() => {
    if (submittedToken.current === token) return;
    submittedToken.current = token;
    apiFetch(API_PATHS.verifyEmail, { method: "POST", body: JSON.stringify({ token }) })
      .then(({ ok }) => setStatus(ok ? VerifyEmailStatus.Verified : VerifyEmailStatus.Invalid))
      .catch(() => setStatus(VerifyEmailStatus.Invalid));
  }, [token]);

  return status;
};

export default useVerifyEmail;
