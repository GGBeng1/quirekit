import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableLayoutSnapshot } from "../../../layout/engine/table";
import type { QuireTableChromeAnchor } from "./types";

/**
 * Resolves semantic cells crossing one source row.
 *
 * @param table - Page-local Table snapshot.
 * @param rowIndex - Source row index.
 * @returns Stable semantic cell ids crossing the row.
 */
export function semanticCellsForRow(
  table: QuireTableLayoutSnapshot,
  rowIndex: number
): readonly string[] {
  return uniqueSemanticCellIds(
    table.cells
      .filter((cell) => (
        cell.gridRect.startRow <= rowIndex
        && cell.gridRect.startRow + cell.gridRect.rowSpan > rowIndex
      ))
      .map((cell) => cell.semanticCellId)
  );
}

/**
 * Resolves semantic cells crossing one grid column.
 *
 * @param table - Page-local Table snapshot.
 * @param columnIndex - Grid column index.
 * @returns Stable semantic cell ids crossing the column.
 */
export function semanticCellsForColumn(
  table: QuireTableLayoutSnapshot,
  columnIndex: number
): readonly string[] {
  return uniqueSemanticCellIds(
    table.cells
      .filter((cell) => (
        cell.gridRect.startColumn <= columnIndex
        && cell.gridRect.startColumn + cell.gridRect.columnSpan > columnIndex
      ))
      .map((cell) => cell.semanticCellId)
  );
}

/**
 * Creates a shared chrome anchor without optional axis coordinates.
 *
 * @param id - Stable fragment-local identity.
 * @param kind - Semantic affordance kind.
 * @param rect - Document-space geometry.
 * @param tablePos - Absolute target table position.
 * @param semanticCellIds - Semantic cells represented by the affordance.
 * @returns Immutable Table chrome anchor.
 */
export function createTableChromeAnchor(
  id: string,
  kind: QuireTableChromeAnchor["kind"],
  rect: QuireRect,
  tablePos: number,
  semanticCellIds: readonly string[]
): QuireTableChromeAnchor {
  return { id, kind, rect, tablePos, semanticCellIds };
}

/**
 * Deduplicates semantic cell identities without changing visual order.
 *
 * @param ids - Semantic ids collected from page-local cells.
 * @returns Stable unique semantic ids.
 */
export function uniqueSemanticCellIds(
  ids: readonly string[]
): readonly string[] {
  return [...new Set(ids)];
}
