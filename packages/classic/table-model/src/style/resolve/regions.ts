import type { WordTableMap, WordTableSemanticCellRef } from "../../map";
import type { WordTableStyleLook, WordTableStyleRegionType } from "../types";

/** Relationship between one cell edge and one region instance. */
export type WordTableRegionEdgeState = "boundary" | "inside" | "outside";

/** Physical cell edges addressed by region-relative border mapping. */
export type WordTableCellEdge = "top" | "right" | "bottom" | "left";

/** One region instance that applies to a semantic cell. */
export interface WordTableCellRegion {
  /** Region type. */
  readonly type: WordTableStyleRegionType;
  /** Position of each cell edge relative to this region instance. */
  readonly edges: Readonly<Record<WordTableCellEdge, WordTableRegionEdgeState>>;
}

/** Inputs that decide which conditional regions exist in one table. */
export interface WordTableRegionContext {
  /** Table grid map. */
  readonly map: WordTableMap;
  /** Effective look switches. */
  readonly look: WordTableStyleLook;
  /** Rows per horizontal band; zero disables row banding. */
  readonly rowBandSize: number;
  /** Columns per vertical band; zero disables column banding. */
  readonly columnBandSize: number;
  /** Whether the compiled style declares a first-column region. */
  readonly hasFirstColumnRegion: boolean;
}

/** Application order defined by Word's normative variation of §17.7.6.6. */
export const wordTableStyleRegionOrder: readonly WordTableStyleRegionType[] = Object.freeze([
  "band1Horizontal",
  "band2Horizontal",
  "band1Vertical",
  "band2Vertical",
  "firstColumn",
  "lastColumn",
  "firstRow",
  "lastRow",
  "northWestCell",
  "northEastCell",
  "southWestCell",
  "southEastCell"
]);

/**
 * Classifies the conditional regions of every semantic cell.
 *
 * Rows use grid coordinates; columns use the origin cell's index within its
 * row, matching Word's cell-based column banding. Header rows are row zero
 * plus the rows marked as repeating headers that continue it without a gap.
 *
 * @param context - Table map, look, and band sizes.
 * @returns Regions per semantic cell id, each list in application order.
 */
export function classifyWordTableCellRegions(
  context: WordTableRegionContext
): ReadonlyMap<string, readonly WordTableCellRegion[]> {
  const { map, look } = context;
  const lastRow = map.height - 1;
  const headerRowCount = look.firstRow ? countHeaderRows(map) : 0;
  const cellsPerRow = countCellsPerRow(map);
  const explicitById = new Map(map.explicitCells.map(cell => [cell.id, cell]));
  const result = new Map<string, readonly WordTableCellRegion[]>();

  for (const cell of map.semanticCells) {
    const origin = explicitById.get(cell.originExplicitCellId);
    if (origin === undefined) continue;
    const startRow = cell.rect.startRow;
    const endRow = startRow + cell.rect.rowSpan - 1;
    const cellIndex = origin.cellIndex;
    const isFirstCell = cellIndex === 0;
    const isLastCell = cellIndex === (cellsPerRow.get(origin.rowIndex) ?? 1) - 1;
    const inHeader = startRow < headerRowCount;
    const inLastRow = look.lastRow && endRow === lastRow;
    const inFirstColumn = look.firstColumn && isFirstCell;
    const inLastColumn = look.lastColumn && isLastCell;
    const regions: WordTableCellRegion[] = [];

    // Phase 1: bands, rows before columns.
    if (look.bandedRows && context.rowBandSize > 0 && !inHeader) {
      const index = startRow - headerRowCount;
      const size = context.rowBandSize;
      const bandStart = headerRowCount + Math.floor(index / size) * size;
      const bandEnd = Math.min(bandStart + size - 1, lastRow);
      regions.push({
        type: Math.floor(index / size) % 2 === 0 ? "band1Horizontal" : "band2Horizontal",
        edges: rowSpanEdges(cell, bandStart, bandEnd, isFirstCell, isLastCell)
      });
    }
    const columnIndex = cellIndex - (look.firstColumn && context.hasFirstColumnRegion ? 1 : 0);
    if (look.bandedColumns && context.columnBandSize > 0 && columnIndex >= 0) {
      const size = context.columnBandSize;
      const band = Math.floor(columnIndex / size);
      regions.push({
        type: band % 2 === 0 ? "band1Vertical" : "band2Vertical",
        edges: columnEdges(
          cell,
          lastRow,
          columnIndex % size === 0,
          columnIndex % size === size - 1 || isLastCell
        )
      });
    }

    // Phase 2: first/last column, then first/last row.
    if (inFirstColumn) regions.push({ type: "firstColumn", edges: columnEdges(cell, lastRow, true, true) });
    if (inLastColumn) regions.push({ type: "lastColumn", edges: columnEdges(cell, lastRow, true, true) });
    if (inHeader) {
      regions.push({ type: "firstRow", edges: rowSpanEdges(cell, 0, headerRowCount - 1, isFirstCell, isLastCell) });
    }
    if (inLastRow) regions.push({ type: "lastRow", edges: rowSpanEdges(cell, lastRow, lastRow, isFirstCell, isLastCell) });

    // Phase 3: corners apply only when both the row and column switches are on.
    const corner = allBoundary;
    if (inHeader && inFirstColumn) regions.push({ type: "northWestCell", edges: corner });
    if (inHeader && inLastColumn) regions.push({ type: "northEastCell", edges: corner });
    if (inLastRow && inFirstColumn) regions.push({ type: "southWestCell", edges: corner });
    if (inLastRow && inLastColumn) regions.push({ type: "southEastCell", edges: corner });

    result.set(cell.id, regions);
  }
  return result;
}

