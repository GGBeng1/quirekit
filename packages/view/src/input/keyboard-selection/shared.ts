import { Selection, TextSelection, type Transaction } from "@quirekit/pm";
import type { QuireKeyboardSelectionTransactionOptions } from "./types";

/**
 * Collapses a non-empty selection for plain horizontal arrow movement.
 *
 * @param options - State and resolver options.
 * @param direction - Negative collapses to selection start, positive to selection end.
 * @returns Selection transaction, or null when the selection is already collapsed.
 */
export function collapseSelectionToHorizontalEdge(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: -1 | 1
): Transaction | null {
  const { selection, doc } = options.state;
  const requestedPosition = direction < 0 ? selection.from : selection.to;
  const position = clampKeyboardSelectionPosition(options, requestedPosition);

  if (selection.empty) {
    return null;
  }

  return options.state.tr.setSelection(Selection.near(doc.resolve(position), direction));
}

/**
 * Applies a collapsed selection near a document position.
 *
 * @param options - State and resolver options.
 * @param position - Requested document position.
 * @param bias - Bias used when resolving non-textblock boundaries.
 * @returns Selection transaction, or null when the selection is unchanged.
 */
export function setCollapsedSelection(
  options: QuireKeyboardSelectionTransactionOptions,
  position: number,
  bias: number
): Transaction | null {
  const { selection, doc } = options.state;
  const constrainedPosition = clampKeyboardSelectionPosition(options, position);
  const nextSelection = Selection.near(
    doc.resolve(Math.min(Math.max(constrainedPosition, 0), doc.content.size)),
    bias
  );

  if (nextSelection.eq(selection)) {
    return null;
  }

  return options.state.tr.setSelection(nextSelection);
}

/**
 * Applies a text selection with the current anchor and a new head position.
 *
 * @param options - State and resolver options.
 * @param head - New moving side of the selection.
 * @param bias - Bias used when resolving non-textblock boundaries.
 * @returns Selection transaction, or null when the selection is unchanged.
 */
export function setExtendedSelection(
  options: QuireKeyboardSelectionTransactionOptions,
  head: number,
  bias: number
): Transaction | null {
  const { selection, doc } = options.state;
  const constrainedHead = clampKeyboardSelectionPosition(options, head);
  const nextSelection = TextSelection.between(
    doc.resolve(selection.anchor),
    doc.resolve(Math.min(Math.max(constrainedHead, 0), doc.content.size)),
    bias
  );

  if (nextSelection.eq(selection)) {
    return null;
  }

  return options.state.tr.setSelection(nextSelection);
}

/**
 * Constrains a keyboard target to the active body or story selection scope.
 *
 * @param options - Keyboard selection options carrying optional source boundaries.
 * @param position - Requested document position.
 * @returns Source-scoped or unchanged document position.
 */
export function clampKeyboardSelectionPosition(
  options: QuireKeyboardSelectionTransactionOptions,
  position: number
): number {
  const boundary = options.selectionScopeBoundary
    ?? options.storyCommandBoundary;

  if (boundary === undefined) {
    return position;
  }

  return Math.min(boundary.selectionTo, Math.max(boundary.selectionFrom, position));
}
