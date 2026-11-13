import type { components } from "@bookloop/api-client/schema";
import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/lib/constants";

import { listingHandlers } from "./listings";

type Schemas = components["schemas"];

const withRequestId = (init: ResponseInit = {}): ResponseInit => ({
  ...init,
  headers: { "X-Request-ID": crypto.randomUUID(), ...init.headers },
});

export const handlers = [
  ...listingHandlers,
  http.get(`${API_BASE_URL}/healthz`, () =>
    HttpResponse.json<Schemas["HealthResponse"]>({ status: "ok" }, withRequestId()),
  ),

  http.post<never, Schemas["SessionRequest"]>(
    `${API_BASE_URL}/api/v1/dev/session`,
    async ({ request }) => {
      const { role } = await request.json();
      return HttpResponse.json<Schemas["SessionResponse"]>({ role }, withRequestId());
    },
  ),

  http.post(`${API_BASE_URL}/api/v1/dev/seed`, () =>
    HttpResponse.json<Schemas["SeedResponse"]>({ seeded: 0 }, withRequestId()),
  ),

  http.post(`${API_BASE_URL}/api/v1/dev/reset`, () =>
    HttpResponse.json<Schemas["ResetResponse"]>({ reset: 0 }, withRequestId()),
  ),

  http.post<never, Schemas["ClockAdvanceRequest"]>(
    `${API_BASE_URL}/api/v1/dev/clock/advance`,
    async ({ request }) => {
      const { hours } = await request.json();
      const now = new Date(Date.now() + hours * 3_600_000).toISOString();
      return HttpResponse.json<Schemas["ClockResponse"]>(
        { now, advancedHours: hours },
        withRequestId(),
      );
    },
  ),
];
