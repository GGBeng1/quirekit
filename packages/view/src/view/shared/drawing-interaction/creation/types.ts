import type { DrawingShapeGeometry } from "@quirekit/drawing-geometry";
import type { QuireDrawingControllerIdentity, QuireDrawingControllerState } from "@quirekit/view-engine";
import type { MountedDrawingCreatedTextBox, MountedDrawingCreationOptions, MountedDrawingCreationPointerEvent } from "../types";

/** Preallocated identities and source attachment for one creation capture. */
export interface MountedDrawingCreationSession {
  /** Stable identities shared by the future anchor, drawing, and story. */
  readonly identities: MountedDrawingCreatedTextBox;
  /** Exact pure-controller identity for this provisional occurrence. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Browser pointer that owns creation. */
  readonly pointerId: number;
  /** Body insertion position captured before the gesture begins. */
  readonly anchorPosition: number;
  /** Page index used for page-relative placement intent. */
  readonly pageIndex: number | null;
}

/** Fully resolved one-shot creation tool configuration. */
export interface ArmedMountedDrawingCreation {
  /** Currently supported drawing family. */
  readonly drawingKind: "horizontal-text-box" | "shape";
  /** Validated source geometry for shape creation. */
  readonly geometry?: DrawingShapeGeometry | undefined;
  /** Default extent used when the gesture remains a click. */
  readonly defaultExtent: Readonly<{ width: number; height: number }>;
  /** Stable source anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Stable independent story identity. */
  readonly storyId: string;
}

/** Focused creation state composed by the broader drawing interaction runtime. */
export interface MountedDrawingCreationRuntime {
  /** Arms one supported one-shot creation tool. */
  arm(options?: MountedDrawingCreationOptions): boolean;
  /** Handles a normalized creation pointer phase. */
  handlePointer(event: MountedDrawingCreationPointerEvent): boolean;
  /** Replays the latest raw point with the current constraint modifier. */
  updateModifiers(shiftKey: boolean): boolean;
  /** Cancels armed or captured creation. */
  cancel(): boolean;
  /** Reports whether creation owns the next or current pointer gesture. */
  isActive(): boolean;
  /** Reads the current pure controller state. */
  getState(): QuireDrawingControllerState;
  /** Releases transient creation state. */
  destroy(): void;
}
