import { getNodeAtPosition } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import { findListItemPos } from "./find-list-item-pos";

/**
 * Finds the depth of the next list item after the active item.
 *
 * @param typeOrName - List item node type name.
 * @param state - ProseMirror state to inspect.
 * @returns Next list item depth, or false when no next item was found.
 */
export function getNextListDepth(
  typeOrName: string,
  state: EditorState
): number | false {
  const listItemPos = findListItemPos(typeOrName, state);

  if (!listItemPos) {
    return false;
  }

  const [, depth] = getNodeAtPosition(state, typeOrName, listItemPos.$pos.pos + 4);

  return depth;
}
