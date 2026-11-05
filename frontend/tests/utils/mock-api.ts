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

export const accountMocks = [
  http.get(url(API_PATHS.me), () => HttpResponse.json(account)),
  http.patch<never, { displayName: string; phone: string }>(
    url(API_PATHS.me),
    async ({ request }) => {
      const { displayName, phone } = await request.json();
      account = { ...account, displayName, phone: phone || null };
      return HttpResponse.json(account);
    },
  ),
  http.get(url(API_PATHS.addresses), () => HttpResponse.json(addresses)),
  http.post<never, Record<string, string>>(url(API_PATHS.addresses), async ({ request }) => {
    const created = { ...(await request.json()), id: crypto.randomUUID() };
    addresses = [...addresses, created];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch<{ id: string }, Record<string, string>>(
    url(`${API_PATHS.addresses}/:id`),
    async ({ params, request }) => {
      const changes = await request.json();
      addresses = addresses.map((item) => (item.id === params.id ? { ...item, ...changes } : item));
      return HttpResponse.json(addresses.find((item) => item.id === params.id));
    },
  ),
  http.delete<{ id: string }>(url(`${API_PATHS.addresses}/:id`), ({ params }) => {
    addresses = addresses.filter((item) => item.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(url(API_PATHS.becomeSeller), () => {
    account = { ...account, roles: [...account.roles, "seller"] };
    return HttpResponse.json(account);
  }),
  http.post(url(API_PATHS.sellerVerification), () => {
    account = { ...account, sellerVerification: "pending" };
    return HttpResponse.json(account);
  }),
];
