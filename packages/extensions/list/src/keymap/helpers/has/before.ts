import type { EditorState } from "@quirekit/pm";

/**
 * Reports whether a configured list wrapper appears before the current block.
 *
 * @param state - ProseMirror state to inspect.
 * @param _name - List item name kept for Tiptap helper signature parity.
 * @param parentListTypes - List wrapper node names.
 * @returns Whether a previous sibling is one of the wrapper list types.
 */
export function hasListBefore(
  state: EditorState,
  _name: string,
  parentListTypes: readonly string[]
): boolean {
  const { $anchor } = state.selection;
  const previousNodePos = Math.max(0, $anchor.pos - 2);
  const previousNode = state.doc.resolve(previousNodePos).node();

  return Boolean(previousNode && parentListTypes.includes(previousNode.type.name));
}
