import { http, HttpResponse } from "msw";
import { API_BASE_URL, API_PATHS } from "@/lib/constants";

const url = (path: string) => `${API_BASE_URL}${path}`;

const problem = (status: number, code: string) => HttpResponse.json({ status, code }, { status });

export const authMocks = [
  http.post<never, { email: string; password: string }>(
    url(API_PATHS.login),
    async ({ request }) => {
      const { email, password } = await request.json();
      if (email === "suspended@example.com") return problem(403, "account_suspended");
      if (password === "wrong-password") return problem(401, "invalid_credentials");
      return HttpResponse.json({});
    },
  ),
  http.post(url(API_PATHS.register), () => new HttpResponse(null, { status: 202 })),
  http.post(url(API_PATHS.forgotPassword), () => new HttpResponse(null, { status: 202 })),
  http.post(url(API_PATHS.resendVerification), () => new HttpResponse(null, { status: 202 })),
  http.post<never, { token: string }>(url(API_PATHS.resetPassword), async ({ request }) => {
    const { token } = await request.json();
    if (token !== "valid-token") return problem(400, "invalid_token");
    return new HttpResponse(null, { status: 204 });
  }),
  http.post<never, { token: string }>(url(API_PATHS.verifyEmail), async ({ request }) => {
    const { token } = await request.json();
    if (token !== "valid-token") return problem(400, "invalid_token");
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(url(API_PATHS.logout), () => new HttpResponse(null, { status: 204 })),
];
