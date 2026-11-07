import type { components } from "@bookloop/api-client/schema";
import { http, HttpResponse } from "msw";
import { API_BASE_URL, API_PATHS } from "@/lib/constants";

type Schemas = components["schemas"];

const withRequestId = (init: ResponseInit = {}): ResponseInit => ({
  ...init,
  headers: { "X-Request-ID": crypto.randomUUID(), ...init.headers },
});

const problem = (status: number, code: string) =>
  HttpResponse.json({ status, code }, withRequestId({ status }));

const url = (path: string) => `${API_BASE_URL}${path}`;

const authHandlers = [
  http.post<never, { email: string; password: string }>(
    url(API_PATHS.login),
    async ({ request }) => {
      const { email, password } = await request.json();
      if (email === "suspended@example.com") return problem(403, "account_suspended");
      if (password === "wrong-password") return problem(401, "invalid_credentials");
      return new HttpResponse(null, withRequestId({ status: 204 }));
    },
  ),
  http.post<never, { email: string }>(url(API_PATHS.register), async ({ request }) => {
    const { email } = await request.json();
    if (email === "taken@example.com") return problem(409, "email_taken");
    return new HttpResponse(null, withRequestId({ status: 202 }));
  }),
  http.post(
    url(API_PATHS.forgotPassword),
    () => new HttpResponse(null, withRequestId({ status: 202 })),
  ),
  http.post(
    url(API_PATHS.resendVerification),
    () => new HttpResponse(null, withRequestId({ status: 202 })),
  ),
  http.post<never, { token: string }>(url(API_PATHS.resetPassword), async ({ request }) => {
    const { token } = await request.json();
    if (token !== "valid-token") return problem(400, "invalid_token");
    return new HttpResponse(null, withRequestId({ status: 204 }));
  }),
  http.post<never, { currentPassword: string }>(
    url(API_PATHS.changePassword),
    async ({ request }) => {
      const { currentPassword } = await request.json();
      if (currentPassword === "wrong-password") return problem(400, "invalid_current_password");
      return new HttpResponse(null, withRequestId({ status: 204 }));
    },
  ),
  http.post<never, { token: string }>(url(API_PATHS.verifyEmail), async ({ request }) => {
    const { token } = await request.json();
    if (token !== "valid-token") return problem(400, "invalid_token");
    return new HttpResponse(null, withRequestId({ status: 204 }));
  }),
];

export const handlers = [
  ...authHandlers,

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
