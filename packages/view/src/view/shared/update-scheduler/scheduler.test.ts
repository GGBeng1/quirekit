import { describe, expect, it } from "vitest";
import { mergeMountedViewUpdateTransactions } from "./merge";
import { createMountedViewUpdateScheduler } from "./scheduler";
import type { MountedViewUpdateScheduler } from "./types";

/** Test update payload passed through the mounted scheduler. */
interface TestUpdate {
  /** Human-readable update label recorded by the test executor. */
  readonly label: string;
  /** Render reason carried by mounted view diagnostics. */
  readonly reason?: string | undefined;
  /** Optional merged update labels retained for merger tests. */
  readonly history?: readonly string[] | undefined;
  /** Monotonic mounted-state version represented by this update. */
  readonly stateVersion?: number | undefined;
  /** Monotonic layout epoch represented by this update. */
  readonly layoutEpoch?: number | undefined;
  /** Optional transient preedit represented by a composition update. */
  readonly imePreedit?: Readonly<{ text: string }> | undefined;
}

describe("Mounted view update scheduler", () => {
  it("coalesces frame updates and renders the latest payload", () => {
    const frame = createFrameHarness();
    const renders: string[] = [];
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update.label);
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "first" }, { mode: "frame" });
    scheduler.request({ label: "second" }, { mode: "frame" });

    expect(renders).toEqual([]);
    expect(scheduler.getCounters()).toMatchObject({
      requests: 2,
      scheduledFrames: 1,
      coalescedRequests: 1,
      renders: 0
    });

    frame.runNext();

    expect(renders).toEqual(["second"]);
    expect(scheduler.getCounters()).toMatchObject({
      renders: 1,
      renderedFrames: 1,
      maxRendersPerFrame: 1
    });
  });

  it("merges pending frame payloads when a merger is supplied", () => {
    const frame = createFrameHarness();
    const renders: TestUpdate[] = [];
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update);
      },
      mergeFrameUpdates(pending, next) {
        return {
          label: next.label,
          history: [...(pending.history ?? []), ...(next.history ?? [])]
        };
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "first", history: ["a"] }, { mode: "frame" });
    scheduler.request({ label: "second", history: ["b"] }, { mode: "frame" });
    frame.runNext();

    expect(renders).toEqual([{ label: "second", history: ["a", "b"] }]);
  });

  it("promotes coalesced non-composition frame reasons to transactions", () => {
    const merged = mergeMountedViewUpdateTransactions<TestUpdate>(
      { label: "pending-resize", reason: "resize" },
      { label: "typing", reason: "transaction" }
    );

    expect(merged).toEqual({
      label: "typing",
      reason: "transaction"
    });
  });

  it("keeps composition reason when coalescing IME preview and commit updates", () => {
    const merged = mergeMountedViewUpdateTransactions<TestUpdate>(
      {
        label: "preedit",
        reason: "composition",
        imePreedit: { text: "ni" }
      },
      { label: "commit", reason: "transaction" }
    );

    expect(merged).toEqual({
      label: "commit",
      reason: "composition",
      imePreedit: { text: "ni" }
    });
  });

  it("lets a newer composition update explicitly clear a pending preedit", () => {
    const merged = mergeMountedViewUpdateTransactions<TestUpdate>(
      {
        label: "preedit",
        reason: "composition",
        imePreedit: { text: "ni" }
      },
      {
        label: "clear",
        reason: "composition",
        imePreedit: undefined
      }
    );

    expect(merged).toEqual({
      label: "clear",
      reason: "composition",
      imePreedit: undefined
    });
  });

  it("tracks the maximum render count inside one frame callback", () => {
    const frame = createFrameHarness();
    const renders: string[] = [];
    let scheduler: MountedViewUpdateScheduler<TestUpdate> | undefined;

    scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update.label);
        if (update.label === "frame") {
          scheduler?.request({ label: "nested" }, { mode: "sync" });
        }
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "frame" }, { mode: "frame" });
    frame.runNext();

    expect(renders).toEqual(["frame", "nested"]);
    expect(scheduler.getCounters()).toMatchObject({
      renders: 2,
      renderedFrames: 1,
      maxRendersPerFrame: 2
    });
  });

  it("reports active frame counters while the frame render is executing", () => {
    const frame = createFrameHarness();
    const countersDuringRender: Array<{
      readonly renderedFrames: number;
      readonly maxRendersPerFrame: number;
    }> = [];
    let scheduler: MountedViewUpdateScheduler<TestUpdate> | undefined;

    scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute() {
        const counters = scheduler?.getCounters();
        if (counters !== undefined) {
          countersDuringRender.push({
            renderedFrames: counters.renderedFrames,
            maxRendersPerFrame: counters.maxRendersPerFrame
          });
        }
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "frame" }, { mode: "frame" });
    frame.runNext();

    expect(countersDuringRender).toEqual([
      {
        renderedFrames: 1,
        maxRendersPerFrame: 1
      }
    ]);
    expect(scheduler.getCounters()).toMatchObject({
      renderedFrames: 1,
      maxRendersPerFrame: 1
    });
  });

  it("executes synchronous updates immediately", () => {
    const frame = createFrameHarness();
    const renders: string[] = [];
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update.label);
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "initial" }, { mode: "sync" });

    expect(renders).toEqual(["initial"]);
    expect(frame.pendingCount()).toBe(0);
    expect(scheduler.getCounters()).toMatchObject({
      requests: 1,
      renders: 1,
      scheduledFrames: 0
    });
  });

  it("rejects work older than the current state version or layout epoch", () => {
    const frame = createFrameHarness();
    const renders: string[] = [];
    let currentRevision = { stateVersion: 3, layoutEpoch: 5 };
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update.label);
      },
      freshness: {
        readUpdateRevision: (update) => ({
          stateVersion: update.stateVersion ?? 0,
          layoutEpoch: update.layoutEpoch ?? 0
        }),
        readCurrentRevision: () => currentRevision
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request(
      { label: "old-state", stateVersion: 2, layoutEpoch: 5 },
      { mode: "frame" }
    );
    frame.runNext();
    scheduler.request(
      { label: "old-layout", stateVersion: 3, layoutEpoch: 4 },
      { mode: "sync" }
    );
    currentRevision = { stateVersion: 4, layoutEpoch: 6 };
    scheduler.request(
      { label: "current", stateVersion: 4, layoutEpoch: 6 },
      { mode: "sync" }
    );

    expect(renders).toEqual(["current"]);
    expect(scheduler.getCounters()).toMatchObject({
      staleUpdates: 2,
      renders: 1
    });
  });

  it("keeps pending frame metadata when a sync update absorbs it", () => {
    const frame = createFrameHarness();
    const renders: TestUpdate[] = [];
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update);
      },
      mergeFrameUpdates: mergeMountedViewUpdateTransactions,
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request(
      { label: "typing", reason: "transaction" },
      { mode: "frame" }
    );
    scheduler.request(
      { label: "resize", reason: "resize" },
      { mode: "sync" }
    );

    expect(renders).toEqual([
      {
        label: "resize",
        reason: "transaction"
      }
    ]);
    expect(frame.pendingCount()).toBe(0);
    expect(scheduler.getCounters()).toMatchObject({
      canceledFrames: 1,
      renders: 1,
      renderedFrames: 0
    });
  });

  it("flushes the latest pending frame update immediately", () => {
    const frame = createFrameHarness();
    const renders: string[] = [];
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update.label);
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "first" }, { mode: "frame" });
    scheduler.request({ label: "second" }, { mode: "frame" });

    expect(scheduler.flush()).toBe(true);
    expect(renders).toEqual(["second"]);
    expect(frame.pendingCount()).toBe(0);
    expect(scheduler.getCounters()).toMatchObject({
      forcedFlushes: 1,
      canceledFrames: 1,
      renders: 1
    });
  });

  it("cancels pending frame work when destroyed", () => {
    const frame = createFrameHarness();
    const renders: string[] = [];
    const scheduler = createMountedViewUpdateScheduler<TestUpdate>({
      execute(update) {
        renders.push(update.label);
      },
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    scheduler.request({ label: "pending" }, { mode: "frame" });
    scheduler.destroy();
    frame.runCanceled(1);

    expect(renders).toEqual([]);
    expect(scheduler.getCounters()).toMatchObject({
      canceledFrames: 1,
      staleCallbacks: 1,
      renders: 0
    });
  });
});

/**
 * Creates a deterministic animation-frame harness for scheduler unit tests.
 *
 * @returns Request/cancel functions plus helpers to run stored callbacks.
 */
function createFrameHarness(): {
  readonly request: (callback: () => void) => number;
  readonly cancel: (handle: number) => void;
  readonly runNext: () => void;
  readonly runCanceled: (handle: number) => void;
  readonly pendingCount: () => number;
} {
  let nextHandle = 1;
  const callbacks = new Map<number, () => void>();
  const canceled = new Map<number, () => void>();

  return {
    request(callback) {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);

      return handle;
    },
    cancel(handle) {
      const callback = callbacks.get(handle);
      if (callback) {
        callbacks.delete(handle);
        canceled.set(handle, callback);
      }
    },
    runNext() {
      const first = callbacks.entries().next().value as
        | [number, () => void]
        | undefined;
      if (!first) {
        throw new Error("No pending frame callback");
      }
      const [handle, callback] = first;
      callbacks.delete(handle);
      callback();
    },
    runCanceled(handle) {
      const callback = canceled.get(handle);
      if (!callback) {
        throw new Error(`No canceled frame callback for handle ${handle}`);
      }
      callback();
    },
    pendingCount() {
      return callbacks.size;
    }
  };
}
