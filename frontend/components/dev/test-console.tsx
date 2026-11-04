"use client";

import { Wrench } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Drawer from "@/components/ui/drawer";
import Select from "@/components/ui/select";
import {
  apiFetch,
  type ApiResult,
  getNoRequestIds,
  getRecentRequestIds,
  subscribeToRequestIds,
} from "@/lib/api/client";
import { API_BASE_URL, API_MOCKING, COMMIT_SHA, DEV_ROLES, OVERLAY_LABELS } from "@/lib/constants";

type MockStatus = "off" | "starting" | "on";

const canMock = () =>
  API_MOCKING && typeof navigator !== "undefined" && "serviceWorker" in navigator;

const TestConsole = () => {
  const [open, setOpen] = useState(false);
  const [mockStatus, setMockStatus] = useState<MockStatus>(() => (canMock() ? "starting" : "off"));
  const [role, setRole] = useState<string>(DEV_ROLES[0].value);
  const [lastResult, setLastResult] = useState<ApiResult | null>(null);
  const requestIds = useSyncExternalStore(
    subscribeToRequestIds,
    getRecentRequestIds,
    getNoRequestIds,
  );

  useEffect(() => {
    if (!canMock()) return;
    import("@/lib/api/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledFrame: "bypass", quiet: true }))
      .then(() => setMockStatus("on"))
      .catch(() => setMockStatus("off"));
  }, []);

  const call = async (path: string, init?: RequestInit) => {
    try {
      setLastResult(await apiFetch(path, init));
    } catch (error) {
      setLastResult({ status: 0, ok: false, requestId: null, body: String(error) });
    }
  };

  const post = (path: string, body: Record<string, unknown> = {}) =>
    call(path, { method: "POST", body: JSON.stringify(body) });

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Open dev test console"
        className="fixed end-3 bottom-24 z-30 md:bottom-3"
        onClick={() => setOpen(true)}
      >
        <Wrench aria-hidden="true" className="size-5" />
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Dev test console"
        description="Development only. Not included in production builds."
        closeLabel={OVERLAY_LABELS.close}
      >
        <div className="flex flex-col gap-6 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-ink-3">API</dt>
            <dd className="font-mono break-all">{API_BASE_URL}</dd>
            <dt className="text-ink-3">Mocks</dt>
            <dd>
              <Badge tone={mockStatus === "on" ? "success" : "neutral"}>{mockStatus}</Badge>
            </dd>
            <dt className="text-ink-3">Commit</dt>
            <dd className="font-mono">{COMMIT_SHA}</dd>
          </dl>

          <section aria-labelledby="console-session" className="flex flex-col gap-2">
            <h3 id="console-session" className="font-medium text-ink-1">
              Session
            </h3>
            <label htmlFor="console-role" className="text-ink-2">
              Act as
            </label>
            <Select id="console-role" value={role} onValueChange={setRole} options={DEV_ROLES} />
            <Button variant="secondary" onClick={() => post("/api/v1/dev/session", { role })}>
              Switch role
            </Button>
          </section>

          <section aria-labelledby="console-data" className="flex flex-col gap-2">
            <h3 id="console-data" className="font-medium text-ink-1">
              Data and time
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => post("/api/v1/dev/seed")}>
                Seed data
              </Button>
              <Button variant="secondary" onClick={() => post("/api/v1/dev/reset")}>
                Reset data
              </Button>
              <Button
                variant="secondary"
                onClick={() => post("/api/v1/dev/clock/advance", { hours: 24 })}
              >
                Clock +24h
              </Button>
              <Button variant="secondary" onClick={() => call("/healthz")}>
                Check health
              </Button>
            </div>
          </section>

          <section
            aria-labelledby="console-last"
            aria-live="polite"
            className="flex flex-col gap-2"
          >
            <h3 id="console-last" className="font-medium text-ink-1">
              Last response
            </h3>
            {lastResult ? (
              <>
                <p>
                  <Badge tone={lastResult.ok ? "success" : "danger"}>
                    {lastResult.status || "network error"}
                  </Badge>
                </p>
                <pre className="rounded-md bg-glass-1 p-3 font-mono text-xs break-all whitespace-pre-wrap">
                  {JSON.stringify(lastResult.body, null, 2)}
                </pre>
              </>
            ) : (
              <p className="text-ink-3">No requests yet.</p>
            )}
          </section>

          <section aria-labelledby="console-ids" className="flex flex-col gap-2">
            <h3 id="console-ids" className="font-medium text-ink-1">
              Recent request IDs
            </h3>
            {requestIds.length > 0 ? (
              <ol className="flex flex-col gap-1 font-mono text-xs break-all">
                {requestIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ol>
            ) : (
              <p className="text-ink-3">None yet.</p>
            )}
          </section>
        </div>
      </Drawer>
    </>
  );
};

export default TestConsole;
