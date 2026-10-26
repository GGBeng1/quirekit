/** Semantic controller response to one suggestion keyboard key, independent of DOM events. */
export type SuggestionKeyboardCommand =
  | { readonly kind: "accept" }
  | { readonly kind: "highlight"; readonly index: number }
  | { readonly kind: "ignore" }
  | { readonly kind: "overlay-escape" };

/**
 * Resolves keyboard navigation without editor, DOM, or overlay mutation.
 *
 * @param key - Browser keyboard key.
 * @param highlightedIndex - Current highlighted result.
 * @param resultCount - Current result count.
 * @returns Typed controller command; Escape remains canonical-overlay owned.
 */
export function resolveSuggestionKeyboardCommand(
  key: string,
  highlightedIndex: number | null,
  resultCount: number
): SuggestionKeyboardCommand {
  if (key === "Escape") return { kind: "overlay-escape" };
  if (key === "Enter" || key === "Tab") return { kind: "accept" };
  if (key === "Home" || key === "End") {
    return {
      kind: "highlight",
      index: key === "Home" ? 0 : resultCount - 1
    };
  }
  if (key === "ArrowDown" || key === "ArrowUp") {
    const current = highlightedIndex ?? 0;
    const delta = key === "ArrowDown" ? 1 : -1;
    return {
      kind: "highlight",
      index: resultCount === 0 ? -1 : (current + delta + resultCount) % resultCount
    };
  }
  return { kind: "ignore" };
}
