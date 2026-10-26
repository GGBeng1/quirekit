import type { DrawingKind, DrawingPayload, DrawingShapeGeometry } from "@quirekit/drawing-geometry";
import type { QuireDrawingControlReference } from "../../drawing/control-points/types";
import type { QuirePoint, QuireRect } from "@quirekit/renderer";

/** Stable resize handles arranged around one selected drawing frame. */
export type QuireDrawingResizeHandle =
  | "north-west"
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west";

/** Manipulation families owned by the drawing controller. */
export type QuireDrawingManipulationOperation = "move" | "resize" | "rotate" | "control";

/** Exact source and visual occurrence selected by the drawing controller. */
export interface QuireDrawingControllerIdentity {
  /** Stable document-order anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Retained root identity containing the visual occurrence. */
  readonly rootId: string;
  /** Retained region identity containing the visual occurrence. */
  readonly regionId: string;
  /** Exact repeated visual occurrence that owns controls. */
  readonly visualInstanceId: string;
  /** Source revision captured before transient interaction begins. */
  readonly sourceRevision: string | number;
}

/** Accepted or preview drawing geometry in document coordinates. */
export interface QuireDrawingFrame {
  /** Axis-aligned extent before the drawing rotation is applied. */
  readonly rect: QuireRect;
  /** Clockwise rotation in degrees normalized to `[0, 360)`. */
  readonly rotation: number;
}

/** CSS-client and document-space points captured for one pointer. */
export interface QuireDrawingPointerOrigin {
  /** Browser pointer identifier. */
  readonly pointerId: number;
  /** CSS-client point used for click-versus-drag threshold checks. */
  readonly clientPoint: QuirePoint;
  /** Projected document-space point used for preview geometry. */
  readonly point: QuirePoint;
}

/** Immutable transient geometry produced by one manipulation gesture. */
export interface QuireDrawingTransientTrack {
  /** Track family. */
  readonly kind: "create" | QuireDrawingManipulationOperation;
  /** Accepted geometry when the track began. */
  readonly startFrame: QuireDrawingFrame;
  /** Latest renderer-neutral preview geometry. */
  readonly previewFrame: QuireDrawingFrame;
  /** Projected document point where the gesture began. */
  readonly startPoint: QuirePoint;
  /** Latest projected document point. */
  readonly currentPoint: QuirePoint;
  /** Adjusted source-shaped geometry used by preview and final canonical commit. */
  readonly previewDrawing?: DrawingPayload | undefined;
  /** Vertical reflection used when a newly drawn line has a negative slope. */
  readonly flipVertical?: boolean | undefined;
}

/** Stable idle controller state. */
export interface QuireDrawingIdleState {
  /** State discriminator. */
  readonly kind: "idle";
}

/** Stable selected-object controller state. */
export interface QuireDrawingObjectSelectedState {
  /** State discriminator. */
  readonly kind: "object-selected";
  /** Exact selected source and visual occurrence. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Accepted selected frame. */
  readonly frame: QuireDrawingFrame;
}

/** Drawing-text editing state nested inside one selected object. */
export interface QuireDrawingTextEditingState {
  /** State discriminator. */
  readonly kind: "text-editing";
  /** Exact surrounding object and visual occurrence. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Accepted surrounding object frame. */
  readonly frame: QuireDrawingFrame;
  /** Independently owned rich-text story identity. */
  readonly storyId: string;
}

/** Provisional creation state before one object exists in ProseMirror. */
export interface QuireDrawingCreatingState {
  /** State discriminator. */
  readonly kind: "creating";
  /** Preallocated identity used by the eventual source object. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Drawing geometry family being created. */
  readonly drawingKind: DrawingKind;
  /** Explicit geometry carried by a shape creation gesture. */
  readonly geometry?: DrawingShapeGeometry | undefined;
  /** Captured pointer origin. */
  readonly pointer: QuireDrawingPointerOrigin;
  /** Default extent used when the gesture remains a click. */
  readonly defaultExtent: Readonly<{ width: number; height: number }>;
  /** Latest creation preview. */
  readonly track: QuireDrawingTransientTrack;
  /** Whether client movement crossed the drag threshold. */
  readonly dragged: boolean;
}

