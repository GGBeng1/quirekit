import type { EditorState, EditorView } from "@quirekit/pm";

/** Direction argument accepted by PM `EditorView.endOfTextblock`. */
export type QuireControllerTextblockDirection =
  Parameters<EditorView["endOfTextblock"]>[0];

/**
 * Resolves textblock edges when mounted layout cannot answer yet.
 *
 * @param state - Editor state whose selection should be inspected.
 * @param direction - Direction requested by PM keymap helpers.
 * @returns Whether movement would leave the current textblock.
 */
export function isQuireTextblockBoundary(
  state: EditorState,
  direction: QuireControllerTextblockDirection
): boolean {
  const selection = state.selection;
  const head = selection.$head;

  if (!head.parent.isTextblock) {
    return false;
  }

  if (direction === "backward" || direction === "left" || direction === "up") {
    return head.parentOffset === 0;
  }

  return head.parentOffset === head.parent.content.size;
}
