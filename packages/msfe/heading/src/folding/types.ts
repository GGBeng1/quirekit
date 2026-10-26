import type { EditorState } from "@quirekit/cm-state";
import type { DecorationSet } from "@quirekit/cm-view";

/** Immutable dependencies needed by visible controls, independent of caret motion. */
export interface HeadingFoldSnapshot {
  /** State containing the accepted text and syntax; selection must be read from the current editor instead. */
  readonly state: EditorState;
  /** Native fold ranges shared with source mode and fold shortcuts. */
  readonly folds: DecorationSet;
}
