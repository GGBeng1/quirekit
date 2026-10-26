/**
 * Checks whether moving a range to a boundary keeps the original order.
 *
 * @param from - First moved index.
 * @param to - Last moved index.
 * @param targetIndex - Source collection insertion boundary.
 * @returns Whether the move is a no-op.
 */
export function isMoveRangeNoop(
  from: number,
  to: number,
  targetIndex: number
): boolean {
  return targetIndex >= from && targetIndex <= to + 1;
}

/**
 * Converts a source collection insertion boundary to an index after removal.
 *
 * @param from - First moved index.
 * @param to - Last moved index.
 * @param targetIndex - Source collection insertion boundary.
 * @returns Insertion index after the range has been removed.
 */
export function getMoveRangeInsertionIndex(
  from: number,
  to: number,
  targetIndex: number
): number {
  return targetIndex > to ? targetIndex - (to - from + 1) : targetIndex;
}
