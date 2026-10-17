import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/lib/constants";

const withRequestId = (init: ResponseInit = {}): ResponseInit => ({
  ...init,
  headers: { "X-Request-ID": crypto.randomUUID(), ...init.headers },
});

const readJson = async (request: Request): Promise<Record<string, unknown>> => {
  const body: unknown = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
};

export const handlers = [
  http.get(`${API_BASE_URL}/healthz`, () => HttpResponse.json({ status: "ok" }, withRequestId())),

  http.post(`${API_BASE_URL}/api/v1/dev/session`, async ({ request }) => {
    const { role } = await readJson(request);
    return HttpResponse.json({ role }, withRequestId());
  }),

  http.post(`${API_BASE_URL}/api/v1/dev/seed`, () =>
    HttpResponse.json({ seeded: true }, withRequestId()),
  ),

  http.post(`${API_BASE_URL}/api/v1/dev/reset`, () =>
    HttpResponse.json({ reset: true }, withRequestId()),
  ),

  http.post(`${API_BASE_URL}/api/v1/dev/clock/advance`, async ({ request }) => {
    const { hours } = await readJson(request);
    return HttpResponse.json({ advancedHours: hours }, withRequestId());
  }),
];
