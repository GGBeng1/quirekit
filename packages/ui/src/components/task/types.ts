/** Chooses an anchored desktop surface or a bottom task panel. */
export type QuireKitTaskPresentation = "auto" | "desktop" | "bottom";

/** Concrete presentation retained until the surface finishes exiting. */
export type QuireKitResolvedTaskPresentation = "desktop" | "bottom";

/** Source of a synchronously guarded task close request. */
export type QuireKitTaskCloseReason = "close-trigger" | "trigger" | "escape" | "outside" | "swipe" | "action" | "cancel" | "programmatic";

/** Source of an uncommitted session ending. */
export type QuireKitTaskCancelReason = QuireKitTaskCloseReason | "owner-hidden" | "disabled" | "host-close";

/** Synchronous close intent shared by task controls and surfaces. */
export interface QuireKitTaskCloseRequest {
  /** Interaction that initiated this request. */
  readonly reason: QuireKitTaskCloseReason;
  /** Whether the host or task has refused this request. */
  readonly defaultPrevented: boolean;
  /** Refuses this close intent while preserving the active task. */
  preventDefault(): void;
}

/** Identity and cancellation boundary for one business or query request. */
export interface QuireKitTaskRequestContext {
  /** Active task session, replaced on reopening or owner recovery. */
  readonly sessionId: string;
  /** Monotonic identity within the independent submission or search channel. */
  readonly requestId: number;
  /** Aborted when the request is replaced or its session ends. */
  readonly signal: AbortSignal;
}

/** Search intent emitted after a complete ordinary or IME query input. */
export interface QuireKitTaskSearchRequest extends QuireKitTaskRequestContext {
  /** Current complete query, independent from the committed selection. */
  readonly query: string;
}

/** Imperative entry exposed by task component template references. */
export interface QuireKitTaskApi {
  /**
   * Requests closure through the same policy as visible task controls.
   * @param reason - Interaction or host integration requesting closure.
   * @returns Whether synchronous guards accepted the request, before controlled host acknowledgement.
   */
  requestClose(reason?: QuireKitTaskCloseReason): boolean;
}