/** Facts shared by pre-manipulation states. */
export interface QuireDrawingPreManipulationStateBase {
  /** Immutable drawing captured before manipulation. */
  readonly drawing?: DrawingPayload | undefined;
  /** Geometry-specific control selected by exact hit testing. */
  readonly control?: QuireDrawingControlReference | undefined;
  /** Exact selected source and visual occurrence. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Accepted frame before manipulation. */
  readonly frame: QuireDrawingFrame;
  /** Captured pointer origin. */
  readonly pointer: QuireDrawingPointerOrigin;
  /** Whether resize should preserve the accepted aspect ratio. */
  readonly lockAspectRatio: boolean;
  /** Resize handle, present only for resize. */
  readonly handle?: QuireDrawingResizeHandle | undefined;
}

/** Pointer-down state that has not yet crossed the movement threshold. */
export type QuireDrawingPreManipulationState =
  | (QuireDrawingPreManipulationStateBase & { readonly kind: "pre-move" })
  | (QuireDrawingPreManipulationStateBase & { readonly kind: "pre-resize" })
  | (QuireDrawingPreManipulationStateBase & { readonly kind: "pre-rotate" })
  | (QuireDrawingPreManipulationStateBase & { readonly kind: "pre-control" });

/** Facts shared by active manipulation states. */
export interface QuireDrawingManipulatingStateBase {
  /** Immutable drawing captured before manipulation. */
  readonly drawing?: DrawingPayload | undefined;
  /** Geometry-specific control selected by exact hit testing. */
  readonly control?: QuireDrawingControlReference | undefined;
  /** Exact selected source and visual occurrence. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Captured pointer origin. */
  readonly pointer: QuireDrawingPointerOrigin;
  /** Current immutable transient geometry track. */
  readonly track: QuireDrawingTransientTrack;
  /** Whether resize preserves the accepted aspect ratio. */
  readonly lockAspectRatio: boolean;
  /** Resize handle, present only for resize. */
  readonly handle?: QuireDrawingResizeHandle | undefined;
}

/** Active gesture state after the movement threshold is crossed. */
export type QuireDrawingManipulatingState =
  | (QuireDrawingManipulatingStateBase & { readonly kind: "moving" })
  | (QuireDrawingManipulatingStateBase & { readonly kind: "resizing" })
  | (QuireDrawingManipulatingStateBase & { readonly kind: "rotating" })
  | (QuireDrawingManipulatingStateBase & { readonly kind: "controlling" });

/** Complete renderer-neutral drawing-controller state. */
export type QuireDrawingControllerState =
  | QuireDrawingIdleState
  | QuireDrawingCreatingState
  | QuireDrawingObjectSelectedState
  | QuireDrawingTextEditingState
  | QuireDrawingPreManipulationState
  | QuireDrawingManipulatingState;

/** Stable object-selection event. */
export interface QuireDrawingSelectObjectEvent {
  /** Event discriminator. */
  readonly kind: "select-object";
  /** Exact selected identity. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Accepted selected frame. */
  readonly frame: QuireDrawingFrame;
}

/** Event entering the nested drawing-text story. */
export interface QuireDrawingEnterTextEvent {
  /** Event discriminator. */
  readonly kind: "enter-text";
  /** Exact surrounding object identity. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Independently owned drawing-text story identity. */
  readonly storyId: string;
}

/** Event beginning a move, resize, or rotate gesture. */
export interface QuireDrawingBeginManipulationEvent {
  /** Immutable drawing captured before manipulation. */
  readonly drawing?: DrawingPayload | undefined;
  /** Geometry-specific control selected by exact hit testing. */
  readonly control?: QuireDrawingControlReference | undefined;
  /** Event discriminator. */
  readonly kind: "begin-manipulation";
  /** Requested manipulation family. */
  readonly operation: QuireDrawingManipulationOperation;
  /** Resize handle required by resize operations. */
  readonly handle?: QuireDrawingResizeHandle | undefined;
  /** Exact selected identity. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Browser pointer identifier. */
  readonly pointerId: number;
  /** CSS-client pointer origin. */
  readonly clientPoint: QuirePoint;
  /** Projected document pointer origin. */
  readonly point: QuirePoint;
  /** Whether resize should preserve aspect ratio. */
  readonly lockAspectRatio: boolean;
}

