import type { EditorState } from "@quirekit/pm";
import { findListItemPos } from "./find-list-item-pos";
import { getNextListDepth } from "./get-next-list-depth";

/**
 * Reports whether the next list item is higher than the active one.
 *
 * @param typeOrName - List item node type name.
 * @param state - ProseMirror state to inspect.
 * @returns Whether the next list item is shallower.
 */
export function nextListIsHigher(typeOrName: string, state: EditorState): boolean {
  const listDepth = getNextListDepth(typeOrName, state);
  const listItemPos = findListItemPos(typeOrName, state);

  return Boolean(listItemPos && listDepth && listDepth < listItemPos.depth);
}
