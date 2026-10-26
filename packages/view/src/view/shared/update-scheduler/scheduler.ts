import type {
  MountedViewUpdateRequestOptions,
  MountedViewUpdateScheduler,
  MountedViewUpdateSchedulerCounters,
  MountedViewUpdateFreshnessPolicy,
  MountedViewUpdateSchedulerOptions
} from "./types";

/** Mutable counter bag owned by one mounted view update scheduler. */
interface MutableMountedViewUpdateSchedulerCounters {
  /** Number of update requests received by the scheduler. */
  requests: number;
  /** Number of concrete render executions performed by the scheduler. */
  renders: number;
  /** Number of frame callbacks that executed at least one render. */
  renderedFrames: number;
  /** Highest number of render executions observed inside one frame callback. */
  maxRendersPerFrame: number;
  /** Number of animation-frame callbacks requested by the scheduler. */
  scheduledFrames: number;
  /** Number of frame-eligible requests merged into an already pending frame. */
  coalescedRequests: number;
  /** Number of forced flushes that executed a pending update immediately. */
  forcedFlushes: number;
  /** Number of pending frame callbacks canceled by flush, sync render, or destroy. */
  canceledFrames: number;
  /** Number of stale frame callbacks ignored after cancellation or destroy. */
  staleCallbacks: number;
  /** Number of queued updates rejected because their revision is obsolete. */
  staleUpdates: number;
}

/**
 * Creates a mounted view update scheduler.
 *
 * @param options - Render executor and optional frame scheduling functions.
 * @returns Scheduler that can execute updates synchronously or coalesce them to a frame.
 */
export function createMountedViewUpdateScheduler<TUpdate>(
  options: MountedViewUpdateSchedulerOptions<TUpdate>
): MountedViewUpdateScheduler<TUpdate> {
  return new DefaultMountedViewUpdateScheduler(options);
}

