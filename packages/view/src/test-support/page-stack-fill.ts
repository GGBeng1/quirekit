import type {
  QuirePageStackFillCancel,
  QuirePageStackFillScheduler
} from "../view/shared";

/** One callback captured by the deterministic page-stack fill scheduler. */
export interface ScheduledPageStackFillCallback {
  /** Scheduled callback body. */
  readonly run: () => void;
  /** Whether cancellation was requested before execution. */
  cancelled: boolean;
}

/** Deterministic scheduler and callback queues used by fill ownership tests. */
export interface PageStackFillSchedulerHarness {
  /** Scheduler passed to the fill lifecycle. */
  readonly scheduler: QuirePageStackFillScheduler;
  /** Pending first-paint bridge callbacks. */
  readonly bridges: ScheduledPageStackFillCallback[];
  /** Pending backend fill-pass callbacks. */
  readonly passes: ScheduledPageStackFillCallback[];
  /** Pending interaction-cooldown callbacks. */
  readonly delays: ScheduledPageStackFillCallback[];
}

/**
 * Creates one cancellable callback queue entry.
 *
 * @param callbacks - Queue receiving the scheduled entry.
 * @param run - Callback body supplied by the fill lifecycle.
 * @returns Cancellation function for the queue entry.
 */
function scheduleCallback(
  callbacks: ScheduledPageStackFillCallback[],
  run: () => void
): QuirePageStackFillCancel {
  const entry: ScheduledPageStackFillCallback = { run, cancelled: false };
  callbacks.push(entry);
  return () => {
    entry.cancelled = true;
  };
}

/**
 * Creates deterministic bridge, pass, and delay queues.
 *
 * @returns Scheduler harness controlled by each test.
 */
export function createPageStackFillSchedulerHarness(): PageStackFillSchedulerHarness {
  const bridges: ScheduledPageStackFillCallback[] = [];
  const passes: ScheduledPageStackFillCallback[] = [];
  const delays: ScheduledPageStackFillCallback[] = [];

  return {
    bridges,
    passes,
    delays,
    scheduler: {
      scheduleBridge: (callback) => scheduleCallback(bridges, callback),
      schedulePass: (callback) => scheduleCallback(passes, callback),
      scheduleDelay: (callback) => scheduleCallback(delays, callback)
    }
  };
}

/**
 * Runs one scheduled callback when it was not canceled.
 *
 * @param entry - Captured scheduler entry.
 */
export function runScheduledPageStackFillCallback(
  entry: ScheduledPageStackFillCallback
): void {
  if (!entry.cancelled) {
    entry.run();
  }
}

/** Waits for an asynchronous fill pass and its continuation to settle. */
export async function flushPageStackFillPass(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
