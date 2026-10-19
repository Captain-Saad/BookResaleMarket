import type { paths } from "@bookloop/api-client/schema";
import createClient, { type Middleware } from "openapi-fetch";
import { API_BASE_URL } from "@/lib/constants";

export type ApiResult = {
  status: number;
  ok: boolean;
  requestId: string | null;
  body: unknown;
};

const MAX_REQUEST_IDS = 10;
const NO_REQUEST_IDS: readonly string[] = [];

let recentRequestIds = NO_REQUEST_IDS;
const listeners = new Set<() => void>();

export const subscribeToRequestIds = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getRecentRequestIds = () => recentRequestIds;
export const getNoRequestIds = () => NO_REQUEST_IDS;

const recordRequestId = (requestId: string) => {
  recentRequestIds = [requestId, ...recentRequestIds].slice(0, MAX_REQUEST_IDS);
  listeners.forEach((listener) => listener());
};

export const apiFetch = async (path: string, init: RequestInit = {}): Promise<ApiResult> => {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const requestId = response.headers.get("X-Request-ID");
  if (requestId) recordRequestId(requestId);

  const isJson = response.headers.get("Content-Type")?.includes("json") ?? false;
  const body: unknown = isJson ? await response.json() : await response.text();
  return { status: response.status, ok: response.ok, requestId, body };
};

const requestIdMiddleware: Middleware = {
  onResponse({ response }) {
    const requestId = response.headers.get("X-Request-ID");
    if (requestId) recordRequestId(requestId);
    return undefined;
  },
};

export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: (request) => globalThis.fetch(request),
});
api.use(requestIdMiddleware);
