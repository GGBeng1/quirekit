import type { ProofingRange } from "../types";
import type { ExtractedProofingSegment, ProofingTextSlice } from "./types";

/**
 * Converts a provider range inside a segment into document positions.
 *
 * Both ends must fall on mapped text: a range that starts or ends on a
 * boundary space has no document counterpart and is rejected.
 *
 * @param segment - Segment the offsets refer to.
 * @param start - First UTF-16 offset.
 * @param end - Offset after the range.
 * @returns Document range, or null for an invalid or unmapped range.
 */
export function mapSegmentRange(
  segment: ExtractedProofingSegment,
  start: number,
  end: number
): ProofingRange | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > segment.text.length) {
    return null;
  }
  const first = findSlice(segment.slices, start);
  const last = findSlice(segment.slices, end - 1);
  if (first === undefined || last === undefined) return null;
  return {
    from: first.pos + start - first.offset,
    to: last.pos + end - 1 - last.offset + 1
  };
}

/**
 * Finds the slice containing an offset.
 *
 * @param slices - Slices sorted by offset.
 * @param offset - UTF-16 offset.
 * @returns Containing slice, or undefined on an unmapped offset.
 */
function findSlice(slices: readonly ProofingTextSlice[], offset: number): ProofingTextSlice | undefined {
  let low = 0;
  let high = slices.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const slice = slices[middle]!;
    if (offset < slice.offset) high = middle - 1;
    else if (offset >= slice.offset + slice.length) low = middle + 1;
    else return slice;
  }
  return undefined;
}
