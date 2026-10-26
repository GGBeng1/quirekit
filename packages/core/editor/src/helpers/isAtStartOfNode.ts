import type { EditorState as PMEditorState } from "@quirekit/pm";

/**
 * Reports whether the current collapsed selection is at the start of its node.
 *
 * @param state - Current ProseMirror state.
 * @returns Whether the selection is collapsed at the start of the parent node.
 */
export function isAtStartOfNode(state: PMEditorState): boolean {
  const { $from, $to } = state.selection;

  if ($from.parentOffset > 0 || $from.pos !== $to.pos) {
    return false;
  }

  return true;
}
