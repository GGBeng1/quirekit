import type { ResolvedPos } from "@quirekit/pm";

/**
 * Reads text immediately before a resolved position.
 *
 * @param $from - Resolved document position.
 * @param maxMatch - Maximum number of characters to read.
 * @returns Text content before the position.
 */
export function getTextContentFromNodes($from: ResolvedPos, maxMatch = 500): string {
  let textBefore = "";
  const sliceEndPos = $from.parentOffset;

  $from.parent.nodesBetween(Math.max(0, sliceEndPos - maxMatch), sliceEndPos, (node, pos) => {
    const chunk = node.textContent || "%leaf%";
    textBefore += node.isAtom && !node.isText
      ? chunk
      : chunk.slice(0, Math.max(0, sliceEndPos - pos));
  });

  return textBefore;
}
