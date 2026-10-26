import type { Mapping } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { HtmlMappedRange } from "./types";

/**
 * Maps a non-document node's outer token boundaries.
 *
 * @param range - Previous outer node range.
 * @param mapping - Mapping to the next document.
 * @returns Mapped range and opening/closing deletion validity.
 */
export function mapHtmlOuterRange(
  range: QuireDocumentRange,
  mapping: Mapping
): HtmlMappedRange {
  const from = mapping.mapResult(range.from, -1);
  const to = mapping.mapResult(range.to, 1);

  return {
    range: { from: from.pos, to: to.pos },
    invalid: deletedAtBoundary(mapping, range.from, "after") ||
      deletedAtBoundary(mapping, range.to, "before")
  };
}

/**
 * Maps a text or mark span with inward-facing associations.
 *
 * @param range - Previous inline span.
 * @param mapping - Mapping to the next document.
 * @returns Mapped span and complete-deletion validity.
 */
export function mapHtmlInlineRange(
  range: QuireDocumentRange,
  mapping: Mapping
): HtmlMappedRange {
  const from = mapping.mapResult(range.from, 1);
  const to = mapping.mapResult(range.to, -1);

  return {
    range: { from: from.pos, to: to.pos },
    invalid: (from.deleted && to.deleted) || from.pos >= to.pos
  };
}

/**
 * Maps one collapsed widget position using its declared association side.
 *
 * @param range - Previous collapsed widget range.
 * @param mapping - Mapping to the next document.
 * @param side - Widget association used at insert/delete boundaries.
 * @returns Mapped collapsed position and deletion validity.
 */
export function mapHtmlWidgetRange(
  range: QuireDocumentRange,
  mapping: Mapping,
  side: number
): HtmlMappedRange {
  const mapped = mapping.mapResult(range.from, side < 0 ? -1 : 1);

  return {
    range: { from: mapped.pos, to: mapped.pos },
    invalid: mapped.deleted
  };
}

/**
 * Distinguishes token deletion from zero-width insertion boundary metadata.
 *
 * @param mapping - Mapping whose step maps are inspected in order.
 * @param position - Previous-document boundary position.
 * @param side - Owned token side whose deletion invalidates the descriptor.
 * @returns Whether an actual non-empty deletion removed the owned side.
 */
function deletedAtBoundary(
  mapping: Mapping,
  position: number,
  side: "before" | "after"
): boolean {
  let mappedPosition = position;

  for (let index = mapping.from; index < mapping.to; index += 1) {
    const stepMap = mapping.maps[index];

    if (!stepMap) {
      continue;
    }
    for (let rangeIndex = 0; rangeIndex < stepMap.ranges.length; rangeIndex += 3) {
      const start = stepMap.ranges[rangeIndex]!;
      const oldSize = stepMap.ranges[rangeIndex + 1]!;
      const end = start + oldSize;

      if (
        oldSize > 0 &&
        (side === "after"
          ? start <= mappedPosition && mappedPosition < end
          : start < mappedPosition && mappedPosition <= end)
      ) {
        return true;
      }
    }
    mappedPosition = stepMap.map(mappedPosition, side === "after" ? -1 : 1);
  }
  return false;
}
