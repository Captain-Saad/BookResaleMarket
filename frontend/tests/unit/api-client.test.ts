import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiFetch, getRecentRequestIds } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/constants";
import { server } from "../utils/msw";

describe("apiFetch", () => {
  it("returns status, parsed JSON and records the request ID", async () => {
    const result = await apiFetch("/healthz");
    expect(result).toMatchObject({ status: 200, ok: true, body: { status: "ok" } });
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(getRecentRequestIds()[0]).toBe(result.requestId);
  });

  it("sends JSON headers and parses problem+json errors", async () => {
    let receivedAccept: string | null = null;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/dev/seed`, ({ request }) => {
        receivedAccept = request.headers.get("Accept");
        return HttpResponse.json(
          { type: "about:blank", title: "Forbidden", status: 403, code: "dev_forbidden" },
          { status: 403, headers: { "Content-Type": "application/problem+json" } },
        );
      }),
    );
    const result = await apiFetch("/api/v1/dev/seed", { method: "POST", body: "{}" });
    expect(receivedAccept).toBe("application/json");
    expect(result).toMatchObject({ status: 403, ok: false, body: { code: "dev_forbidden" } });
    expect(result.requestId).toBeNull();
  });

  it("keeps only the ten most recent request IDs", async () => {
    for (let i = 0; i < 12; i++) await apiFetch("/healthz");
    expect(getRecentRequestIds()).toHaveLength(10);
  });
});
