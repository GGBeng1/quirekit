import type {
  Node as PMNode,
  Slice,
  Transaction
} from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireStructuredRangeSegment } from "./types";

/**
 * Replaces exact structured selection ranges without consuming gaps.
 *
 * @param transaction - Transaction receiving replacement steps.
 * @param segments - Selected text and semantic structure segments.
 * @param content - Slice inserted into the first source range.
 * @returns Whether replacement was safely handled.
 */
export function replaceStructuredRanges(
  transaction: Transaction,
  segments: readonly QuireStructuredRangeSegment[],
  content: Slice
): boolean {
  const ranges = resolveReplacementRanges(segments);
  if (ranges === null) return false;

  // Process from the end so earlier source positions remain stable. The
  // replacement content belongs to the first source range; later ranges only
  // delete their selected coverage.
  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const range = ranges[index]!;
    if (index === 0) {
      transaction.replaceRange(range.from, range.to, content);
    } else {
      transaction.deleteRange(range.from, range.to);
    }
  }
  return true;
}

/**
 * Replaces exact structured ranges with one node.
 *
 * @param transaction - Transaction receiving replacement steps.
 * @param segments - Selected text and semantic structure segments.
 * @param node - Node inserted into the first source range.
 * @returns Whether replacement was safely handled.
 */
export function replaceStructuredRangesWithNode(
  transaction: Transaction,
  segments: readonly QuireStructuredRangeSegment[],
  node: PMNode
): boolean {
  const ranges = resolveReplacementRanges(segments);
  if (ranges === null) return false;

  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const range = ranges[index]!;
    if (index === 0) {
      transaction.replaceRangeWith(range.from, range.to, node);
    } else {
      transaction.deleteRange(range.from, range.to);
    }
  }
  return true;
}

/**
 * Resolves adapter replacement fallbacks and merges overlapping coverage.
 *
 * @param segments - Source-ordered structured selection segments.
 * @returns Safe replacement ranges, or null when a domain rejects replacement.
 */
function resolveReplacementRanges(
  segments: readonly QuireStructuredRangeSegment[]
): readonly QuireDocumentRange[] | null {
  if (segments.some((segment) =>
    segment.kind === "structure" &&
    segment.replacementFallback === "reject"
  )) {
    return null;
  }

  const ranges = segments.map((segment) =>
    segment.kind === "structure" &&
      segment.replacementFallback === "owner"
      ? segment.ownerRange
      : segment.range
  );
  const merged: QuireDocumentRange[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to) {
      merged[merged.length - 1] = {
        from: previous.from,
        to: Math.max(previous.to, range.to)
      };
    } else {
      merged.push(range);
    }
  }
  return merged;
}
