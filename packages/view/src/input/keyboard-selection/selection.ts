import { AllSelection, TextSelection, type Transaction } from "@quirekit/pm";
import { setQuireSelectionNavigation } from "@quirekit/core";
import { isQuireOwnedNavigationKey, isDocumentNavigationShortcut } from "../keyboard-navigation";
import { navigateDocumentBoundary, navigateLineBoundary } from "./boundary";
import { dispatchHorizontalArrowKey } from "./horizontal";
import { isSelectAllShortcut } from "./shortcuts";
import type { QuireKeyboardSelectionTransactionOptions } from "./types";
import { extendSelectionVertically, moveSelectionVertically } from "./vertical";

/**
 * Creates a keyboard selection transaction, revealing navigation targets only.
 *
 * @param options - State, keyboard event, and optional layout-aware resolvers.
 * @returns Selection transaction for handled keyboard input, or null when unhandled.
 */
export function createQuireKeyboardSelectionTransaction(
  options: QuireKeyboardSelectionTransactionOptions
): Transaction | null {
  const transaction = resolveQuireKeyboardSelectionTransaction(options);
  if (!transaction || isSelectAllShortcut(options.event)) return transaction;
  const previous = options.state.selection, next = transaction.selection;
  // Report input intent in document coordinates. Document extensions own any
  // semantic boundary adjustment; neither the key name nor scrolling proves it.
  if (options.event.shiftKey && previous instanceof TextSelection && next instanceof TextSelection
    && next.anchor === previous.anchor && next.head !== previous.head) {
    setQuireSelectionNavigation(transaction, { direction: next.head < previous.head ? -1 : 1 });
  }
  // Select All preserves the viewport; navigation still reveals the moving head.
  return transaction.scrollIntoView();
}

/**
 * Resolves keyboard selection semantics before attaching mounted-view effects.
 *
 * @param options - State, keyboard event, and optional layout-aware resolvers.
 * @returns Selection transaction for handled keyboard input, or null when unhandled.
 */
function resolveQuireKeyboardSelectionTransaction(
  options: QuireKeyboardSelectionTransactionOptions
): Transaction | null {
  if (isSelectAllShortcut(options.event)) {
    const boundary = options.selectionScopeBoundary
      ?? options.storyCommandBoundary;

    return options.state.tr.setSelection(boundary === undefined
      ? new AllSelection(options.state.doc)
      : TextSelection.between(
          options.state.doc.resolve(boundary.selectionFrom),
          options.state.doc.resolve(boundary.selectionTo),
          1
        ));
  }

  if (!isQuireOwnedNavigationKey(options.event)) {
    return null;
  }

  const { key, shiftKey } = options.event;
  const extend = shiftKey === true;
  const towardStart = key === "ArrowUp" || key === "Home" || key === "PageUp";
  const boundary = towardStart ? "start" : "end";
  switch (key) {
    case "ArrowLeft":
      return dispatchHorizontalArrowKey(options, -1);
    case "ArrowRight":
      return dispatchHorizontalArrowKey(options, 1);
    case "ArrowUp":
    case "ArrowDown":
      if (isDocumentNavigationShortcut(options.event)) {
        return navigateDocumentBoundary(options, boundary, extend);
      }
      return extend
        ? extendSelectionVertically(options, towardStart ? "up" : "down")
        : moveSelectionVertically(options, towardStart ? "up" : "down");
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return key === "PageUp" || key === "PageDown" || isDocumentNavigationShortcut(options.event)
        ? navigateDocumentBoundary(options, boundary, extend)
        : navigateLineBoundary(options, boundary, extend);
    default:
      return null;
  }
}
