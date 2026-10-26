import type { EditorState, ResolvedPos, Selection, Transaction } from "@quirekit/pm";
import type { QuireHitTestResult } from "@quirekit/view-engine";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";

/** Applies a ProseMirror transaction produced from pointer selection semantics. */
export type DispatchPointerSelectionTransaction = (
  transaction: Transaction
) => void;

/** PM-compatible selection-between hook used by pointer selection semantics. */
export type CreatePointerSelectionBetween = (
  anchor: ResolvedPos,
  head: ResolvedPos
) => Selection | null;

/** Common inputs for applying already-resolved pointer hits to selection. */
export interface SelectQuireViewPointerHitBaseOptions {
  /** ProseMirror state whose document and current selection are being edited. */
  readonly state: EditorState;
  /** Dispatches the transaction that applies the resolved selection. */
  readonly dispatchTransaction: DispatchPointerSelectionTransaction;
  /** Geometry snapshot that produced the hit-test facts. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
}

/** Inputs used to apply one already-resolved pointer hit to selection. */
export interface SelectQuireViewPointerHitOptions
  extends SelectQuireViewPointerHitBaseOptions {
  /** Hit-test result produced by interaction geometry or a measured refinement. */
  readonly hitTestResult: QuireHitTestResult;
}

/** Inputs used to extend selection from the current anchor to a resolved hit. */
export interface SelectQuireViewPointerAnchorHitOptions
  extends SelectQuireViewPointerHitOptions {
  /** Optional plugin hook used to create the PM selection between anchor and head. */
  readonly createSelectionBetween?: CreatePointerSelectionBetween | undefined;
}

/** Inputs used to apply already-resolved drag endpoints to selection. */
export interface SelectQuireViewPointerRangeHitsOptions
  extends SelectQuireViewPointerHitBaseOptions {
  /** Hit-test result produced for the pointer drag anchor. */
  readonly anchorHitTestResult: QuireHitTestResult;
  /** Hit-test result produced for the pointer drag head. */
  readonly headHitTestResult: QuireHitTestResult;
  /** Optional plugin hook used to create the PM selection between anchor and head. */
  readonly createSelectionBetween?: CreatePointerSelectionBetween | undefined;
}

/** Inputs used to expand one resolved pointer hit into a text range. */
export interface SelectQuireViewPointerExpandedHitOptions
  extends SelectQuireViewPointerHitOptions {
  /** Expanded text selection kind to resolve. */
  readonly kind: "word" | "textblock";
}
