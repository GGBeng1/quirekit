import type { ResolvedPos } from "@quirekit/pm";
import type { DeleteDirection, GraphemeDeleteRange } from "./types";

let segmenter: Intl.Segmenter | undefined;

/**
 * Resolves one complete grapheme without crossing an inline atom or textblock.
 * @param cursor - Collapsed PM text cursor, measured in UTF-16 document units.
 * @param direction - Logical deletion direction.
 * @returns Complete text range, or null when adjacent content is not text.
 */
export function resolveGraphemeDeleteRange(
  cursor: ResolvedPos,
  direction: DeleteDirection
): GraphemeDeleteRange | null {
  const parent = cursor.parent;
  const probe = cursor.parentOffset - (direction === "backward" ? 1 : 0);
  if (!parent.isTextblock || probe < 0 || probe >= parent.content.size) return null;
  const adjacent = parent.childAfter(probe);
  if (!adjacent.node?.isText) return null;

  // Mark runs are one logical text sequence. Gather only contiguous text
  // siblings so Segmenter has full RI/ZWJ context without scanning the document.
  let startIndex = adjacent.index;
  let runStart = adjacent.offset;
  while (startIndex > 0 && parent.child(startIndex - 1).isText) {
    startIndex -= 1;
    runStart -= parent.child(startIndex).nodeSize;
  }
  const parts: string[] = [];
  for (let index = startIndex; index < parent.childCount; index += 1) {
    const child = parent.child(index);
    if (!child.isText) break;
    parts.push(child.text!);
  }
  const text = parts.join("");
  const localRange = containingRange(text, probe - runStart);
  const documentStart = cursor.pos - cursor.parentOffset + runStart;
  return { from: documentStart + localRange.from, to: documentStart + localRange.to };
}

/**
 * Queries one cluster; old hosts without Segmenter retain at least code points.
 * @param text - Continuous text run, including context across marks.
 * @param index - UTF-16 code unit inside the target segment.
 * @returns Complete local segment range.
 */
function containingRange(text: string, index: number): GraphemeDeleteRange {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const cluster = segmenter.segment(text).containing(index)!;
    return { from: cluster.index, to: cluster.index + cluster.segment.length };
  }

  // A legacy code-point floor must never introduce half a surrogate pair.
  const code = text.charCodeAt(index);
  const previous = text.charCodeAt(index - 1);
  const from = code >= 0xdc00 && code <= 0xdfff && previous >= 0xd800 && previous <= 0xdbff
    ? index - 1 : index;
  return { from, to: from + (text.codePointAt(from)! > 0xffff ? 2 : 1) };
}
