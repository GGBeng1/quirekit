import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDrawingControllerIdentity, QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { DrawingResizePolicy } from "@quirekit/drawing-geometry";
import type {
  QuireDrawingControllerState,
  QuireDrawingManipulationEventPayload
} from "@quirekit/view-engine";
import type { QuireViewEvent } from "@quirekit/renderer";

/** Internal lifecycle for the pointer-driven manipulation subdomain. */
export interface MountedDrawingManipulationRuntime {
  /**
   * Handles one compiled drawing manipulation event.
   *
   * @param event - Renderer-neutral captured pointer event.
   * @returns Whether the manipulation subdomain consumed the event.
   */
  readonly handle: (
    event: QuireViewEvent<unknown, QuireDrawingManipulationEventPayload>
  ) => boolean;
  /** Cancels a captured gesture and restores the accepted presentation. @returns Whether capture existed. */
  readonly cancel: () => boolean;
  /** @param shiftKey - Current constraint key. @returns Whether an endpoint preview was refreshed. */
  readonly updateModifiers: (shiftKey: boolean) => boolean;
  /** @returns Current pure drawing-controller state. */
  readonly getState: () => QuireDrawingControllerState;
  /** Clears any captured gesture without destroying the runtime. */
  readonly reset: () => void;
  /** Releases the captured gesture and clears transient preview state. */
  readonly destroy: () => void;
}

/** Exact source and retained contribution captured for one pointer gesture. */
export interface MountedDrawingInteractionSession {
  /** Source document object captured before transient manipulation begins. */
  readonly doc: ProseMirrorNode;
  /** Accepted retained layout snapshot frozen for the complete gesture. */
  readonly snapshot: QuireRetainedLayoutSnapshot;
  /** Exact position before the Word anchor node. */
  readonly position: number;
  /** Exact controller identity for the retained visual occurrence. */
  readonly identity: QuireDrawingControllerIdentity;
  /** Browser pointer that owns this session. */
  readonly pointerId: number;
  /** Owner geometry policy captured once from the accepted document revision. */
  readonly resizePolicy?: DrawingResizePolicy;
}

/** Started state and captured authority for one valid pointer-down event. */
export interface MountedDrawingManipulationStart {
  /** Pure controller state after manipulation begins. */
  readonly state: QuireDrawingControllerState;
  /** Exact accepted source authority retained for the gesture. */
  readonly session: MountedDrawingInteractionSession;
}
