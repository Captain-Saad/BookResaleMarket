import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, apiFetch } from "@/lib/api/client";
import { API_PATHS, ROUTES } from "@/lib/constants";

const useAccountNav = () => {
  const router = useRouter();
  const [roles, setRoles] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;
    api
      .GET(API_PATHS.me)
      .then(({ data }) => {
        if (active && data) setRoles(data.roles);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch(API_PATHS.logout, { method: "POST" }).catch(() => undefined);
    router.push(ROUTES.home);
    router.refresh();
  }, [router]);

  return { roles, signOut };
};

export default useAccountNav;
