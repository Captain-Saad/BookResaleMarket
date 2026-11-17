import { NEXT_PARAM, ROUTE_GUARDS, ROUTES } from "@/lib/constants";
import type { RouteGuard } from "@/lib/types";

export const findGuard = (pathname: string): RouteGuard | undefined =>
  ROUTE_GUARDS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const safeNextPath = (next: unknown): string => {
  const isSafe =
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\");
  return isSafe ? next : ROUTES.account;
};

export const loginPathFor = (pathname: string, search: string): string =>
  `${ROUTES.login}?${NEXT_PARAM}=${encodeURIComponent(`${pathname}${search}`)}`;
