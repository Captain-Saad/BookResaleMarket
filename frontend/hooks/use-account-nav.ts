import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { accountSchema } from "@/lib/auth/schemas";
import { API_PATHS, ROUTES } from "@/lib/constants";

const useAccountNav = () => {
  const router = useRouter();
  const [roles, setRoles] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch(API_PATHS.me)
      .then(({ body }) => {
        const { data } = accountSchema.safeParse(body);
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
