import type { EditorState, Extension } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";

/** Public history availability, independent of the storage implementation. */
export interface MsfeHistoryState {
  /** Whether a local undo is currently permitted. */
  readonly canUndo: boolean;
  /** Whether a local redo is currently permitted. */
  readonly canRedo: boolean;
}

/** Reactive history state shared by UI and all command entry points. */
export interface MsfeHistory extends MsfeHistoryState {
  /** @param listener - Availability observer, called only when values change. @returns Unsubscribe function. */
  subscribe(listener: (state: MsfeHistoryState) => void): () => void;
}

/** One content history implementation, selected together with the source owner. */
export interface MsfeHistoryDriver {
  /** State fields and selection history belonging to this implementation. */
  readonly extensions: Extension;
  /** @param state - Accepted state. @returns Whether a local undo item exists. */
  canUndo(state: EditorState): boolean;
  /** @param state - Accepted state. @returns Whether a local redo item exists. */
  canRedo(state: EditorState): boolean;
  /** @param view - Mounted transaction owner. @returns Whether an item was undone. */
  undo(view: EditorView): boolean;
  /** @param view - Mounted transaction owner. @returns Whether an item was redone. */
  redo(view: EditorView): boolean;
  /** @param listener - Stack-change notification, including changes without a document transaction. @returns Unsubscribe function. */
  subscribe?(listener: () => void): () => void;
}
