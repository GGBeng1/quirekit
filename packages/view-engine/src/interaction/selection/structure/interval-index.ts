import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireSelectionStructureIntervalIndex,
  QuireSelectionStructureOwnerFact
} from "./types";

/**
 * Creates the immutable query facade and prefix-maximum acceleration data.
 *
 * @param entries - Source-ordered owner facts.
 * @returns Interval index with half-open intersection queries.
 */
export function createSelectionStructureIntervalIndex(
  entries: readonly QuireSelectionStructureOwnerFact[]
): QuireSelectionStructureIntervalIndex {
  const prefixMaxTo: number[] = [];
  let maxTo = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    maxTo = Math.max(maxTo, entry.range.to);
    prefixMaxTo.push(maxTo);
  }

  return {
    entries,
    entryCount: entries.length,
    query: (range) => queryIntervalIndex(entries, prefixMaxTo, range)
  };
}

/**
 * Orders owners by source start and places outer owners before nested owners.
 *
 * @param left - First owner fact.
 * @param right - Second owner fact.
 * @returns Numeric sort order.
 */
export function compareSelectionStructureOwnerFacts(
  left: QuireSelectionStructureOwnerFact,
  right: QuireSelectionStructureOwnerFact
): number {
  return left.range.from - right.range.from
    || right.range.to - left.range.to
    || left.adapterId.localeCompare(right.adapterId);
}

/**
 * Queries one source interval using prefix maximums and an ordered tail scan.
 *
 * @param entries - Source-ordered owner facts.
 * @param prefixMaxTo - Maximum owner end through each entry index.
 * @param range - Expanded half-open source range.
 * @returns Intersecting owner facts in source order.
 */
function queryIntervalIndex(
  entries: readonly QuireSelectionStructureOwnerFact[],
  prefixMaxTo: readonly number[],
  range: QuireDocumentRange
): readonly QuireSelectionStructureOwnerFact[] {
  if (range.from >= range.to || entries.length === 0) return [];

  let low = 0;
  let high = prefixMaxTo.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((prefixMaxTo[middle] ?? Number.NEGATIVE_INFINITY) > range.from) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  const matches: QuireSelectionStructureOwnerFact[] = [];
  for (let index = low; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (entry.range.from >= range.to) break;
    if (entry.range.to > range.from) matches.push(entry);
  }
  return matches;
}