const allBoundary: Readonly<Record<WordTableCellEdge, WordTableRegionEdgeState>> = Object.freeze({
  top: "boundary",
  right: "boundary",
  bottom: "boundary",
  left: "boundary"
});

/**
 * Edge states for the whole table treated as one region.
 *
 * @param cell - Semantic cell.
 * @param lastRow - Last grid row index.
 * @param isFirstCell - Whether the origin is its row's first cell.
 * @param isLastCell - Whether the origin is its row's last cell.
 * @returns Edge states.
 */
export function wholeTableEdges(
  cell: WordTableSemanticCellRef,
  lastRow: number,
  isFirstCell: boolean,
  isLastCell: boolean
): Readonly<Record<WordTableCellEdge, WordTableRegionEdgeState>> {
  return rowSpanEdges(cell, 0, lastRow, isFirstCell, isLastCell);
}

/**
 * Edge states for a region spanning full rows `[regionTop, regionBottom]`.
 *
 * @param cell - Semantic cell.
 * @param regionTop - First row of the region.
 * @param regionBottom - Last row of the region.
 * @param isFirstCell - Whether the origin is its row's first cell.
 * @param isLastCell - Whether the origin is its row's last cell.
 * @returns Edge states.
 */
function rowSpanEdges(
  cell: WordTableSemanticCellRef,
  regionTop: number,
  regionBottom: number,
  isFirstCell: boolean,
  isLastCell: boolean
): Readonly<Record<WordTableCellEdge, WordTableRegionEdgeState>> {
  const top = cell.rect.startRow;
  const bottom = top + cell.rect.rowSpan - 1;
  return {
    top: top < regionTop ? "outside" : top === regionTop ? "boundary" : "inside",
    bottom: bottom > regionBottom ? "outside" : bottom === regionBottom ? "boundary" : "inside",
    left: isFirstCell ? "boundary" : "inside",
    right: isLastCell ? "boundary" : "inside"
  };
}

/**
 * Edge states for a region spanning full columns across every row.
 *
 * @param cell - Semantic cell.
 * @param lastRow - Last grid row index.
 * @param leftBoundary - Whether the cell's left edge bounds the region.
 * @param rightBoundary - Whether the cell's right edge bounds the region.
 * @returns Edge states.
 */
function columnEdges(
  cell: WordTableSemanticCellRef,
  lastRow: number,
  leftBoundary: boolean,
  rightBoundary: boolean
): Readonly<Record<WordTableCellEdge, WordTableRegionEdgeState>> {
  const top = cell.rect.startRow;
  const bottom = top + cell.rect.rowSpan - 1;
  return {
    top: top === 0 ? "boundary" : "inside",
    bottom: bottom === lastRow ? "boundary" : "inside",
    left: leftBoundary ? "boundary" : "inside",
    right: rightBoundary ? "boundary" : "inside"
  };
}

/**
 * Counts header rows: row zero plus contiguous repeating-header rows after it.
 *
 * @param map - Table grid map.
 * @returns Number of rows receiving first-row formatting.
 */
function countHeaderRows(map: WordTableMap): number {
  if (map.height === 0) return 0;
  let count = 1;
  if (map.rows[0]?.isHeader !== true) return count;
  while (count < map.height && map.rows[count]?.isHeader === true) count++;
  return count;
}

/**
 * Counts explicit cells per row.
 *
 * @param map - Table grid map.
 * @returns Explicit cell count keyed by row index.
 */
export function countCellsPerRow(map: WordTableMap): ReadonlyMap<number, number> {
  const counts = new Map<number, number>();
  for (const cell of map.explicitCells) {
    counts.set(cell.rowIndex, Math.max(counts.get(cell.rowIndex) ?? 0, cell.cellIndex + 1));
  }
  return counts;
}
