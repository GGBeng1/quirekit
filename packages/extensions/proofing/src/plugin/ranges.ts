import type { Mappable } from "@quirekit/pm";
import type { ProofingRange } from "../types";

/**
 * Adds an interval to a sorted, merged interval list.
 *
 * @param ranges - Sorted, non-overlapping intervals.
 * @param range - Interval to add.
 * @returns Sorted, merged intervals.
 */
export function addProofingRange(ranges: readonly ProofingRange[], range: ProofingRange): ProofingRange[] {
  if (range.to <= range.from) return [...ranges];
  const result: ProofingRange[] = [];
  let merged = range;
  let placed = false;
  for (const current of ranges) {
    if (current.to < merged.from) {
      result.push(current);
    } else if (current.from > merged.to) {
      if (!placed) {
        result.push(merged);
        placed = true;
      }
      result.push(current);
    } else {
      merged = { from: Math.min(current.from, merged.from), to: Math.max(current.to, merged.to) };
    }
  }
  if (!placed) result.push(merged);
  return result;
}

/**
 * Removes an interval from a sorted interval list.
 *
 * @param ranges - Sorted, non-overlapping intervals.
 * @param range - Interval to remove.
 * @returns Remaining intervals.
 */
export function subtractProofingRange(ranges: readonly ProofingRange[], range: ProofingRange): ProofingRange[] {
  const result: ProofingRange[] = [];
  for (const current of ranges) {
    if (current.to <= range.from || current.from >= range.to) {
      result.push(current);
      continue;
    }
    if (current.from < range.from) result.push({ from: current.from, to: range.from });
    if (current.to > range.to) result.push({ from: range.to, to: current.to });
  }
  return result;
}

/**
 * Maps intervals through a document change, dropping collapsed ones.
 *
 * @param ranges - Sorted intervals in the old document.
 * @param mapping - Change mapping.
 * @returns Sorted, merged intervals in the new document.
 */
export function mapProofingRanges(ranges: readonly ProofingRange[], mapping: Mappable): ProofingRange[] {
  let result: ProofingRange[] = [];
  for (const range of ranges) {
    result = addProofingRange(result, { from: mapping.map(range.from, -1), to: mapping.map(range.to, 1) });
  }
  return result;
}

/**
 * Tests whether two half-open intervals share a position, counting touching ends.
 *
 * @param left - First interval.
 * @param right - Second interval.
 * @returns Whether they touch or overlap.
 */
export function touchesProofingRange(left: ProofingRange, right: ProofingRange): boolean {
  return left.from <= right.to && right.from <= left.to;
}
