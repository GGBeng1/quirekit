import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireInlineSourceAnchor } from "./types";

/**
 * Shifts logical inline source positions after a document-range remap.
 *
 * @param anchors - Logical source anchors to shift.
 * @param delta - Document offset added to every source position.
 * @returns Original anchors for zero delta, otherwise shifted immutable anchors.
 */
export function shiftQuireInlineSourceAnchors(
  anchors: readonly QuireInlineSourceAnchor[],
  delta: number
): readonly QuireInlineSourceAnchor[] {
  if (delta === 0) {
    return anchors;
  }

  return anchors.map((anchor) => ({
    ...anchor,
    range: {
      from: anchor.range.from + delta,
      to: anchor.range.to + delta
    },
    position: {
      ...anchor.position,
      pos: anchor.position.pos + delta
    }
  }));
}

/**
 * Keeps logical inline sources owned by one projected document range.
 *
 * @param anchors - Logical source anchors in document order.
 * @param range - Projected range that owns the returned anchors.
 * @returns Anchors whose exact source ranges intersect the projection.
 */
export function sliceQuireInlineSourceAnchorsToRange(
  anchors: readonly QuireInlineSourceAnchor[],
  range: QuireDocumentRange
): readonly QuireInlineSourceAnchor[] {
  return anchors.filter((anchor) =>
    anchor.range.from < range.to && anchor.range.to > range.from
  );
}
