import { history, historyKeymap, redo, redoDepth, redoSelection, undo, undoDepth, undoSelection } from "@quirekit/cm-commands";
import { keymap } from "@quirekit/cm-view";
import type { MsfeHistoryDriver } from "./types";

/** @returns The existing CM content and selection history for a standalone editor. */
export function localHistory(): MsfeHistoryDriver {
  return { extensions: [history(), keymap.of(historyKeymap.filter(binding => binding.run === undoSelection || binding.run === redoSelection))],
    canUndo: state => undoDepth(state) > 0, canRedo: state => redoDepth(state) > 0, undo, redo };
}
