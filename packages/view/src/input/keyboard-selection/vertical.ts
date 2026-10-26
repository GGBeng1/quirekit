import { TextSelection, type Transaction } from "@quirekit/pm";
import { setCollapsedSelection, setExtendedSelection } from "./shared";
import type { QuireKeyboardSelectionTransactionOptions } from "./types";

/**
 * Moves a collapsed text selection using layout-aware vertical navigation.
 *
 * @param options - State and resolver options.
 * @param direction - Requested vertical movement direction.
 * @returns Selection transaction, or null when movement is unavailable.
 */
export function moveSelectionVertically(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "up" | "down"
): Transaction | null {
  const { selection } = options.state;
  const position = selection.empty
    ? selection.head
    : direction === "up"
      ? selection.from
      : selection.to;
  const nextPosition = options.resolveVerticalCaretPosition?.(direction, {
    position: { pos: position, bias: 0 },
    intent: "move"
  });

  if (!nextPosition) {
    return selection.empty
      ? null
      : collapseSelectionToVerticalEdge(options, direction);
  }

  if (
    nextPosition.pos === selection.from &&
    nextPosition.pos === selection.to &&
    (nextPosition.bias ?? 0) === 0
  ) {
    return null;
  }

  return setCollapsedSelection(
    options,
    nextPosition.pos,
    nextPosition.bias ?? 1
  );
}

/**
 * Extends a text selection using layout-aware vertical navigation.
 *
 * @param options - State and resolver options.
 * @param direction - Requested vertical movement direction.
 * @returns Selection transaction, or null when no target is available.
 */
export function extendSelectionVertically(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "up" | "down"
): Transaction | null {
  const { selection } = options.state;
  const nextPosition = options.resolveVerticalCaretPosition?.(direction, {
    position: { pos: selection.head, bias: 0 },
    intent: "extend"
  }) ?? resolveTextblockBoundaryForVerticalExtension(options, direction);

  if (!nextPosition) {
    return null;
  }

  const bias = nextPosition.bias ?? (direction === "up" ? -1 : 1);

  return setExtendedSelection(options, nextPosition.pos, bias);
}

/**
 * Collapses a non-empty selection when vertical movement cannot leave its edge.
 *
 * @param options - State and resolver options.
 * @param direction - Requested vertical movement direction.
 * @returns Selection transaction, or null when the selection is already collapsed.
 */
function collapseSelectionToVerticalEdge(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "up" | "down"
): Transaction | null {
  const { selection } = options.state;
  const position = direction === "up" ? selection.from : selection.to;
  const bias = direction === "up" ? -1 : 1;

  if (selection.empty) {
    return null;
  }

  return setCollapsedSelection(options, position, bias);
}

/**
 * Resolves Shift+Up/Down behavior when there is no adjacent visual line.
 *
 * @param options - State and resolver options.
 * @param direction - Requested vertical movement direction.
 * @returns Current textblock boundary, or null when no textblock owns the head.
 */
function resolveTextblockBoundaryForVerticalExtension(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: "up" | "down"
): { readonly pos: number; readonly bias: number } | null {
  const { selection } = options.state;

  if (!(selection instanceof TextSelection) || !selection.$head.parent.isTextblock) {
    return null;
  }

  return direction === "up"
    ? { pos: selection.$head.start(), bias: -1 }
    : { pos: selection.$head.end(), bias: 1 };
}
