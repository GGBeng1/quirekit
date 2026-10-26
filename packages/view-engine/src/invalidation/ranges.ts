import { isQuireDocumentRangeEmpty } from "@quirekit/renderer";
import type { QuireInvalidationRange } from "./types";

/**
 * Merges overlapping or adjacent invalidation ranges.
 *
 * @param ranges - Invalidation ranges to normalize.
 * @returns Sorted, non-overlapping invalidation ranges.
 */
export function mergeQuireInvalidationRanges(
  ranges: readonly QuireInvalidationRange[]
): readonly QuireInvalidationRange[] {
  const sortedRanges = [...ranges]
    .filter((range) => !isQuireDocumentRangeEmpty(range))
    .sort((first, second) => first.from - second.from || first.to - second.to);
  const mergedRanges: QuireInvalidationRange[] = [];

  for (const range of sortedRanges) {
    const previous = mergedRanges.at(-1);

    if (!previous || range.from > previous.to) {
      mergedRanges.push(range);
      continue;
    }

    mergedRanges[mergedRanges.length - 1] = {
      from: previous.from,
      to: Math.max(previous.to, range.to)
    };
  }

  return mergedRanges;
}
