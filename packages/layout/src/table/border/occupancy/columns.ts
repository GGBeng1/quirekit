import { hasQuireTableSourceBorders } from "./allowance";
import { resolveQuireTableBorderOccupancy } from "./width";
import { defaultQuireTableBorderWidth } from "../style";
import type { QuireTableBorder, QuireTableSource, QuireTableSourceCell } from "../../types";

/** Horizontal space the vertical table lines take beside each cell, in CSS pixels. */
export interface QuireTableColumnLineAllowance {
  /** Line width on each cell's left side, by semantic cell id. */
  readonly left: ReadonlyMap<string, number>;
  /** Line width on each cell's right side, by semantic cell id. */
  readonly right: ReadonlyMap<string, number>;
}

const allowances = new WeakMap<QuireTableSource, QuireTableColumnLineAllowance>();

/**
 * Resolves the width of the vertical line beside every cell from the source topology. Within each row, cells
 * settle their own edges by authority and a shared line takes the widest edge; a cell spanning rows takes the
 * widest line along its side.
 * @param source - Normalized table source.
 * @returns Line widths beside each cell.
 */
export function resolveQuireTableColumnLineAllowance(source: QuireTableSource): QuireTableColumnLineAllowance {
  const cached = allowances.get(source);
  if (cached !== undefined) return cached;
  const bordered = hasQuireTableSourceBorders(source);
  const lines = new Map<string, number>();
  const key = (row: number, column: number) => `${row}:${column}`;
  // The outside edges are the table's leftmost and rightmost grid lines, as the paint candidates classify them.
  const first = Math.min(...source.semanticCells.map(cell => cell.gridRect.startColumn));
  const last = Math.max(...source.semanticCells.map(cell => endColumn(cell)));
  if (bordered) {
    for (const cell of source.semanticCells) {
      for (const row of coveredRows(cell)) {
        for (const [side, column] of [["left", cell.gridRect.startColumn], ["right", endColumn(cell)]] as const) {
          const width = resolveQuireTableBorderOccupancy(resolveCellEdgeBorder(source, cell, side, row, column === (side === "left" ? first : last)));
          lines.set(key(row, column), Math.max(lines.get(key(row, column)) ?? 0, width));
        }
      }
    }
  }
  const side = (cell: QuireTableSourceCell, column: number) => bordered
    ? Math.max(0, ...coveredRows(cell).map(row => lines.get(key(row, column)) ?? 0))
    : defaultQuireTableBorderWidth;
  const allowance = {
    left: new Map(source.semanticCells.map(cell => [cell.id, side(cell, cell.gridRect.startColumn)])),
    right: new Map(source.semanticCells.map(cell => [cell.id, side(cell, endColumn(cell))]))
  };
  allowances.set(source, allowance);
  return allowance;
}

/**
 * Settles one vertical cell edge by authority: direct cell, table-style cell, row, then the table's outside or
 * inside border. The first value given wins, including an explicit nil.
 * @param source - Normalized table source.
 * @param cell - Cell owning the edge.
 * @param side - Left or right edge.
 * @param rowIndex - Row slice of the edge.
 * @param outside - Whether the edge lies on the table's outside.
 * @returns The edge's border, or null when nothing sets it.
 */
function resolveCellEdgeBorder(
  source: QuireTableSource,
  cell: QuireTableSourceCell,
  side: "left" | "right",
  rowIndex: number,
  outside: boolean
): QuireTableBorder | null {
  const inherited = outside ? side : "insideV";
  return cell.borders?.[side] ?? cell.styleBorders?.[side] ?? source.rows[rowIndex]?.borders?.[inherited]
    ?? source.borders?.[inherited] ?? null;
}

/** @param cell - Source cell. @returns Grid line after its last column. */
function endColumn(cell: QuireTableSourceCell): number {
  return cell.gridRect.startColumn + Math.max(1, cell.gridRect.columnSpan);
}

/** @param cell - Source cell. @returns Row indexes the cell covers. */
function coveredRows(cell: QuireTableSourceCell): number[] {
  return Array.from({ length: Math.max(1, cell.gridRect.rowSpan) }, (_, offset) => cell.gridRect.startRow + offset);
}
