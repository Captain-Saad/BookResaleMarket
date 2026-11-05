import { type NextRequest, NextResponse } from "next/server";
import { findGuard, loginPathFor } from "@/lib/auth/guards";
import { problemSchema } from "@/lib/auth/schemas";
import { API_BASE_URL, API_PATHS, GUARD_TIMEOUT_MS, ROUTES, SESSION_COOKIE } from "@/lib/constants";
import { type Account, ProblemCode } from "@/lib/types";

const redirectTo = (request: NextRequest, path: string) =>
  NextResponse.redirect(new URL(path, request.url));

export const proxy = async (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const guard = findGuard(pathname);
  if (!guard) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE);
  if (!session) return redirectTo(request, loginPathFor(pathname, search));

  try {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.me}`, {
      headers: { cookie: `${SESSION_COOKIE}=${session.value}` },
      signal: AbortSignal.timeout(GUARD_TIMEOUT_MS),
    });
    if (response.status === 401) return redirectTo(request, loginPathFor(pathname, search));
    if (response.status === 403) {
      const { data } = problemSchema.safeParse(await response.json());
      if (data?.code === ProblemCode.AccountSuspended) {
        return redirectTo(request, ROUTES.suspended);
      }
    }
    if (guard.role && response.ok) {
      const { roles }: Account = await response.json();
      if (!roles.includes(guard.role)) return redirectTo(request, ROUTES.home);
    }
  } catch {
    return NextResponse.next();
  }
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/account/:path*",
    "/orders/:path*",
    "/sell/:path*",
    "/warehouse/:path*",
    "/courier/:path*",
    "/admin/:path*",
  ],
};
