import type { EditorUIAnchorRect } from "../anchor";
import type { EditorUINodeIdentity } from "../node-identity";
import type {
  EditorUINodeRangeSelectionResult,
  EditorUINodeRangeSelectionSnapshot,
  NodeRangeSelection
} from "../node-range-selection";

/** Renderer-neutral two-dimensional point. */
export interface EditorUIDragPoint {
  /** Horizontal coordinate in the declared context. */
  readonly x: number;
  /** Vertical coordinate in the declared context. */
  readonly y: number;
}

/** Structural placement represented by a ready drop target. */
export type EditorUIDragPlacement =
  | "before"
  | "after"
  | "container-slot"
  | "column-slot"
  | "replace"
  | "attach";

/** Client-space scrollport edge that requests auto-scroll. */
export type EditorUIDragAutoScrollEdge =
  | "inline-start"
  | "inline-end"
  | "block-start"
  | "block-end";

/** Typed auto-scroll decision supplied by a mounted adapter. */
export type EditorUIDragAutoScrollDecision =
  | { readonly kind: "idle" }
  | {
      readonly kind: "scroll";
      readonly deltaX: number;
      readonly deltaY: number;
      readonly edges: readonly EditorUIDragAutoScrollEdge[];
    };

/** Authoritative document-space indicator derived from retained geometry. */
export interface EditorUIDragIndicator {
  /** Indicator shape rendered by the mounted backend. */
  readonly kind: "line" | "outline";
  /** Coordinate-space authority for the indicator rectangle. */
  readonly coordinateSpace: "document";
  /** Snapshot version that produced the indicator. */
  readonly snapshotVersion: number;
  /** Structural placement represented by the indicator. */
  readonly placement: EditorUIDragPlacement;
  /** Document-space indicator rectangle. */
  readonly rect: EditorUIAnchorRect;
  /** Retained target ids that supplied the geometry. */
  readonly sourceTargetIds: readonly string[];
}

/** Stable target rejection reason shared by drag foundations and features. */
export type EditorUIDragTargetRejectionReason =
  | "outside"
  | "no-target"
  | "invalid-target"
  | "read-only"
  | "protected"
  | "locked"
  | "stale"
  | "cross-root"
  | "schema-incompatible"
  | "source-contains-target"
  | "permission-denied";

/** Terminal cancellation reason owned by one drag session. */
export type EditorUIDragCancelReason =
  | EditorUIDragTargetRejectionReason
  | "pointer-cancel"
  | "escape"
  | "window-blur"
  | "view-destroy"
  | "source-remap-failed"
  | "lock-unavailable";

/** Ready command-neutral drop target. */
export interface EditorUIDragReadyTarget<TargetPayload> {
  /** Ready-target discriminator. */
  readonly status: "ready";
  /** Snapshot version that produced target geometry. */
  readonly snapshotVersion: number;
  /** Stable target node identity. */
  readonly identity: EditorUINodeIdentity;
  /** Structural placement relative to the target. */
  readonly placement: EditorUIDragPlacement;
  /** Authoritative indicator derived from the same target geometry. */
  readonly indicator: EditorUIDragIndicator;
  /** Opaque feature-owned target facts for a later canonical command. */
  readonly payload: TargetPayload;
}

/** Explicit non-committable target resolution. */
export interface EditorUIDragRejectedTarget {
  /** Rejected-target discriminator. */
  readonly status: "rejected";
  /** Stable reason that prevents a drop. */
  readonly reason: EditorUIDragTargetRejectionReason;
  /** Snapshot version that produced the rejection, when available. */
  readonly snapshotVersion?: number | undefined;
}

/** Command-neutral ready or rejected target result. */
export type EditorUIDragTargetResolution<TargetPayload> =
  | EditorUIDragReadyTarget<TargetPayload>
  | EditorUIDragRejectedTarget;

/** Stable drag source and opaque feature payload. */
export interface EditorUIDragSource<SourcePayload> {
  /** Version-bound structural source selection. */
  readonly selection: NodeRangeSelection;
  /** Opaque feature-owned source facts for a later canonical command. */
  readonly payload: SourcePayload;
}

/** Inputs used to arm one pointer drag. */
export interface EditorUIDragArmInput<SourcePayload> {
  /** Browser pointer identifier owning the gesture. */
  readonly pointerId: number;
  /** Initial browser client point in CSS pixels. */
  readonly pressClientPoint: EditorUIDragPoint;
  /** Stable structural source and feature payload. */
  readonly source: EditorUIDragSource<SourcePayload>;
}

/** One mounted pointer sample offered to an active drag session. */
export interface EditorUIDragUpdateInput {
  /** Browser pointer identifier owning the gesture. */
  readonly pointerId: number;
  /** Latest browser client point in CSS pixels. */
  readonly clientPoint: EditorUIDragPoint;
  /** Optional current point projected through mounted document geometry. */
  readonly documentPoint?: EditorUIDragPoint | undefined;
  /** Current retained snapshot version. */
  readonly snapshotVersion: number;
  /** Whether the point remains inside an editor-owned content drop zone. */
  readonly insideDropZone: boolean;
  /** Mounted auto-scroll decision for this sample. */
  readonly autoScroll: EditorUIDragAutoScrollDecision;
}

