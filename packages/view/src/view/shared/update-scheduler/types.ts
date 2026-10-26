/** How a mounted view update should be executed. */
export type MountedViewUpdateScheduleMode = "sync" | "frame";

/** Monotonic revision carried by one mounted render request. */
export interface MountedViewUpdateRevision {
  /** Mounted editor-state version represented by the request. */
  readonly stateVersion: number;
  /** Layout-input epoch represented by the request. */
  readonly layoutEpoch: number;
}

/** Monotonic revision authority owned by one mounted runtime. */
export interface MountedViewUpdateRevisionClock {
  /**
   * Advances the mounted state revision for one requested update.
   *
   * @param layoutInvalidated - Whether this update can invalidate derived layout geometry.
   * @returns New immutable revision captured by the update request.
   */
  advance(layoutInvalidated: boolean): MountedViewUpdateRevision;
  /**
   * Reads the newest mounted revision without advancing it.
   *
   * @returns Current immutable mounted revision snapshot.
   */
  current(): MountedViewUpdateRevision;
}

/** Freshness authority used to reject obsolete mounted render work. */
export interface MountedViewUpdateFreshnessPolicy<TUpdate> {
  /**
   * Reads the state and layout revision represented by one update.
   *
   * @param update - Scheduled update whose revision is required.
   * @returns Monotonic revision captured when the update was requested.
   */
  readonly readUpdateRevision: (update: TUpdate) => MountedViewUpdateRevision;
  /**
   * Reads the newest revision owned by the mounted runtime.
   *
   * @returns Current authoritative mounted state and layout revision.
   */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
}

/** Counters exposed by the mounted view update scheduler for diagnostics. */
export interface MountedViewUpdateSchedulerCounters {
  /** Number of update requests received by the scheduler. */
  readonly requests: number;
  /** Number of concrete render executions performed by the scheduler. */
  readonly renders: number;
  /** Number of frame callbacks that executed at least one render. */
  readonly renderedFrames: number;
  /** Highest number of render executions observed inside one frame callback. */
  readonly maxRendersPerFrame: number;
  /** Number of animation-frame callbacks requested by the scheduler. */
  readonly scheduledFrames: number;
  /** Number of frame-eligible requests merged into an already pending frame. */
  readonly coalescedRequests: number;
  /** Number of forced flushes that executed a pending update immediately. */
  readonly forcedFlushes: number;
  /** Number of pending frame callbacks canceled by flush, sync render, or destroy. */
  readonly canceledFrames: number;
  /** Number of stale frame callbacks ignored after cancellation or destroy. */
  readonly staleCallbacks: number;
  /** Number of obsolete updates rejected by state-version or layout-epoch authority. */
  readonly staleUpdates: number;
  /** Whether a frame update is currently waiting to render. */
  readonly pendingFrame: boolean;
}

/** Options supplied when requesting one mounted view update. */
export interface MountedViewUpdateRequestOptions {
  /** Whether to execute immediately or coalesce to the next animation frame. */
  readonly mode: MountedViewUpdateScheduleMode;
}

/** Options used to create a mounted view update scheduler. */
export interface MountedViewUpdateSchedulerOptions<TUpdate> {
  /**
   * Executes one mounted view update.
   *
   * @param update - Latest update payload to render.
   */
  readonly execute: (update: TUpdate) => void;
  /**
   * Merges a newer frame update into an already pending frame update.
   *
   * The default keeps the latest update payload. Mounted views can provide a
   * merger to retain diagnostic metadata, such as the list of transactions that
   * were coalesced into one render frame.
   *
   * @param pending - Update already waiting for the next frame.
   * @param next - Newer update requested before the frame callback runs.
   * @returns Update payload that should remain pending.
   */
  readonly mergeFrameUpdates?: ((pending: TUpdate, next: TUpdate) => TUpdate) | undefined;
  /** Optional revision authority used to reject obsolete queued work. */
  readonly freshness?: MountedViewUpdateFreshnessPolicy<TUpdate> | undefined;
  /**
   * Requests a frame callback.
   *
   * @param callback - Callback to run on the next frame.
   * @returns Opaque frame handle for cancellation.
   */
  readonly requestFrame?: ((callback: () => void) => number) | undefined;
  /**
   * Cancels a pending frame callback.
   *
   * @param handle - Frame handle returned by `requestFrame`.
   */
  readonly cancelFrame?: ((handle: number) => void) | undefined;
}

/** Mounted view update scheduler lifecycle contract. */
export interface MountedViewUpdateScheduler<TUpdate> {
  /**
   * Requests a mounted view update.
   *
   * @param update - Update payload to render now or on the next frame.
   * @param options - Execution mode for this update.
   */
  request(update: TUpdate, options: MountedViewUpdateRequestOptions): void;
  /**
   * Flushes the latest pending frame update immediately.
   *
   * @returns Whether a pending update was flushed.
   */
  flush(): boolean;
  /** Cancels pending work and prevents future renders. */
  destroy(): void;
  /**
   * Reads a stable snapshot of scheduler counters.
   *
   * @returns Current scheduler counters.
   */
  getCounters(): MountedViewUpdateSchedulerCounters;
}
