import { afterEach, expect, it, vi } from "vitest";
import { observePublic } from "@/lib/api/catalog";
import { PUBLIC_FRESHNESS_MS, PUBLIC_REFRESH_MS } from "@/lib/constants";

afterEach(() => vi.useRealTimers());
it("expires availability within two seconds when refresh hangs", async () => {
  vi.useFakeTimers();
  let finish: (value: number) => void = () => {};
  const pending = new Promise<number>((resolve) => {
    finish = resolve;
  });
  const load = vi.fn().mockResolvedValueOnce(1).mockReturnValue(pending);
  const next = vi.fn();
  const failed = vi.fn();
  const stop = observePublic(load, next, failed);
  await vi.advanceTimersByTimeAsync(0);
  expect(next).toHaveBeenCalledWith(1, expect.any(Number));
  await vi.advanceTimersByTimeAsync(PUBLIC_REFRESH_MS);
  expect(load).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(PUBLIC_FRESHNESS_MS - PUBLIC_REFRESH_MS);
  expect(failed).toHaveBeenCalled();
  stop();
  finish(2);
  await vi.advanceTimersByTimeAsync(0);
  expect(next).toHaveBeenCalledTimes(1);
});
it("aborts an outstanding request when its observer is disposed", () => {
  let signal: AbortSignal | undefined;
  const stop = observePublic(
    (value) => {
      signal = value;
      return new Promise<never>(() => {});
    },
    vi.fn(),
    vi.fn(),
  );
  stop();
  expect(signal?.aborted).toBe(true);
});

it("preserves the old snapshot deadline while loading another page", async () => {
  vi.useFakeTimers();
  const failed = vi.fn();
  const stop = observePublic(
    () => new Promise<never>(() => {}),
    vi.fn(),
    failed,
    Date.now() - 1500,
  );
  await vi.advanceTimersByTimeAsync(500);
  expect(failed).toHaveBeenCalled();
  stop();
});

it("rejects an overdue result even when its timeout callback has not run", async () => {
  vi.useFakeTimers();
  let finish: (value: number) => void = () => {};
  const pending = new Promise<number>((resolve) => {
    finish = resolve;
  });
  const next = vi.fn();
  const failed = vi.fn();
  const started = Date.now();
  const stop = observePublic(() => pending, next, failed);
  vi.setSystemTime(started + PUBLIC_FRESHNESS_MS + 1);
  finish(1);
  await Promise.resolve();
  await Promise.resolve();
  expect(next).not.toHaveBeenCalled();
  expect(failed).toHaveBeenCalled();
  stop();
});

it("backs off failed reads and restores normal freshness polling after recovery", async () => {
  vi.useFakeTimers();
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error("outage"))
    .mockRejectedValueOnce(new Error("outage"))
    .mockResolvedValue(1);
  const next = vi.fn();
  const failed = vi.fn();
  const stop = observePublic(load, next, failed);
  await vi.advanceTimersByTimeAsync(0);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(PUBLIC_REFRESH_MS);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(PUBLIC_REFRESH_MS);
  expect(load).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(4 * PUBLIC_REFRESH_MS);
  expect(load).toHaveBeenCalledTimes(3);
  expect(next).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(PUBLIC_REFRESH_MS);
  expect(load).toHaveBeenCalledTimes(4);
  stop();
});

it("starts successful refreshes on cadence despite network latency", async () => {
  vi.useFakeTimers();
  const load = vi.fn(() => new Promise<number>((resolve) => setTimeout(() => resolve(1), 800)));
  const next = vi.fn();
  const failed = vi.fn();
  const stop = observePublic(load, next, failed);
  await vi.advanceTimersByTimeAsync(1800);
  expect(load).toHaveBeenCalledTimes(2);
  expect(next).toHaveBeenCalledTimes(2);
  expect(failed).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(200);
  expect(load).toHaveBeenCalledTimes(3);
  expect(failed).not.toHaveBeenCalled();
  stop();
});
