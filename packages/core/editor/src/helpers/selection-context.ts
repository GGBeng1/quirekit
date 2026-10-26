import type { Node as PMNode, ResolvedPos, Selection } from "@quirekit/pm";
import { isTextSelection } from "./isTextSelection";

/**
 * Resolves the block sibling immediately before the position's parent block.
 *
 * @param position - Resolved document position.
 * @returns Previous sibling, or null at the first child or document root.
 */
export function getPreviousBlockSibling(position: ResolvedPos): PMNode | null {
  const parentDepth = position.depth - 1;
  if (parentDepth < 0) return null;
  const index = position.index(parentDepth);
  return index === 0 ? null : position.node(parentDepth).child(index - 1);
}

/** Inputs used to resolve whether a node view should render selected state. */
export interface IsNodeViewSelectedOptions {
  /** Current editor selection. */
  readonly selection: Selection;
  /** Document position immediately before the node. */
  readonly pos: number;
  /** ProseMirror node size. */
  readonly nodeSize: number;
  /** Whether a text selection fully inside the node also selects the view. */
  readonly selectedOnTextSelection?: boolean | undefined;
}

/**
 * Reports whether a selection covers a node view or is admitted inside it.
 *
 * @param options - Selection, node range, and text-selection policy.
 * @returns Whether the node view should render selected state.
 */
export function isNodeViewSelected(options: IsNodeViewSelectedOptions): boolean {
  const { selection, pos, nodeSize, selectedOnTextSelection = false } = options;
  if (selection.from <= pos && selection.to >= pos + nodeSize) return true;
  return selectedOnTextSelection
    && isTextSelection(selection)
    && selection.from > pos
    && selection.to < pos + nodeSize;
}