/** Event beginning provisional drawing creation. */
export interface QuireDrawingBeginCreateEvent {
  /** Event discriminator. */
  readonly kind: "begin-create";
  /** Preallocated future source identity. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Drawing geometry family to create. */
  readonly drawingKind: DrawingKind;
  /** Explicit geometry carried by a shape creation gesture. */
  readonly geometry?: DrawingShapeGeometry | undefined;
  /** Browser pointer identifier. */
  readonly pointerId: number;
  /** CSS-client pointer origin. */
  readonly clientPoint: QuirePoint;
  /** Projected document pointer origin. */
  readonly point: QuirePoint;
  /** Extent used when creation finishes as a click. */
  readonly defaultExtent: Readonly<{ width: number; height: number }>;
}

/** Shared pointer update/end facts normalized by mounted View. */
export interface QuireDrawingPointerProgressEvent {
  /** Update or completion phase. */
  readonly kind: "pointer-update" | "pointer-end";
  /** Exact identity captured by the target. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Browser pointer identifier. */
  readonly pointerId: number;
  /** Current CSS-client point. */
  readonly clientPoint: QuirePoint;
  /** Current projected document point. */
  readonly point: QuirePoint;
  /** Current constraint modifier, including the final pointer release. */
  readonly shiftKey?: boolean | undefined;
}

/** Pointer cancellation facts normalized by mounted View. */
export interface QuireDrawingPointerCancelEvent {
  /** Event discriminator. */
  readonly kind: "pointer-cancel";
  /** Exact identity captured by the target. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Browser pointer identifier. */
  readonly pointerId: number;
}

/** Controller event union. */
export type QuireDrawingControllerEvent =
  | QuireDrawingSelectObjectEvent
  | QuireDrawingEnterTextEvent
  | QuireDrawingBeginManipulationEvent
  | QuireDrawingBeginCreateEvent
  | QuireDrawingPointerProgressEvent
  | QuireDrawingPointerCancelEvent
  | { readonly kind: "escape" }
  | { readonly kind: "clear-selection" };

/** Final source mutation requested after one completed gesture. */
export interface QuireDrawingControllerCommitIntent {
  /** Final adjusted drawing supplied only by geometry controls. */
  readonly drawing?: DrawingPayload | undefined;
  /** Mutation family. */
  readonly kind: "create" | QuireDrawingManipulationOperation;
  /** Exact source identity that must be revalidated before dispatch. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Final requested frame. */
  readonly frame: QuireDrawingFrame;
  /** Accepted frame before manipulation, absent for creation. */
  readonly previousFrame?: QuireDrawingFrame | undefined;
  /** Creation reflection for a line drawn in either diagonal direction. */
  readonly flipVertical?: boolean | undefined;
  /** Drawing kind required by creation. */
  readonly drawingKind?: DrawingKind | undefined;
  /** Explicit geometry carried by the final creation intent. */
  readonly geometry?: DrawingShapeGeometry | undefined;
  /** Resize handle used by a resize commit. */
  readonly handle?: QuireDrawingResizeHandle | undefined;
}

/** Reasons a pointer event cannot continue the captured controller state. */
export type QuireDrawingControllerRejection =
  | "stale-identity"
  | "pointer-mismatch"
  | "invalid-state";

/** Result of one pure drawing-controller transition. */
export interface QuireDrawingControllerTransition {
  /** Next controller state. */
  readonly state: QuireDrawingControllerState;
  /** Single final mutation intent, or null for transient transitions. */
  readonly commit: QuireDrawingControllerCommitIntent | null;
  /** Optional rejection explaining why a captured gesture was discarded. */
  readonly rejection?: QuireDrawingControllerRejection | undefined;
}

/** Tunable interaction policy for drawing gestures. */
export interface QuireDrawingControllerOptions extends DrawingResizePolicy {
  /** CSS-pixel movement required before a manipulation becomes a drag. */
  readonly dragThreshold?: number | undefined;
}
import type { DrawingResizePolicy } from "@quirekit/drawing-geometry";
