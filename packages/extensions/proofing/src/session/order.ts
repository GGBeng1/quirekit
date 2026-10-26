import type { ProofingRange } from "../types";

/**
 * Orders dirty intervals for one collection pass.
 *
 * The caret's block comes first so the text being written is checked first,
 * then the visible part of the document, then every dirty interval starting at
 * the caret and wrapping around. Pieces may overlap; the caller visits each
 * block once.
 *
 * @param dirty - Sorted dirty intervals.
 * @param head - Caret position.
 * @param visible - Visible document interval, or null when unknown.
 * @returns Intervals in visit order.
 */
export function orderProofingVisit(
  dirty: readonly ProofingRange[],
  head: number,
  visible: ProofingRange | null
): ProofingRange[] {
  const caret = intersect(dirty, { from: head, to: head + 1 });
  const seen = visible === null ? [] : intersect(dirty, visible);
  return [...caret, ...seen, ...rotateFromCaret(dirty, head)];
}

/**
 * Clips sorted intervals to a window.
 *
 * @param ranges - Sorted intervals.
 * @param window - Clipping interval.
 * @returns Non-empty clipped intervals.
 */
function intersect(ranges: readonly ProofingRange[], window: ProofingRange): ProofingRange[] {
  return ranges
    .map((range) => ({ from: Math.max(range.from, window.from), to: Math.min(range.to, window.to) }))
    .filter((range) => range.to > range.from);
}

/**
 * Rotates intervals so visiting starts at the caret and wraps around.
 *
 * @param ranges - Sorted intervals.
 * @param head - Caret position.
 * @returns Intervals in visit order; the interval holding the caret is split there.
 */
function rotateFromCaret(ranges: readonly ProofingRange[], head: number): ProofingRange[] {
  const index = ranges.findIndex((range) => range.to > head);
  if (index < 0) return [...ranges];
  const holder = ranges[index]!;
  if (holder.from >= head) return [...ranges.slice(index), ...ranges.slice(0, index)];
  return [
    { from: head, to: holder.to },
    ...ranges.slice(index + 1),
    ...ranges.slice(0, index),
    { from: holder.from, to: head }
  ];
}
