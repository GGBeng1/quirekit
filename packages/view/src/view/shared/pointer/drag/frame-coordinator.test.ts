import { describe, expect, it, vi } from "vitest";
import { createMountedPointerDragFrameCoordinator } from "./frame-coordinator";

describe("mounted pointer drag frame coordinator", () => {
  it("revalidates an unchanged client point after scroll changes its projection", () => {
    const frame = createFrameHarness();
    const applyPoint = vi.fn();
    const coordinator = createMountedPointerDragFrameCoordinator({
      root: frame.root, applyPoint,
      requestFrame: frame.requestFrame, cancelFrame: frame.cancelFrame
    });
    const point = { clientX: 10, clientY: 20 };
    coordinator.update(point);
    frame.runNextFrame();
    coordinator.update(point, true);
    coordinator.update(point, true);
    expect(frame.pendingFrameCount()).toBe(1);
    frame.runNextFrame();
    expect(applyPoint).toHaveBeenCalledTimes(2);
  });
  it("coalesces active drag points to the latest point in one frame", () => {
    const frame = createFrameHarness();
    const appliedPoints: Array<Readonly<{ clientX: number; clientY: number }>> = [];
    const coordinator = createMountedPointerDragFrameCoordinator({
      root: frame.root,
      applyPoint: (point) => {
        appliedPoints.push(point);
      },
      requestFrame: frame.requestFrame,
      cancelFrame: frame.cancelFrame
    });

    coordinator.update({ clientX: 10, clientY: 20 });
    coordinator.update({ clientX: 30, clientY: 40 });
    coordinator.update({ clientX: 50, clientY: 60 });

    expect(appliedPoints).toEqual([]);
    expect(frame.pendingFrameCount()).toBe(1);
    expect(coordinator.readCounters()).toEqual({
      receivedPoints: 3,
      coalescedPoints: 2,
      appliedPoints: 0,
      flushedPoints: 0
    });

    frame.runNextFrame();

    expect(appliedPoints).toEqual([{ clientX: 50, clientY: 60 }]);
    expect(coordinator.readCounters()).toEqual({
      receivedPoints: 3,
      coalescedPoints: 2,
      appliedPoints: 1,
      flushedPoints: 0
    });
  });

  it("flushes the final pointer point synchronously on drag completion", () => {
    const frame = createFrameHarness();
    const appliedPoints: Array<Readonly<{ clientX: number; clientY: number }>> = [];
    const coordinator = createMountedPointerDragFrameCoordinator({
      root: frame.root,
      applyPoint: (point) => {
        appliedPoints.push(point);
      },
      requestFrame: frame.requestFrame,
      cancelFrame: frame.cancelFrame
    });

    coordinator.update({ clientX: 10, clientY: 20 });
    coordinator.update({ clientX: 70, clientY: 80 });

    expect(coordinator.flush()).toBe(true);
    expect(appliedPoints).toEqual([{ clientX: 70, clientY: 80 }]);
    expect(frame.pendingFrameCount()).toBe(0);
    expect(coordinator.flush()).toBe(false);
    expect(coordinator.readCounters()).toEqual({
      receivedPoints: 2,
      coalescedPoints: 1,
      appliedPoints: 1,
      flushedPoints: 1
    });
  });

  it("does not reapply a point already committed by the prior frame", () => {
    const frame = createFrameHarness();
    const applyPoint = vi.fn();
    const coordinator = createMountedPointerDragFrameCoordinator({
      root: frame.root,
      applyPoint,
      requestFrame: frame.requestFrame,
      cancelFrame: frame.cancelFrame
    });

    coordinator.update({ clientX: 10, clientY: 20 });
    frame.runNextFrame();
    coordinator.update({ clientX: 10, clientY: 20 });

    expect(frame.pendingFrameCount()).toBe(0);
    expect(applyPoint).toHaveBeenCalledTimes(1);
    expect(coordinator.readCounters()).toEqual({
      receivedPoints: 2,
      coalescedPoints: 1,
      appliedPoints: 1,
      flushedPoints: 0
    });
  });

  it("drops a pending point when the drag is cancelled", () => {
    const frame = createFrameHarness();
    const applyPoint = vi.fn();
    const coordinator = createMountedPointerDragFrameCoordinator({
      root: frame.root,
      applyPoint,
      requestFrame: frame.requestFrame,
      cancelFrame: frame.cancelFrame
    });

    coordinator.update({ clientX: 10, clientY: 20 });
    coordinator.cancel();

    expect(frame.pendingFrameCount()).toBe(0);
    expect(coordinator.flush()).toBe(false);
    expect(applyPoint).not.toHaveBeenCalled();
  });
});

/** Deterministic animation-frame harness used by drag cadence tests. */
interface FrameHarness {
  /** Minimal root whose owner window establishes the scheduler authority. */
  readonly root: HTMLElement;
  /** Schedules one frame callback. */
  readonly requestFrame: (callback: FrameRequestCallback) => number;
  /** Cancels one scheduled callback. */
  readonly cancelFrame: (handle: number) => void;
  /**
   * Reads the number of callbacks that remain scheduled.
   *
   * @returns Pending callback count.
   */
  readonly pendingFrameCount: () => number;
  /** Runs the oldest scheduled callback. */
  readonly runNextFrame: () => void;
}

/**
 * Creates a deterministic animation-frame harness.
 *
 * @returns Frame scheduler and minimal DOM owner facts.
 */
function createFrameHarness(): FrameHarness {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;

  return {
    root: {
      ownerDocument: {
        defaultView: null
      }
    } as unknown as HTMLElement,
    requestFrame: (callback) => {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);
      return handle;
    },
    cancelFrame: (handle) => {
      callbacks.delete(handle);
    },
    pendingFrameCount: () => callbacks.size,
    runNextFrame: () => {
      const entry = callbacks.entries().next().value as
        | readonly [number, FrameRequestCallback]
        | undefined;

      if (!entry) {
        throw new Error("Expected one pending animation frame.");
      }

      callbacks.delete(entry[0]);
      entry[1](0);
    }
  };
}
