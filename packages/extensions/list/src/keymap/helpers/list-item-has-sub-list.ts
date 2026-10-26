import { getNodeType } from "@quirekit/core";
import type { EditorState, Node as PMNode } from "@quirekit/pm";

/**
 * Reports whether a list item contains another list item of the same type.
 *
 * @param typeOrName - List item node type name.
 * @param state - ProseMirror state to inspect.
 * @param node - Candidate list item node.
 * @returns Whether the list item owns a nested list item.
 */
export function listItemHasSubList(
  typeOrName: string,
  state: EditorState,
  node?: PMNode | undefined
): boolean {
  if (!node) {
    return false;
  }

  const nodeType = getNodeType(typeOrName, state.schema);
  let hasSubList = false;

  node.descendants((child) => {
    if (child.type === nodeType) {
      hasSubList = true;
    }
  });

  return hasSubList;
}
