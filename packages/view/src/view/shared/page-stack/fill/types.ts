/** Cancels one scheduled page-stack fill callback. */
export type QuirePageStackFillCancel = () => void;

/** Scheduling capabilities consumed by the mounted page-stack fill controller. */
export interface QuirePageStackFillScheduler {
  /**
   * Schedules the paint bridge before the first background fill pass.
   *
   * @param callback - Callback that starts background fill after initial paint.
   * @returns Cancellation function for the scheduled bridge.
   */
  readonly scheduleBridge: (callback: () => void) => QuirePageStackFillCancel;
  /**
   * Schedules one backend-selected fill pass.
   *
   * @param callback - Callback that executes one fill chunk.
   * @returns Cancellation function for the scheduled pass.
   */
  readonly schedulePass: (callback: () => void) => QuirePageStackFillCancel;
  /**
   * Schedules delayed work after focused interaction cooldown.
   *
   * @param callback - Callback that resumes background fill.
   * @param delayMs - Cooldown delay in milliseconds.
   * @returns Cancellation function for the scheduled delay.
   */
  readonly scheduleDelay: (
    callback: () => void,
    delayMs: number
  ) => QuirePageStackFillCancel;
}

/** Browser scheduling capabilities used to build a page-stack fill scheduler. */
export interface QuirePageStackFillBrowserSchedulerOptions {
  /**
   * Requests one animation frame.
   *
   * @param callback - Callback to execute on the frame.
   * @returns Opaque frame handle.
   */
  readonly requestFrame: (callback: () => void) => number;
  /**
   * Cancels one requested animation frame.
   *
   * @param handle - Opaque frame handle returned by `requestFrame`.
   */
  readonly cancelFrame: (handle: number) => void;
  /**
   * Reports whether fill passes should prefer browser idle periods.
   *
   * @returns Whether the active backend mode prefers idle scheduling.
   */
  readonly preferIdle: () => boolean;
  /** Timeout for idle fill callbacks in milliseconds. */
  readonly idleTimeoutMs: number;
}

/** One backend fill chunk requested by the shared lifecycle controller. */
export interface QuirePageStackFillPassRequest {
  /** Total top-level block count being materialized. */
  readonly total: number;
  /** Inclusive first top-level block index for this chunk. */
  readonly fromIndex: number;
  /** Exclusive final top-level block index for this chunk. */
  readonly toIndex: number;
  /** Whether this chunk reaches the end of the current document. */
  readonly complete: boolean;
  /** Signal aborted when this pass no longer belongs to the active fill generation. */
  readonly signal: AbortSignal;
}

/** Result returned by a backend fill strategy. */
export type QuirePageStackFillPassResult =
  | {
    /** The chunk completed and canonical fill state may advance. */
    readonly action: "advance";
    /** Whether the backend should reconcile paint after advancing the window. */
    readonly render: boolean;
  }
  | {
    /** The chunk should be retried without advancing the window. */
    readonly action: "retry";
  }
  | {
    /** The current fill generation must stop without advancing. */
    readonly action: "stop";
  };

/** State emitted after the shared controller advances one fill chunk. */
export interface QuirePageStackFillAdvance {
  /** Whether the fill reached the end of the current document. */
  readonly complete: boolean;
  /** Active shaped-block limit, or undefined after completion. */
  readonly blockLimit: number | undefined;
  /** Whether the backend should reconcile paint for this advance. */
  readonly render: boolean;
}

/** Canonical state transition produced after accepting one backend pass result. */
export interface QuirePageStackFillCommit {
  /** State projection emitted when the accepted pass advanced the fill window. */
  readonly advance?: QuirePageStackFillAdvance;
  /** Whether the active generation should schedule another pass. */
  readonly scheduleNext: boolean;
}

/** Inputs for starting viewport-first page-stack fill. */
export interface StartQuirePageStackFillOptions {
  /** Total top-level block count in the current document. */
  readonly total: number;
  /** Exclusive top-level block limit already shaped for first paint. */
  readonly initialBlockLimit: number;
}

