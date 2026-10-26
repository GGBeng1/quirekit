import { getNodeType } from "@quirekit/core";
import type { EditorState, NodeType, ResolvedPos } from "@quirekit/pm";

/** Position and depth of the active list item. */
export interface ListItemPosition {
  /** Resolved position before the list item content. */
  readonly $pos: ResolvedPos;
  /** Depth where the list item was found. */
  readonly depth: number;
}

/**
 * Finds the nearest ancestor list item at the current selection.
 *
 * @param typeOrName - List item node type or node type name.
 * @param state - ProseMirror state to inspect.
 * @returns List item position metadata, or null when outside the item type.
 */
export function findListItemPos(
  typeOrName: string | NodeType,
  state: EditorState
): ListItemPosition | null {
  const { $from } = state.selection;
  const nodeType = getNodeType(typeOrName, state.schema);
  let currentDepth = $from.depth;
  let currentPos = $from.pos;

  while (currentDepth > 0) {
    const currentNode = $from.node(currentDepth);

    if (currentNode.type === nodeType) {
      return { $pos: state.doc.resolve(currentPos), depth: currentDepth };
    }

    currentDepth -= 1;
    currentPos -= 1;
  }

  return null;
}
