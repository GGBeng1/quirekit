import { describe, expect, it, vi } from "vitest";
import { createMountedViewScheduledUpdateLifecycle } from "./scheduled-update";
import type {
  MountedViewScheduledUpdateEvent,
  MountedViewScheduledUpdateRequest
} from "./types";

/** Semantic reasons exercised by the mounted lifecycle tests. */
type TestUpdateReason = "initial" | "selection" | "transaction" | "composition" | "image-paint";

/** Backend request used to verify shared scheduling without a concrete renderer. */
interface TestUpdateRequest extends MountedViewScheduledUpdateRequest<TestUpdateReason> {
  /** Human-readable request label retained through coalescing. */
  readonly label: string;
}

describe("mounted scheduled-update lifecycle", () => {
  it.each([false, true])("coalesces image pixels without a layout epoch when focused=%s", (focused) => {
    const frame = createFrameHarness();
    const execute = vi.fn();
    const postponeInteraction = vi.fn();
    const lifecycle = createMountedViewScheduledUpdateLifecycle<TestUpdateRequest>({
      readFocused: () => focused,
      invalidatesLayout: request => request.reason !== "image-paint",
      execute,
      postponeInteraction,
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });
    for (let index = 0; index < 25; index += 1) {
      lifecycle.request({ label: String(index), reason: "image-paint" });
    }
    expect(execute).not.toHaveBeenCalled();
    expect(lifecycle.currentRevision()).toEqual({ stateVersion: 25, layoutEpoch: 0 });
    expect(lifecycle.getCounters()).toMatchObject({ scheduledFrames: 1, coalescedRequests: 24 });
    frame.runNext();
    expect(execute).toHaveBeenCalledOnce();
    expect(postponeInteraction).not.toHaveBeenCalled();
    lifecycle.request({ label: "late", reason: "image-paint" });
    lifecycle.destroy();
    expect(lifecycle.getCounters()).toMatchObject({ canceledFrames: 1, pendingFrame: false });
    expect(execute).toHaveBeenCalledOnce();
  });

  it.each(["transaction", "composition"] as const)("retains pending %s when pixels finish decoding", (reason) => {
    const frame = createFrameHarness();
    const execute = vi.fn();
    const lifecycle = createMountedViewScheduledUpdateLifecycle<TestUpdateRequest>({
      readFocused: () => true,
      invalidatesLayout: request => request.reason !== "image-paint",
      execute,
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });
    const imePreedit = { range: { from: 1, to: 1 }, text: "ni" };
    lifecycle.request({ label: "interaction", reason, ...(reason === "composition" ? { imePreedit } : {}) });
    lifecycle.request({ label: "pixels", reason: "image-paint" });
    frame.runNext();
    expect(execute).toHaveBeenCalledOnce();
    expect(execute.mock.calls[0]![0]).toMatchObject({
      reason, revision: { stateVersion: 2, layoutEpoch: 1 },
      ...(reason === "composition" ? { imePreedit } : {})
    });
    lifecycle.destroy();
  });

  it("owns focused mutation cadence and interaction hooks as one lifecycle", () => {
    const frame = createFrameHarness();
    const renders: Array<{ readonly label: string; readonly reason: string }> = [];
    const phases: string[] = [];
    const completeDeferredPostUpdate = vi.fn();
    const postponeInteraction = vi.fn();
    const resumeInteraction = vi.fn();
    const lifecycle = createMountedViewScheduledUpdateLifecycle<TestUpdateRequest>({
      readFocused: () => true,
      invalidatesLayout: () => true,
      execute: (update) => {
        renders.push({ label: update.label, reason: update.reason });
      },
      completeDeferredPostUpdate,
      postponeInteraction,
      resumeInteraction,
      onSchedule: (event) => phases.push(event.phase),
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    lifecycle.request({
      label: "preedit",
      reason: "composition",
      imePreedit: { text: "ni" }
    });
    lifecycle.request({ label: "commit", reason: "transaction" });

    expect(renders).toEqual([]);
    expect(phases).toEqual(["request", "request"]);
    expect(postponeInteraction).toHaveBeenCalledTimes(2);
    expect(lifecycle.getCounters()).toMatchObject({
      requests: 2,
      scheduledFrames: 1,
      coalescedRequests: 1
    });

    frame.runNext();

    expect(renders).toEqual([{ label: "commit", reason: "composition" }]);
    expect(phases).toEqual(["request", "request", "render"]);
    expect(completeDeferredPostUpdate).toHaveBeenCalledOnce();
    expect(resumeInteraction).toHaveBeenCalledOnce();
  });

  it("keeps focus reads and layout invalidation policy at request time", () => {
    let focused = false;
    const revisions: Array<{ readonly stateVersion: number; readonly layoutEpoch: number }> = [];
    const lifecycle = createMountedViewScheduledUpdateLifecycle<TestUpdateRequest>({
      readFocused: () => focused,
      invalidatesLayout: (request) => request.reason !== "selection",
      execute: (update) => revisions.push(update.revision)
    });

    lifecycle.request({ label: "initial", reason: "initial" });
    lifecycle.request({ label: "selection", reason: "selection" });
    focused = true;

    expect(lifecycle.resolveMode("transaction")).toBe("frame");
    expect(revisions).toEqual([
      { stateVersion: 1, layoutEpoch: 1 },
      { stateVersion: 2, layoutEpoch: 1 }
    ]);
    expect(lifecycle.currentRevision()).toEqual({
      stateVersion: 2,
      layoutEpoch: 1
    });
  });

  it("emits scheduler-owned counters and cancels pending work on destroy", () => {
    const frame = createFrameHarness();
    const events: MountedViewScheduledUpdateEvent<TestUpdateRequest>[] = [];
    const render = vi.fn();
    const requestDeferredPostUpdate = vi.fn();
    const postponeInteraction = vi.fn();
    const lifecycle = createMountedViewScheduledUpdateLifecycle<TestUpdateRequest>({
      readFocused: () => true,
      invalidatesLayout: () => true,
      execute: render,
      requestDeferredPostUpdate,
      postponeInteraction,
      onSchedule: (event) => events.push(event),
      requestFrame: frame.request,
      cancelFrame: frame.cancel
    });

    lifecycle.request({ label: "pending", reason: "transaction" });
    lifecycle.destroy();
    lifecycle.request({ label: "after destroy", reason: "transaction" });

    expect(events).toHaveLength(1);
    expect(events[0]?.counters).toMatchObject({
      requests: 1,
      scheduledFrames: 1,
      pendingFrame: true
    });
    expect(lifecycle.getCounters()).toMatchObject({
      canceledFrames: 1,
      pendingFrame: false,
      renders: 0
    });
    expect(render).not.toHaveBeenCalled();
    expect(requestDeferredPostUpdate).toHaveBeenCalledTimes(1);
    expect(postponeInteraction).toHaveBeenCalledTimes(1);
  });
});

/**
 * Creates deterministic frame request and cancellation functions.
 *
 * @returns Frame controls used by lifecycle tests.
 */
function createFrameHarness(): {
  /** Requests a deterministic frame callback. */
  readonly request: (callback: () => void) => number;
  /** Cancels one deterministic frame callback. */
  readonly cancel: (handle: number) => void;
  /** Runs the oldest pending frame callback. */
  readonly runNext: () => void;
} {
  let nextHandle = 1;
  const callbacks = new Map<number, () => void>();

  return {
    request(callback) {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);

      return handle;
    },
    cancel(handle) {
      callbacks.delete(handle);
    },
    runNext() {
      const first = callbacks.entries().next().value as
        | [number, () => void]
        | undefined;
      if (first === undefined) {
        throw new Error("No pending frame callback");
      }

      callbacks.delete(first[0]);
      first[1]();
    }
  };
}
