// The panel's refresh loop: one immediate read, then one every interval while
// the panel is open, never overlapping. Timers are injectable so the
// scheduling is tested deterministically with fakes.

export interface Refresher {
  start(): void;
  stop(): void;
}

export interface RefresherOptions {
  intervalMs: number;
  task: () => Promise<void>;
  schedule?: (callback: () => void, intervalMs: number) => unknown;
  cancel?: (handle: unknown) => void;
  onError?: (error: unknown) => void;
}

const defaultSchedule = (callback: () => void, intervalMs: number): unknown => setInterval(callback, intervalMs);
const defaultCancel = (handle: unknown): void => {
  clearInterval(handle as ReturnType<typeof setInterval>);
};

export function createRefresher({
  intervalMs,
  task,
  schedule = defaultSchedule,
  cancel = defaultCancel,
  onError,
}: RefresherOptions): Refresher {
  let handle: unknown;
  let running = false;
  let inFlight = false;

  const run = () => {
    if (!running || inFlight) return;
    inFlight = true;
    let result: Promise<void>;
    try {
      result = task();
    } catch (error) {
      inFlight = false;
      onError?.(error);
      return;
    }
    result
      .then(
        () => {},
        (error) => onError?.(error),
      )
      .finally(() => {
        inFlight = false;
      });
  };

  return {
    start() {
      if (running) return;
      running = true;
      run();
      handle = schedule(run, intervalMs);
    },
    stop() {
      if (!running) return;
      running = false;
      if (handle !== undefined) cancel(handle);
      handle = undefined;
    },
  };
}