/** Inputs for rebounding fill around a focused interaction window. */
export interface ActivateQuirePageStackInteractionFillOptions {
  /** Total top-level block count in the current document. */
  readonly total: number;
  /** Exclusive top-level block limit needed by the interaction render. */
  readonly blockLimit: number;
}

/** Configuration for the shared mounted page-stack fill controller. */
export interface QuirePageStackFillControllerOptions {
  /** Scheduling strategy selected by the mounted backend. */
  readonly scheduler: QuirePageStackFillScheduler;
  /** Delay before postponed fill resumes after focused interaction. */
  readonly resumeCooldownMs: number;
  /**
   * Resolves the number of top-level blocks executed by the next fill pass.
   *
   * @returns Positive fill chunk size for the active backend mode.
   */
  readonly resolveChunkSize: () => number;
  /**
   * Reports whether the mounted backend can still accept fill work.
   *
   * @returns Whether the view and its page-stack host remain available.
   */
  readonly isAvailable: () => boolean;
  /**
   * Gives the backend one fill chunk to shape or materialize.
   *
   * @param request - Chunk range and generation signal.
   * @returns Backend decision for advancing, retrying, or stopping.
   */
  readonly executePass: (
    request: QuirePageStackFillPassRequest
  ) => QuirePageStackFillPassResult | Promise<QuirePageStackFillPassResult>;
  /** Called by the paint bridge before the first background pass is scheduled. */
  readonly onInitialBridge: () => void;
  /**
   * Reconciles backend state after the canonical fill window advances.
   *
   * @param advance - New block limit, completion state, and paint decision.
   */
  readonly onAdvance: (advance: QuirePageStackFillAdvance) => void;
}

/** Shared viewport-first fill lifecycle consumed by mounted Canvas and SVG views. */
export interface QuirePageStackFillController {
  /** Whether this mount has started viewport-first fill at least once. */
  readonly started: boolean;
  /** Current exclusive shaped-block limit, or undefined after full completion. */
  readonly blockLimit: number | undefined;
  /** Total top-level block count owned by the active fill generation. */
  readonly total: number | undefined;
  /** Whether fill is waiting for the focused interaction frame to complete. */
  readonly interactionResumePending: boolean;
  /**
   * Starts initial viewport-first fill and its paint bridge.
   *
   * @param options - Initial shaped window and total block count.
   * @returns Whether a new fill generation was started.
   */
  start(options: StartQuirePageStackFillOptions): boolean;
  /**
   * Rebounds a completed fill around a focused dirty block window.
   *
   * @param options - Interaction block limit and total block count.
   */
  activateInteraction(options: ActivateQuirePageStackInteractionFillOptions): void;
  /** Cancels the current generation and clears its document-owned window state. */
  reset(): void;
  /** Defers incomplete fill so the next focused interaction frame owns the scheduler. */
  postponeForInteraction(): void;
  /** Resumes postponed fill after the focused interaction render completes. */
  resumeAfterInteraction(): void;
  /**
   * Reports whether the active page-stack fill still has blocks to materialize.
   *
   * @returns Whether fill is active and incomplete.
   */
  isIncomplete(): boolean;
  /** Permanently cancels this controller and every scheduled callback. */
  destroy(): void;
}

/** Backend work consumed by one presentation-owned page-stack fill lifecycle. */
export interface QuirePageStackFillPresentationBackendOptions {
  /** Scheduler owned by the backend presentation resource. */
  readonly scheduler: QuirePageStackFillScheduler;
  /** Delay before postponed fill resumes after focused interaction. */
  readonly resumeCooldownMs: number;
  /**
   * Resolves the number of top-level blocks executed by the next fill pass.
   *
   * @returns Positive fill chunk size for the active backend mode.
   */
  readonly resolveChunkSize: () => number;
  /**
   * Reports whether the presentation can still accept fill work.
   *
   * @returns Whether the owned presentation resource remains available.
   */
  readonly isAvailable: () => boolean;
  /**
   * Gives the backend one fill chunk to shape or materialize.
   *
   * @param request - Chunk range and generation signal.
   * @returns Backend decision for advancing, retrying, or stopping.
   */
  readonly executePass: (
    request: QuirePageStackFillPassRequest
  ) => QuirePageStackFillPassResult | Promise<QuirePageStackFillPassResult>;
  /**
   * Reconciles backend state after the canonical fill window advances.
   *
   * @param advance - New block limit, completion state, and paint decision.
   */
  readonly onAdvance: (advance: QuirePageStackFillAdvance) => void;
}

