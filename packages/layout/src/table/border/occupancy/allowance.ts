import { resolveQuireTableBorderOccupancy } from "./width";
import { defaultQuireTableBorderWidth } from "../style";
import type { QuireTableBorder, QuireTableSource, QuireTableSourceCell } from "../../types";

/** Vertical space the horizontal table lines take from layout, in CSS pixels. */
export interface QuireTableBorderAllowance {
  /** Space above each row's content: its line to the previous row, or the table's top edge for the first row. */
  readonly rowTop: readonly number[];
  /** Space below the last row: the table's bottom edge. */
  readonly bottom: number;
}

const allowances = new WeakMap<QuireTableSource, QuireTableBorderAllowance>();

/**
 * Resolves the space of every horizontal line from the source topology, before any geometry exists.
 * Each cell first settles its own edge by authority; a shared line then takes the widest of its cells' edges, so
 * a cell's nil edge hides only its own side and never a visible border of the neighbouring cell.
 * @param source - Normalized table source.
 * @returns Space above each row and below the table.
 */
export function resolveQuireTableBorderAllowance(source: QuireTableSource): QuireTableBorderAllowance {
  const cached = allowances.get(source);
  if (cached !== undefined) return cached;
  const rowCount = source.rows.length;
  // A table without border metadata paints the default one-pixel grid on every line.
  const lines = new Array<number>(rowCount + 1).fill(hasQuireTableSourceBorders(source) ? 0 : defaultQuireTableBorderWidth);
  if (hasQuireTableSourceBorders(source)) {
    for (const cell of source.semanticCells) {
      const start = cell.gridRect.startRow;
      const end = Math.min(rowCount, start + Math.max(1, cell.gridRect.rowSpan));
      lines[start] = Math.max(lines[start]!, resolveQuireTableBorderOccupancy(resolveCellEdgeBorder(source, cell, "top", start)));
      lines[end] = Math.max(lines[end]!, resolveQuireTableBorderOccupancy(resolveCellEdgeBorder(source, cell, "bottom", end - 1)));
    }
  }
  const allowance = { rowTop: lines.slice(0, rowCount), bottom: lines[rowCount] ?? 0 };
  allowances.set(source, allowance);
  return allowance;
}

/**
 * Settles one horizontal cell edge by authority: direct cell, table-style cell, row, then the table's outside or
 * inside border. The first value given wins, including an explicit nil.
 * @param source - Normalized table source.
 * @param cell - Cell owning the edge.
 * @param edge - Top or bottom edge.
 * @param rowIndex - Row the edge belongs to.
 * @returns The edge's border, or null when nothing sets it.
 */
function resolveCellEdgeBorder(
  source: QuireTableSource,
  cell: QuireTableSourceCell,
  edge: "top" | "bottom",
  rowIndex: number
): QuireTableBorder | null {
  const outside = edge === "top" ? rowIndex === 0 : rowIndex === source.rows.length - 1;
  return cell.borders?.[edge] ?? cell.styleBorders?.[edge] ?? source.rows[rowIndex]?.borders?.[edge]
    ?? (outside ? source.borders?.[edge] : source.borders?.insideH) ?? null;
}

/**
 * @param source - Normalized table source.
 * @returns Whether any table, row or cell border metadata exists, as the paint candidates decide.
 */
export function hasQuireTableSourceBorders(source: QuireTableSource): boolean {
  return source.borders !== null || source.rows.some(row => row.borders != null)
    || source.semanticCells.some(cell => cell.borders !== null || cell.styleBorders != null);
}
