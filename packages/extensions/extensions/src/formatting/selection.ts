import type { Selection } from "@quirekit/pm";
import type { QuireFormattingSelectionScope } from "./types";

/**
 * Resolves whether a selection owns character-only or paragraph formatting.
 *
 * @param selection - Current canonical selection.
 * @returns Stable selection bounds and formatting level.
 */
export function resolveFormattingSelectionScope(
  selection: Selection
): QuireFormattingSelectionScope {
  if (selection.empty) {
    return {
      level: "paragraph",
      from: selection.from,
      to: selection.to,
      empty: true
    };
  }

  const fromDepth = findTextblockDepth(selection.$from);
  const toDepth = findTextblockDepth(selection.$to);
  const sameTextblock = fromDepth !== null
    && toDepth !== null
    && selection.$from.node(fromDepth) === selection.$to.node(toDepth);
  const coversCompleteTextblock = sameTextblock
    && selection.from <= selection.$from.start(fromDepth!)
    && selection.to >= selection.$to.end(toDepth!);

  return {
    level: sameTextblock && !coversCompleteTextblock ? "character" : "paragraph",
    from: selection.from,
    to: selection.to,
    empty: false
  };
}

/**
 * Finds the nearest textblock ancestor for one resolved position.
 *
 * @param position - Resolved selection endpoint.
 * @returns Textblock depth, or null outside text content.
 */
function findTextblockDepth(
  position: Selection["$from"]
): number | null {
  for (let depth = position.depth; depth > 0; depth -= 1) {
    if (position.node(depth).isTextblock) return depth;
  }
  return null;
}
