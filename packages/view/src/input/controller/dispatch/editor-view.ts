import type { EditorView } from "@quirekit/pm";
import { createQuireInputEditorViewBridge } from "../../view-bridge";
import type { QuireEditorInputControllerRuntime } from "../runtime";
import { isQuireTextblockBoundary } from "../textblock-boundary";

/**
 * Creates the PM-like editor view consumed by plugin props.
 *
 * @param runtime - Shared input-controller runtime.
 * @returns Minimal editor view for vendored ProseMirror plugins.
 */
export function createQuireControllerEditorViewBridge(
  runtime: QuireEditorInputControllerRuntime
): EditorView {
  return createQuireInputEditorViewBridge({
    editor: runtime.editor,
    dispatchTransaction: (transaction) => {
      runtime.dispatchTransaction(transaction);
    },
    composing: () => runtime.composition.composing,
    endOfTextblock: (direction) => {
      return (
        runtime.editor.view.endOfTextblock(direction) ||
        isQuireTextblockBoundary(runtime.editor.state.pm, direction)
      );
    }
  });
}
