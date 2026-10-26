import type { QuireRect, QuireViewDispatchResult } from "@quirekit/renderer";
import type { QuireEditorInputBinding } from "../../../input";
import type {
  QuireClientPoint,
  QuireClientRect,
  QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type { QuireViewPointerPolicy } from "@quirekit/view-engine";
import type { QuireEditorViewStatus } from "../types";

/** Inputs used to resolve the cursor shown over a mounted editor surface. */
export interface ResolveMountedPointerCursorOptions {
  /** CSS cursor declared by the view target under the pointer, when any. */
  readonly targetCursor?: string | undefined;
  /** Whether the accepted hit belongs to an object rather than its underlying caret. */
  readonly overObject?: boolean | undefined;
  /** Whether the pointer maps to editable document content. */
  readonly overContent: boolean;
  /** Whether the mounted view currently accepts editing input. */
  readonly editable: boolean;
}

/** Options used to synchronize native input with an owned pointer action. */
export interface SynchronizeMountedPointerInputOptions {
  /** Current native input binding, when the mounted view owns one. */
  readonly inputBinding: QuireEditorInputBinding | undefined;
  /** Retained pointer-policy decision for the current action. */
  readonly decision: QuireMountedPointerPolicyDecision;
  /** Touch re-anchoring preserves the currently visible native keyboard. */
  readonly pointerType?: string | undefined;
}

/** Mounted pointer policy decision returned before a backend mutates selection. */
export type QuireMountedPointerPolicyDecisionKind =
  | "widget-dispatch"
  | "locked-hit-test"
  | "selection"
  | "target-dispatch"
  | "pass-through"
  | "focus-only";

/** Options used to resolve mounted pointer policy for one pointerdown event. */
export interface ResolveMountedPointerPolicyDecisionOptions {
  /** Runtime status of the mounted view receiving the pointer event. */
  readonly status: QuireEditorViewStatus;
  /** Dispatch result for the low-level qkView pointerdown event. */
  readonly pointerDispatch?: QuireViewDispatchResult | undefined;
  /** Dispatch result for the normalized qkView click or double-click event. */
  readonly clickDispatch?: QuireViewDispatchResult | undefined;
  /** Retained interaction target under the pointer, when hit testing has run. */
  readonly interactionTarget?: QuireInteractionSelectionTarget | null | undefined;
}

/** Resolved mounted pointer policy consumed by pointerdown handlers. */
export interface QuireMountedPointerPolicyDecision {
  /** High-level decision kind for the pointerdown path. */
  readonly kind: QuireMountedPointerPolicyDecisionKind;
  /** Retained policy that produced this decision, when one was available. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Whether the mounted editor should focus after this decision. */
  readonly shouldFocusEditor: boolean;
  /** Whether ProseMirror click props may run for this pointerdown. */
  readonly shouldRunPluginClickProps: boolean;
  /** Whether selection semantics may consume this pointerdown. */
  readonly shouldStartSelection: boolean;
  /** Whether pointer capture may start for this pointerdown. */
  readonly shouldCapturePointer: boolean;
  /** Whether the active interaction target should be retained for command routing. */
  readonly shouldKeepInteractionTarget: boolean;
}

/** Options used to project an active drag pointer into a mounted surface. */
export interface ProjectMountedDragClientPointOptions {
  /** Browser client point reported by the active pointer move. */
  readonly clientPoint: QuireClientPoint;
  /** Mounted coordinate surface client rectangle. */
  readonly surfaceClientRect: QuireClientRect;
  /** Optional visible drag boundary, usually the mounted scroller viewport. */
  readonly dragBoundaryClientRect?: QuireClientRect | undefined;
  /** Optional layout viewport in client space used for horizontal line-edge projection. */
  readonly layoutViewportClientRect?: QuireClientRect | undefined;
}

/** Options used to resolve a layout viewport rectangle in client coordinates. */
export interface ResolveMountedLayoutViewportClientRectOptions {
  /** Mounted coordinate surface client rectangle. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds the coordinate surface maps onto. */
  readonly surfaceBounds: QuireRect;
  /** Layout viewport rectangle expressed in document coordinates. */
  readonly viewportRect: QuireRect;
}
