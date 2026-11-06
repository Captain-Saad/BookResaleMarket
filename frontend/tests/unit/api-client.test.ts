import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { api, apiFetch, getRecentRequestIds } from "@/lib/api/client";
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

describe("apiFetch with an empty body", () => {
  it("handles a 204 that is labelled as JSON", async () => {
    server.use(
      http.post(
        `${API_BASE_URL}/empty`,
        () =>
          new HttpResponse(null, { status: 204, headers: { "Content-Type": "application/json" } }),
      ),
    );
    const result = await apiFetch("/empty", { method: "POST" });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
    expect(result.body).toBe("");
  });
});

describe("api (typed client generated from OpenAPI)", () => {
  it("returns typed data and records the request ID", async () => {
    const { data, response } = await api.GET("/healthz");
    expect(data?.status).toBe("ok");
    expect(getRecentRequestIds()[0]).toBe(response.headers.get("X-Request-ID"));
  });

  it("sends typed request bodies", async () => {
    const { data } = await api.POST("/api/v1/dev/clock/advance", { body: { hours: 24 } });
    expect(data?.advancedHours).toBe(24);
  });
});
