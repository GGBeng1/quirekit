/**
 * Creates a stable row/cell key.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Source cell index.
 * @returns Row/cell key.
 */
export function getSplitCellKey(rowIndex: number, cellIndex: number): string {
  return `${rowIndex}:${cellIndex}`;
}