/** Inputs supplied to the command-neutral target resolver. */
export interface EditorUIDragTargetResolverInput<SourcePayload> {
  /** Current stable source selection and opaque payload. */
  readonly source: EditorUIDragSource<SourcePayload>;
  /** Latest mounted pointer sample. */
  readonly update: EditorUIDragUpdateInput;
}

/** Typed drop intent returned to a feature owner after final session validation. */
export interface EditorUIDropIntent<SourcePayload, TargetPayload> {
  /** Command-neutral intent discriminator. */
  readonly kind: "drop";
  /** Snapshot version shared by source and target. */
  readonly snapshotVersion: number;
  /** Immutable source selection snapshot and opaque feature payload. */
  readonly source: {
    readonly selection: EditorUINodeRangeSelectionSnapshot;
    readonly payload: SourcePayload;
  };
  /** Stable target identity, placement, and opaque feature payload. */
  readonly target: {
    readonly identity: EditorUINodeIdentity;
    readonly placement: EditorUIDragPlacement;
    readonly payload: TargetPayload;
  };
}

/** Ports owned for the complete transient drag lifecycle. */
export interface EditorUIDragSessionPorts<SourcePayload, TargetPayload> {
  /** CSS-pixel activation threshold. */
  readonly threshold?: number | undefined;
  /**
   * Resolves the latest pointer sample against authoritative target facts.
   *
   * @param input - Current stable source and mounted pointer sample.
   * @returns Ready command-neutral target or explicit rejection.
   */
  readonly resolveTarget: (
    input: EditorUIDragTargetResolverInput<SourcePayload>
  ) => EditorUIDragTargetResolution<TargetPayload>;
  /** Optional exclusive preview-lock port. */
  readonly lock?: {
    /**
     * Acquires the transient preview lock.
     *
     * @returns Whether the lock was acquired.
     */
    readonly acquire: () => boolean;
    /** Releases the transient preview lock. */
    readonly release: () => void;
  } | undefined;
  /** Optional authoritative indicator presentation port. */
  readonly indicator?: {
    /**
     * Presents one ready indicator.
     *
     * @param indicator - Authoritative document-space indicator.
     */
    readonly show: (indicator: EditorUIDragIndicator) => void;
    /** Clears the last presented indicator. */
    readonly clear: () => void;
  } | undefined;
  /** Optional mounted auto-scroll lifecycle port. */
  readonly autoScroll?: {
    /**
     * Applies one active auto-scroll decision.
     *
     * @param decision - Mounted scroll decision.
     */
    readonly update: (decision: Extract<EditorUIDragAutoScrollDecision, { readonly kind: "scroll" }>) => void;
    /** Stops active auto-scroll. */
    readonly stop: () => void;
  } | undefined;
  /** Optional transient listener lifecycle released at every terminal path. */
  readonly listeners?: {
    /** Removes pointer, keyboard, blur, and view lifecycle listeners. */
    readonly release: () => void;
  } | undefined;
}

/** Public drag-session state used by headless surfaces and diagnostics. */
export type EditorUIDragSessionState<SourcePayload, TargetPayload> =
  | { readonly phase: "idle" }
  | {
      readonly phase: "armed" | "dragging";
      readonly pointerId: number;
      readonly snapshotVersion: number;
      readonly source: EditorUIDragSource<SourcePayload>;
    }
  | {
      readonly phase: "targeting";
      readonly pointerId: number;
      readonly snapshotVersion: number;
      readonly source: EditorUIDragSource<SourcePayload>;
      readonly target: EditorUIDragTargetResolution<TargetPayload>;
    }
  | {
      readonly phase: "committed";
      readonly intent: EditorUIDropIntent<SourcePayload, TargetPayload>;
    }
  | { readonly phase: "cancelled"; readonly reason: EditorUIDragCancelReason }
  | { readonly phase: "destroyed" };

/** Result returned after arming one session. */
export type EditorUIDragArmResult =
  | { readonly status: "armed" }
  | { readonly status: "rejected"; readonly reason: "already-active" | "lock-unavailable" | "invalid-source" };

/** Result returned after one pointer update. */
export type EditorUIDragUpdateResult<TargetPayload> =
  | { readonly status: "ignored" }
  | { readonly status: "armed" }
  | { readonly status: "targeting"; readonly target: EditorUIDragTargetResolution<TargetPayload> }
  | { readonly status: "cancelled"; readonly reason: EditorUIDragCancelReason };

/** Result returned by a final drop request. */
export type EditorUIDragDropResult<SourcePayload, TargetPayload> =
  | { readonly status: "committed"; readonly intent: EditorUIDropIntent<SourcePayload, TargetPayload> }
  | { readonly status: "ignored" }
  | { readonly status: "rejected"; readonly reason: EditorUIDragCancelReason };

/** Result returned while remapping the active source selection. */
export type EditorUIDragRemapResult =
  | { readonly status: "remapped"; readonly snapshotVersion: number }
  | {
      readonly status: "rejected";
      readonly reason: "inactive" | "cross-root" | "stale" | "source-unavailable";
    };

/** Accepted ready or rejected collaboration source-remap input. */
export type EditorUIDragSourceRemapInput =
  | NodeRangeSelection
  | EditorUINodeRangeSelectionResult;
