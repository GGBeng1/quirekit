import { NodeSelection, type EditorState as PMEditorState, type NodeType } from "@quirekit/pm";

/**
 * Reports whether a node type can be inserted at the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param nodeType - Node type to test.
 * @returns Whether the node can be inserted.
 */
export function canInsertNode(state: PMEditorState, nodeType: NodeType): boolean {
  const { selection } = state;
  const { $from } = selection;

  if (selection instanceof NodeSelection) {
    return $from.parent.canReplaceWith($from.index(), $from.index() + 1, nodeType);
  }

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).contentMatchAt($from.index(depth)).matchType(nodeType)) {
      return true;
    }
  }

  return false;
}
