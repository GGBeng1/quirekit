import type { QuireDocumentPosition } from "@quirekit/renderer";
import type { QuireVerticalCaretNavigationOptions } from "./types";
import { resolveQuireVerticalCaretPositionFromCandidates } from "./vertical-caret-navigation";

/**
 * Resolves visual-line caret movement from the current layout snapshot.
 *
 * @param options - Snapshot, current document position, and movement direction.
 * @returns Nearest document position on the adjacent visual line, or null.
 */
export function resolveQuireVerticalCaretPosition(
  options: QuireVerticalCaretNavigationOptions
): QuireDocumentPosition | null {
  return resolveQuireVerticalCaretPositionFromCandidates(options);
}
