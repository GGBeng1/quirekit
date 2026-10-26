import { Selection, TextSelection, type Transaction } from "@quirekit/pm";
import { setCollapsedSelection, setExtendedSelection } from "./shared";
import type { QuireKeyboardSelectionTransactionOptions } from "./types";

/**
 * Moves or extends the current selection to a visual-line boundary.
 *
 * @param options - State and resolver options.
 * @param direction - Requested line boundary.
 * @param extend - Whether to preserve anchor and extend to the boundary.
 * @returns Selection transaction, or null when no boundary is available.
 */
export function navigateLineBoundary(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "start" | "end",
  extend: boolean
): Transaction | null {
  const { selection } = options.state;
  const nextPosition = options.resolveLineBoundaryPosition?.(direction, {
    position: { pos: selection.head, bias: 0 },
    intent: extend ? "extend" : "move"
  }) ?? resolveTextblockBoundaryForLineNavigation(options, direction);

  if (!nextPosition) {
    return null;
  }

  const bias = nextPosition.bias ?? (direction === "start" ? -1 : 1);

  return extend
    ? setExtendedSelection(options, nextPosition.pos, bias)
    : setCollapsedSelection(options, nextPosition.pos, bias);
}

/**
 * Moves or extends the current selection to the document boundary.
 *
 * @param options - State and resolver options.
 * @param direction - Requested document boundary.
 * @param extend - Whether to preserve anchor and extend to the boundary.
 * @returns Selection transaction, or null when the selection is already there.
 */
export function navigateDocumentBoundary(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "start" | "end",
  extend: boolean
): Transaction | null {
  const position = resolveDocumentBoundaryPosition(options, direction);
  const bias = direction === "start" ? 1 : -1;

  return extend
    ? setExtendedSelection(options, position, bias)
    : setCollapsedSelection(options, position, bias);
}

/**
 * Resolves the closest selectable document boundary.
 *
 * @param options - State and resolver options.
 * @param direction - Requested document boundary.
 * @returns Document position for the nearest valid selection.
 */
function resolveDocumentBoundaryPosition(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "start" | "end"
): number {
  const scopeBoundary = options.selectionScopeBoundary
    ?? options.storyCommandBoundary;

  if (scopeBoundary !== undefined) {
    return direction === "start"
      ? scopeBoundary.selectionFrom
      : scopeBoundary.selectionTo;
  }

  const { doc } = options.state;
  const selection = direction === "start" ? Selection.atStart(doc) : Selection.atEnd(doc);

  return direction === "start" ? selection.from : selection.to;
}

/**
 * Resolves textblock boundaries when layout cannot answer line Home/End.
 *
 * @param options - State and resolver options.
 * @param direction - Requested visual-line boundary.
 * @returns Textblock boundary position, or null outside a textblock.
 */
function resolveTextblockBoundaryForLineNavigation(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "start" | "end"
): { readonly pos: number; readonly bias: number } | null {
  const { selection } = options.state;

  if (!(selection instanceof TextSelection) || !selection.$head.parent.isTextblock) {
    return null;
  }

  return direction === "start"
    ? { pos: selection.$head.start(), bias: -1 }
    : { pos: selection.$head.end(), bias: 1 };
}
