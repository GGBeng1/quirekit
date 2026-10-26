import type { EditorState } from "@quirekit/pm";

/**
 * Reports whether another list item appears before the active list item.
 *
 * @param typeOrName - List item node type name.
 * @param state - ProseMirror state to inspect.
 * @returns Whether a previous sibling list item exists.
 */
export function hasListItemBefore(typeOrName: string, state: EditorState): boolean {
  const { $anchor } = state.selection;
  const $targetPos = state.doc.resolve($anchor.pos - 2);

  if ($targetPos.index() === 0) {
    return false;
  }

  return $targetPos.nodeBefore?.type.name === typeOrName;
}
