import type { components } from "@bookloop/api-client/schema";
import { http, HttpResponse } from "msw";
import { API_BASE_URL, API_PATHS } from "@/lib/constants";

type Schemas = components["schemas"];

const withRequestId = (init: ResponseInit = {}): ResponseInit => ({
  ...init,
  headers: { "X-Request-ID": crypto.randomUUID(), ...init.headers },
});

const url = (path: string) => `${API_BASE_URL}${path}`;

const NEW_ACCOUNT = {
  email: "reader@example.com",
  emailVerified: true,
  displayName: "Ada Reader",
  phone: null as string | null,
  status: "active",
  roles: ["buyer"],
  sellerVerification: "not_started",
};

let account = { ...NEW_ACCOUNT };
let addresses: Array<Record<string, unknown>> = [];

export const resetMockAccount = () => {
  account = { ...NEW_ACCOUNT };
  addresses = [];
};

const accountHandlers = [
  http.get(url(API_PATHS.me), () => HttpResponse.json(account, withRequestId())),
  http.patch<never, { displayName: string; phone: string }>(
    url(API_PATHS.me),
    async ({ request }) => {
      const { displayName, phone } = await request.json();
      account = { ...account, displayName, phone: phone || null };
      return HttpResponse.json(account, withRequestId());
    },
  ),
  http.get(url(API_PATHS.addresses), () => HttpResponse.json(addresses, withRequestId())),
  http.post<never, Record<string, string>>(url(API_PATHS.addresses), async ({ request }) => {
    const created = { ...(await request.json()), id: crypto.randomUUID() };
    addresses = [...addresses, created];
    return HttpResponse.json(created, withRequestId({ status: 201 }));
  }),
  http.patch<{ id: string }, Record<string, string>>(
    url(`${API_PATHS.addresses}/:id`),
    async ({ params, request }) => {
      const changes = await request.json();
      addresses = addresses.map((item) => (item.id === params.id ? { ...item, ...changes } : item));
      return HttpResponse.json(
        addresses.find((item) => item.id === params.id),
        withRequestId(),
      );
    },
  ),
  http.delete<{ id: string }>(url(`${API_PATHS.addresses}/:id`), ({ params }) => {
    addresses = addresses.filter((item) => item.id !== params.id);
    return new HttpResponse(null, withRequestId({ status: 204 }));
  }),
  http.post(url(API_PATHS.becomeSeller), () => {
    account = { ...account, roles: [...account.roles, "seller"] };
    return HttpResponse.json(account, withRequestId());
  }),
  http.post(url(API_PATHS.sellerVerification), () => {
    account = { ...account, sellerVerification: "pending" };
    return HttpResponse.json(account, withRequestId());
  }),
];

export const handlers = [
  ...accountHandlers,

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
