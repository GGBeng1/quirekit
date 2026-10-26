import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireStructuredRangeClaim } from "./claims";
import type {
  QuireStructuredRangeSegment,
  QuireStructuredRangeTextSegment
} from "./types";

/**
 * Produces ordinary text gaps left after all adapter claims.
 *
 * @param rawRange - Ascending raw drag range.
 * @param claims - Non-delegating structural and skip decisions.
 * @returns Non-empty text gaps in source order.
 */
export function createStructuredRangeTextSegments(
  rawRange: QuireDocumentRange,
  claims: readonly QuireStructuredRangeClaim[]
): readonly QuireStructuredRangeTextSegment[] {
  const blocked = mergeRanges(claims.map((claim) => claim.blockedRange));
  const segments: QuireStructuredRangeTextSegment[] = [];
  let cursor = rawRange.from;

  for (const range of blocked) {
    if (cursor < range.from) {
      segments.push({
        kind: "text",
        range: { from: cursor, to: range.from }
      });
    }
    cursor = Math.max(cursor, range.to);
  }
  if (cursor < rawRange.to) {
    segments.push({
      kind: "text",
      range: { from: cursor, to: rawRange.to }
    });
  }
  return segments;
}

/**
 * Orders selected segments by source position with structure before equal text.
 *
 * @param left - First selected segment.
 * @param right - Second selected segment.
 * @returns Numeric sort order.
 */
export function compareStructuredRangeSegments(
  left: QuireStructuredRangeSegment,
  right: QuireStructuredRangeSegment
): number {
  return left.range.from - right.range.from
    || left.range.to - right.range.to
    || (left.kind === right.kind ? 0 : left.kind === "structure" ? -1 : 1);
}

/**
 * Merges overlapping or adjacent blocked ranges.
 *
 * @param ranges - Unordered blocked source ranges.
 * @returns Ascending non-overlapping source ranges.
 */
function mergeRanges(
  ranges: readonly QuireDocumentRange[]
): readonly QuireDocumentRange[] {
  const ordered = [...ranges].sort((left, right) =>
    left.from - right.from || left.to - right.to
  );
  const merged: QuireDocumentRange[] = [];

  for (const range of ordered) {
    const previous = merged.at(-1);
    if (previous === undefined || previous.to < range.from) {
      merged.push({ ...range });
    } else {
      merged[merged.length - 1] = {
        from: previous.from,
        to: Math.max(previous.to, range.to)
      };
    }
  }
  return merged;
}
