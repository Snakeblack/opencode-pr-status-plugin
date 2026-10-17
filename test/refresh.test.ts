import { describe, expect, it, vi } from "vitest";

import { createRefresher } from "../src/refresh";

function fakeTimers() {
  let callback: (() => void) | undefined;
  let scheduled = 0;
  let cancelled = 0;
  let interval: number | undefined;
  return {
    schedule: (next: () => void, intervalMs: number) => {
      scheduled += 1;
      callback = next;
      interval = intervalMs;
      return { scheduled };
    },
    cancel: () => {
      cancelled += 1;
    },
    tick: () => callback?.(),
    count: () => ({ scheduled, cancelled, interval }),
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("createRefresher", () => {
  it("runs the task immediately and again on every interval", async () => {
    const timers = fakeTimers();
    const task = vi.fn(async () => {});
    const refresher = createRefresher({ intervalMs: 30_000, task, schedule: timers.schedule, cancel: timers.cancel });

    refresher.start();
    expect(task).toHaveBeenCalledTimes(1);
    expect(timers.count().interval).toBe(30_000);
    expect(timers.count().scheduled).toBe(1);

    await flush();
    timers.tick();
    expect(task).toHaveBeenCalledTimes(2);

    await flush();
    timers.tick();
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("skips a tick while the previous refresh is still running", async () => {
    const timers = fakeTimers();
    let settle: (() => void) | undefined;
    const task = vi.fn(() => new Promise<void>((resolve) => {
      settle = resolve;
    }));
    const refresher = createRefresher({ intervalMs: 30_000, task, schedule: timers.schedule, cancel: timers.cancel });

    refresher.start();
    expect(task).toHaveBeenCalledTimes(1);

    timers.tick();
    timers.tick();
    expect(task).toHaveBeenCalledTimes(1);

    settle?.();
    await flush();
    timers.tick();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("reports a rejected task to onError and keeps ticking", async () => {
    const timers = fakeTimers();
    const failure = new Error("gh unavailable");
    const onError = vi.fn();
    const task = vi.fn(async () => {
      if (task.mock.calls.length === 1) throw failure;
    });
    const refresher = createRefresher({ intervalMs: 30_000, task, schedule: timers.schedule, cancel: timers.cancel, onError });

    refresher.start();
    await flush();
    expect(onError).toHaveBeenCalledWith(failure);

    timers.tick();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("reports a throwing task to onError and keeps ticking", async () => {
    const timers = fakeTimers();
    const failure = new Error("boom");
    const onError = vi.fn();
    const task = vi.fn(() => {
      if (task.mock.calls.length === 1) throw failure;
      return Promise.resolve();
    });
    const refresher = createRefresher({ intervalMs: 30_000, task, schedule: timers.schedule, cancel: timers.cancel, onError });

    refresher.start();
    expect(onError).toHaveBeenCalledWith(failure);

    await flush();
    timers.tick();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("stops the timer and runs nothing further", async () => {
    const timers = fakeTimers();
    const task = vi.fn(async () => {});
    const refresher = createRefresher({ intervalMs: 30_000, task, schedule: timers.schedule, cancel: timers.cancel });

    refresher.start();
    await flush();
    refresher.stop();
    expect(timers.count().cancelled).toBe(1);

    timers.tick();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("schedules only one timer when started twice", async () => {
    const timers = fakeTimers();
    const task = vi.fn(async () => {});
    const refresher = createRefresher({ intervalMs: 30_000, task, schedule: timers.schedule, cancel: timers.cancel });

    refresher.start();
    refresher.start();
    expect(timers.count().scheduled).toBe(1);

    await flush();
    refresher.stop();
  });
});
