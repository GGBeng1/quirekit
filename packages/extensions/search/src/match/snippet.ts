import type { Node as PMNode } from "@quirekit/pm";
import type { SearchMatch, SearchMatchSnippet } from "../types";

/**
 * Reads a match with nearby text from its own textblock.
 *
 * Context never crosses the textblock, so a snippet reads like the paragraph
 * or cell that contains the match.
 *
 * @param doc - Document containing the match.
 * @param match - Match range.
 * @param radius - Maximum number of characters on each side.
 * @returns Text before, inside, and after the match.
 */
export function readSearchMatchSnippet(
  doc: PMNode,
  match: SearchMatch,
  radius = 24
): SearchMatchSnippet {
  const $from = doc.resolve(match.from);
  let depth = $from.depth;
  while (depth > 0 && !$from.node(depth).isTextblock) depth -= 1;
  const start = $from.start(depth);
  const end = $from.end(depth);
  const read = (from: number, to: number): string => doc.textBetween(from, to, " ", " ");
  return {
    before: read(Math.max(start, match.from - radius), match.from),
    text: read(match.from, match.to),
    after: read(match.to, Math.min(end, match.to + radius)),
    truncatedBefore: match.from - radius > start,
    truncatedAfter: match.to + radius < end
  };
}
