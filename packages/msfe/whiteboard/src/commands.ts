import { insertSourceBlock, type Command } from "@quirekit/msfe-core";
import { isolateHistory } from "@quirekit/cm-commands";
import type { WhiteboardDocument } from "@quirekit/whiteboard";
import { whiteboardMarkdown } from "./source";
import { whiteboardInsertionTarget } from "./insertion";

declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** Atomic whiteboard source commits. */
    whiteboard: {
      /** @param board - Proposed scene revision. @param insert - Whether to separate a new fence with blank lines. @returns Acceptance. */
      commitWhiteboard: (board: WhiteboardDocument, insert: boolean) => ReturnType;
    };
  }
}
/** @param board - Validated source. @param insert - Insertion or exact fence replacement.
 * @returns One isolated history event through the canonical source transaction. */
export function commitWhiteboard(board: WhiteboardDocument, insert: boolean): Command {
  return ({ tr, state }) => {
    let fence: string; try { fence = whiteboardMarkdown(board); } catch { return false; }
    if (insert) {
      // The enclosing document-level block owns its syntax. Insert beside it,
      // never split a code fence, list or nested container at the text caret.
      const target = whiteboardInsertionTarget(state, state.selection.main.from);
      if (!target) return false;
      const { block } = target;
      if (block) {
        const spec = insertSourceBlock(block, "after", fence)(state);
        if (!spec) return false;
        tr.apply({ annotations: isolateHistory.of("full") });
        return tr.apply(spec);
      }
    }
    tr.apply({ annotations: isolateHistory.of("full") });
    return tr.insertText(insert ? `\n\n${fence}\n\n` : fence);
  };
}