/** Frame-coalescing scheduler for mounted view updates. */
class DefaultMountedViewUpdateScheduler<TUpdate>
  implements MountedViewUpdateScheduler<TUpdate>
{
  private readonly executeUpdate: (update: TUpdate) => void;
  private readonly mergeFrameUpdates: (pending: TUpdate, next: TUpdate) => TUpdate;
  private readonly requestFrame: (callback: () => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly freshness: MountedViewUpdateFreshnessPolicy<TUpdate> | undefined;
  private readonly counters: MutableMountedViewUpdateSchedulerCounters = {
    requests: 0,
    renders: 0,
    renderedFrames: 0,
    maxRendersPerFrame: 0,
    scheduledFrames: 0,
    coalescedRequests: 0,
    forcedFlushes: 0,
    canceledFrames: 0,
    staleCallbacks: 0,
    staleUpdates: 0
  };
  private pendingUpdate: TUpdate | undefined;
  private pendingFrameHandle: number | undefined;
  private frameEpoch = 0;
  private destroyed = false;
  private activeFrameRenderCount: number | undefined;

  /**
   * Creates a frame-coalescing mounted view update scheduler.
   *
   * @param options - Render executor and optional frame scheduling functions.
   */
  constructor(options: MountedViewUpdateSchedulerOptions<TUpdate>) {
    this.executeUpdate = options.execute;
    this.mergeFrameUpdates = options.mergeFrameUpdates ?? useLatestFrameUpdate;
    this.requestFrame = options.requestFrame ?? requestDefaultFrame;
    this.cancelFrame = options.cancelFrame ?? cancelDefaultFrame;
    this.freshness = options.freshness;
  }

  /**
   * Requests a mounted view update.
   *
   * @param update - Update payload to render now or on the next frame.
   * @param options - Execution mode for this update.
   */
  request(update: TUpdate, options: MountedViewUpdateRequestOptions): void {
    this.counters.requests += 1;

    if (this.destroyed) {
      return;
    }

    if (options.mode === "sync") {
      const updateToExecute =
        this.pendingUpdate === undefined
          ? update
          : this.mergeFrameUpdates(this.pendingUpdate, update);

      this.cancelPendingFrame();
      this.pendingUpdate = undefined;
      this.execute(updateToExecute);
      return;
    }

    this.pendingUpdate =
      this.pendingUpdate === undefined
        ? update
        : this.mergeFrameUpdates(this.pendingUpdate, update);

    if (this.pendingFrameHandle !== undefined) {
      this.counters.coalescedRequests += 1;
      return;
    }

    const epoch = this.frameEpoch;
    this.pendingFrameHandle = this.requestFrame(() => {
      this.runFrameCallback(epoch);
    });
    this.counters.scheduledFrames += 1;
  }

  /**
   * Flushes the latest pending frame update immediately.
   *
   * @returns Whether a pending update was flushed.
   */
  flush(): boolean {
    if (this.pendingUpdate === undefined || this.destroyed) {
      return false;
    }

    const update = this.pendingUpdate;
    this.counters.forcedFlushes += 1;
    this.cancelPendingFrame();
    this.pendingUpdate = undefined;
    this.execute(update);

    return true;
  }

  /** Cancels pending work and prevents future renders. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.cancelPendingFrame();
    this.pendingUpdate = undefined;
    this.destroyed = true;
  }

  /**
   * Reads a stable snapshot of scheduler counters.
   *
   * @returns Current scheduler counters.
   */
  getCounters(): MountedViewUpdateSchedulerCounters {
    const activeFrameRenderCount = this.activeFrameRenderCount ?? 0;
    const activeFrameRendered = activeFrameRenderCount > 0;

    return {
      ...this.counters,
      renderedFrames:
        this.counters.renderedFrames + (activeFrameRendered ? 1 : 0),
      maxRendersPerFrame: activeFrameRendered
        ? Math.max(this.counters.maxRendersPerFrame, activeFrameRenderCount)
        : this.counters.maxRendersPerFrame,
      pendingFrame: this.pendingUpdate !== undefined
    };
  }

  /**
   * Runs the stored update if the frame callback is still current.
   *
   * @param epoch - Frame epoch captured when the callback was scheduled.
   */
  private runFrameCallback(epoch: number): void {
    if (this.destroyed || epoch !== this.frameEpoch) {
      this.counters.staleCallbacks += 1;
      return;
    }

    const update = this.pendingUpdate;
    this.pendingUpdate = undefined;
    this.pendingFrameHandle = undefined;

    if (update === undefined) {
      this.counters.staleCallbacks += 1;
      return;
    }

    this.activeFrameRenderCount = 0;
    try {
      this.execute(update);
    } finally {
      const renderCount = this.activeFrameRenderCount;

      this.activeFrameRenderCount = undefined;
      if (renderCount !== undefined && renderCount > 0) {
        this.counters.renderedFrames += 1;
        this.counters.maxRendersPerFrame = Math.max(
          this.counters.maxRendersPerFrame,
          renderCount
        );
      }
    }
  }

  /**
   * Cancels the currently pending frame callback, if any.
   */
  private cancelPendingFrame(): void {
    if (this.pendingFrameHandle === undefined) {
      return;
    }

    this.cancelFrame(this.pendingFrameHandle);
    this.pendingFrameHandle = undefined;
    this.frameEpoch += 1;
    this.counters.canceledFrames += 1;
  }

  /**
   * Executes one update and records a render counter.
   *
   * @param update - Update payload to execute.
   */
  private execute(update: TUpdate): void {
    if (this.isStale(update)) {
      this.counters.staleUpdates += 1;
      return;
    }

    this.counters.renders += 1;
    if (this.activeFrameRenderCount !== undefined) {
      this.activeFrameRenderCount += 1;
    }
    this.executeUpdate(update);
  }

  /**
   * Checks one update against the mounted runtime's latest state/layout revision.
   *
   * @param update - Update about to enter concrete render work.
   * @returns Whether newer state or layout inputs already superseded the update.
   */
  private isStale(update: TUpdate): boolean {
    if (this.freshness === undefined) {
      return false;
    }

    const updateRevision = this.freshness.readUpdateRevision(update);
    const currentRevision = this.freshness.readCurrentRevision();

    return updateRevision.stateVersion < currentRevision.stateVersion ||
      updateRevision.layoutEpoch < currentRevision.layoutEpoch;
  }
}

/**
 * Requests a browser animation frame or a timeout fallback outside browsers.
 *
 * @param callback - Callback to run later.
 * @returns Opaque frame handle.
 */
function requestDefaultFrame(callback: () => void): number {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(() => {
      callback();
    });
  }

  return globalThis.setTimeout(callback, 0) as unknown as number;
}

/**
 * Cancels a browser animation frame or timeout fallback.
 *
 * @param handle - Opaque frame handle.
 */
function cancelDefaultFrame(handle: number): void {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(handle);
    return;
  }

  globalThis.clearTimeout(handle);
}

/**
 * Default frame-update merge policy: keep the latest payload.
 *
 * @param _pending - Existing pending payload.
 * @param next - Newer payload.
 * @returns Newer payload.
 */
function useLatestFrameUpdate<TUpdate>(_pending: TUpdate, next: TUpdate): TUpdate {
  return next;
}
