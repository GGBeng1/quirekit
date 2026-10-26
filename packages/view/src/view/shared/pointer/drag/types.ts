import type {
  QuireClientPoint,
  QuireHitTestResult
} from "@quirekit/view-engine";

/** Counters that expose active pointer-drag frame coalescing. */
export interface MountedPointerDragFrameCounters {
  /** Number of client points offered by native movement or auto-scroll. */
  readonly receivedPoints: number;
  /** Number of newer points that replaced work already waiting for a frame. */
  readonly coalescedPoints: number;
  /** Number of latest points applied to selection semantics. */
  readonly appliedPoints: number;
  /** Number of applied points forced synchronously at drag completion. */
  readonly flushedPoints: number;
}

/** Options used to create one mounted pointer-drag frame coordinator. */
export interface CreateMountedPointerDragFrameCoordinatorOptions {
  /** Root whose owner window provides the production animation-frame authority. */
  readonly root: HTMLElement;
  /**
   * Applies one latest client point through current geometry.
   *
   * @param clientPoint - Latest immutable client-space drag point.
   */
  readonly applyPoint: (clientPoint: QuireClientPoint) => void;
  /**
   * Optional deterministic frame scheduler for tests and non-browser hosts.
   *
   * @param callback - Callback to run on the next frame.
   * @returns Cancelable frame handle.
   */
  readonly requestFrame?: ((callback: FrameRequestCallback) => number) | undefined;
  /**
   * Optional cancellation paired with `requestFrame`.
   *
   * @param handle - Frame handle returned by `requestFrame`.
   */
  readonly cancelFrame?: ((handle: number) => void) | undefined;
}

/** Frame-coalescing runtime owned by one mounted pointer session. */
export interface MountedPointerDragFrameCoordinator {
  /**
   * Retains the latest active-drag client point for the next frame.
   *
   * @param clientPoint - Latest native or auto-scroll client point.
   * @param geometryChanged - Whether scrolling changed the projection of an unchanged point.
   */
  readonly update: (clientPoint: QuireClientPoint, geometryChanged?: boolean) => void;
  /**
   * Applies the latest pending point synchronously.
   *
   * @returns Whether a pending point was applied.
   */
  readonly flush: () => boolean;
  /** Cancels pending work without applying it. */
  readonly cancel: () => void;
  /**
   * Reads an immutable counter snapshot for tests and diagnostics.
   *
   * @returns Current drag frame counters.
   */
  readonly readCounters: () => MountedPointerDragFrameCounters;
}

/** Pointer drag state shared by mounted view backends. */
export type MountedPointerDragState =
  | MountedPointerSelectionAnchorDragState
  | MountedPointerTargetCaptureDragState
  | MountedPointerDrawingCreationDragState;

/** Pointer drag state owned by the armed drawing creation tool. */
export interface MountedPointerDrawingCreationDragState {
  /** Distinguishes source-free drawing creation from other captures. */
  readonly kind: "drawing-creation";
  /** Browser pointer identifier for the active creation gesture. */
  readonly pointerId: number;
}

/** Pointer drag state whose fixed anchor is resolved in document space. */
export interface MountedPointerSelectionAnchorDragState {
  /** Distinguishes a logical text-selection drag from target capture. */
  readonly kind: "selection-anchor";
  /** Browser pointer identifier for the active drag. */
  readonly pointerId: number;
  /** Client-space press point used to distinguish a stationary click from a drag. */
  readonly pressClientPoint: QuireClientPoint;
  /** Resolved hit that remains authoritative while the scrollport moves. */
  readonly anchorHitTestResult: QuireHitTestResult;
}

/** Pointer drag state owned by a captured qkView target rather than text selection. */
export interface MountedPointerTargetCaptureDragState {
  /** Distinguishes renderer-neutral target capture from text selection. */
  readonly kind: "target-capture";
  /** Browser pointer identifier for the active target gesture. */
  readonly pointerId: number;
  /** Optional CSS cursor retained for the complete target-capture session. */
  readonly captureCursor?: string | undefined;
}
