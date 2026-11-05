import { describe, expect, it } from "vitest";
import { findGuard, loginPathFor, safeNextPath } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants";
import { UserRole } from "@/lib/types";

describe("findGuard", () => {
  it.each(["/account", "/account/addresses", "/orders", "/sell/new"])("protects %s", (path) => {
    expect(findGuard(path)).toBeDefined();
  });

  it.each(["/", "/search", "/login", "/accounting", "/administrator"])("leaves %s open", (path) => {
    expect(findGuard(path)).toBeUndefined();
  });

  it("requires the right role for staff areas", () => {
    expect(findGuard("/admin")?.role).toBe(UserRole.Admin);
    expect(findGuard("/warehouse/inbound")?.role).toBe(UserRole.Warehouse);
    expect(findGuard("/courier")?.role).toBe(UserRole.Courier);
    expect(findGuard("/account")?.role).toBeUndefined();
  });
});

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/account/addresses?tab=1")).toBe("/account/addresses?tab=1");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\\\evil.example",
    "evil.example",
    "",
    undefined,
    ["/account"],
  ])("rejects %s", (next) => {
    expect(safeNextPath(next)).toBe(ROUTES.account);
  });
});

describe("loginPathFor", () => {
  it("remembers where the user was going", () => {
    expect(loginPathFor("/orders", "?page=2")).toBe("/login?next=%2Forders%3Fpage%3D2");
  });
});
