import type { Node as PMNode } from "@quirekit/pm";
import type { QuireMarkRange } from "../types";
import { getMarkRange } from "./getMarkRange";

/**
 * Gets marks that overlap a document range.
 *
 * @param from - Range start.
 * @param to - Range end.
 * @param doc - Document node to inspect.
 * @returns Marks with their ranges.
 */
export function getMarksBetween(
  from: number,
  to: number,
  doc: PMNode
): QuireMarkRange[] {
  const marks: QuireMarkRange[] = [];

  if (from === to) {
    const $pos = doc.resolve(from);

    for (const mark of $pos.marks()) {
      const range = getMarkRange($pos, mark.type);

      if (range) {
        marks.push({ mark, ...range });
      }
    }

    return marks;
  }

  doc.nodesBetween(from, to, (node, pos) => {
    for (const mark of node.marks) {
      marks.push({
        mark,
        from: pos,
        to: pos + node.nodeSize
      });
    }
  });

  return marks;
}