/** Policy and backend capabilities for one presentation-owned fill lifecycle. */
export interface QuirePageStackFillPresentationLifecycleOptions
  extends QuirePageStackFillPresentationBackendOptions {
  /** Documents at or below this block count render without viewport-first fill. */
  readonly minimumBlockCount: number;
  /**
   * Resolves the viewport-relative top-level block window.
   *
   * @returns Number of top-level blocks required by the initial viewport.
   */
  readonly resolveInitialBlockLimit: () => number;
  /**
   * Resolves the exact cumulative shaping extent for the bounded initial render.
   *
   * @returns Document-space shaping extent in CSS pixels.
   */
  readonly resolveInitialShapedBlockExtent: () => number;
  /** Called after the bounded initial paint and before background fill begins. */
  readonly onInitialBridge: () => void;
}

/** Semantic document facts supplied before one paginated presentation render. */
export interface PrepareQuirePageStackFillRenderOptions {
  /** Current top-level block count. */
  readonly totalBlockCount: number;
  /** Whether this is the initial render of a mounted document generation. */
  readonly initial: boolean;
  /** First dirty top-level block for a focused edit, when one exists. */
  readonly interactionFirstDirtyBlockIndex?: number | undefined;
}

/** Bounded layout facts consumed by one paginated backend render. */
export interface QuirePageStackFillRenderWindow {
  /** Exclusive top-level block limit, or undefined for complete layout. */
  readonly maxBlocks?: number | undefined;
  /** Exact cumulative shaping extent for the first bounded render. */
  readonly maxShapedBlockExtent?: number | undefined;
  /** Whether the initial render should mount only its exact visible page set. */
  readonly initialWindowActive: boolean;
}

/** Presentation-owned semantic lifecycle for viewport-first page-stack fill. */
export interface QuirePageStackFillPresentationLifecycle {
  /**
   * Resolves bounded layout facts for one document render.
   *
   * @param options - Initial and focused-interaction document facts.
   * @returns Layout window consumed by the backend render.
   */
  prepareRender(
    options: PrepareQuirePageStackFillRenderOptions
  ): QuirePageStackFillRenderWindow;
  /** Defers incomplete fill so focused interaction owns the next frame. */
  postponeForInteraction(): void;
  /** Resumes postponed fill after focused interaction has painted. */
  resumeAfterInteraction(): void;
  /** Cancels fill generations and all presentation-owned scheduled work. */
  destroy(): void;
}

/** Common browser capabilities used to assemble a backend's fill policy. */
export interface MountedPageStackFillOptions {
  /** Mounted root whose document owns frame scheduling. */
  readonly root: HTMLElement;
  /** Optional embedding frame overrides. */
  readonly runtime?: {
    /** Requests a frame using the embedding scheduler. */
    readonly requestUpdateFrame?: ((callback: () => void) => number) | undefined;
    /** Cancels an embedding frame. */
    readonly cancelUpdateFrame?: ((handle: number) => void) | undefined;
  } | undefined;
  /** Backend reconciliation and optional chunk execution/scheduling. */
  readonly fill: MountedPageStackFillBackend;
  /** Reads the visible height in document coordinates. */
  readonly readVisibleHeight: () => number;
  /** Synchronizes the viewport before background fill. */
  readonly syncViewport: () => void;
  /** Reports whether this presentation is still alive. */
  readonly isAvailable: () => boolean;
}

/** Backend hooks shared by mounted fill policy assembly. */
export interface MountedPageStackFillBackend extends Pick<QuirePageStackFillPresentationBackendOptions, "onAdvance"> {
  /** Optional embedding scheduler. */
  readonly scheduler?: QuirePageStackFillScheduler | undefined;
  /** Optional backend chunk execution; absent for render-driven fill. */
  readonly executePass?: QuirePageStackFillPresentationBackendOptions["executePass"] | undefined;
}
