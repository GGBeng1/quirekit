import { resolveQuireTableCellSpacing } from "../../spacing";
import type { QuireTableLayoutInput, QuireTableSourceCell } from "../../types";
import { resolveQuireTableBorderAllowance } from "./allowance";
import { resolveQuireTableColumnLineAllowance } from "./columns";

/**
 * Resolves the horizontal-line space above and below a cell's content. A collapsed table gives each cell the line
 * above its first row and, in the last row, the table's bottom edge; separated borders keep a fixed reserve.
 *
 * @param input - Table source and layout constraints.
 * @param cell - Source cell.
 * @returns Line space above and below the content in CSS pixels.
 */
export function resolveQuireTableCellLineAllowance(
  input: QuireTableLayoutInput,
  cell: QuireTableSourceCell
): { readonly top: number; readonly bottom: number } {
  if (usesQuireTableSeparatedBorders(input.source)) {
    return { top: input.constraints.defaultBorderWidth, bottom: input.constraints.defaultBorderWidth };
  }
  const allowance = resolveQuireTableBorderAllowance(input.source);
  const lastRow = cell.gridRect.startRow + Math.max(1, cell.gridRect.rowSpan) >= input.source.rows.length;
  return { top: allowance.rowTop[cell.gridRect.startRow] ?? 0, bottom: lastRow ? allowance.bottom : 0 };
}

/**
 * @param input - Table source and layout constraints.
 * @param rowIndex - Row index.
 * @returns Line space above the row and, for the last row, the table's bottom edge; separated borders add none.
 */
export function resolveQuireTableRowLineAllowance(
  input: QuireTableLayoutInput,
  rowIndex: number
): { readonly top: number; readonly bottom: number } {
  if (usesQuireTableSeparatedBorders(input.source)) return { top: 0, bottom: 0 };
  const allowance = resolveQuireTableBorderAllowance(input.source);
  return { top: allowance.rowTop[rowIndex] ?? 0, bottom: rowIndex === input.source.rows.length - 1 ? allowance.bottom : 0 };
}

/**
 * @param source - Normalized table source.
 * @returns Whether the table or any row sets cell spacing, which separates every cell's borders.
 */
export function usesQuireTableSeparatedBorders(source: QuireTableLayoutInput["source"]): boolean {
  return resolveQuireTableCellSpacing(source.cellSpacing) > 0
    || source.rows.some(row => resolveQuireTableCellSpacing(row.cellSpacing) > 0);
}

/**
 * Resolves the text inset beside a cell from its margin and the vertical line there: Word centres the line on the
 * grid line and keeps the text clear of half the line or the margin, whichever is wider. Separated borders keep a
 * fixed reserve added to the margin.
 *
 * @param input - Table source and layout constraints.
 * @param cell - Source cell.
 * @param margins - Resolved left and right cell margins in CSS pixels.
 * @returns Left and right content insets in CSS pixels.
 */
export function resolveQuireTableCellSideInsets(
  input: QuireTableLayoutInput,
  cell: QuireTableSourceCell,
  margins: { readonly left: number; readonly right: number }
): { readonly left: number; readonly right: number } {
  if (usesQuireTableSeparatedBorders(input.source)) {
    return { left: margins.left + input.constraints.defaultBorderWidth, right: margins.right + input.constraints.defaultBorderWidth };
  }
  const lines = resolveQuireTableColumnLineAllowance(input.source);
  return {
    left: resolveQuireTableSideInset(lines.left.get(cell.id) ?? 0, margins.left),
    right: resolveQuireTableSideInset(lines.right.get(cell.id) ?? 0, margins.right)
  };
}

/**
 * @param line - Occupied width of the vertical line.
 * @param margin - Cell margin on that side.
 * @returns Distance from the grid line, where the line is centred, to the text.
 */
export function resolveQuireTableSideInset(line: number, margin: number): number {
  return Math.max(line / 2, margin);
}

/**
 * Word places a start-aligned inline table's indent at the outer edge of its left border, so the grid starts half
 * that line further in. Floating, centred and right-aligned tables and separated borders keep their origin.
 *
 * @param input - Table source and layout constraints.
 * @returns Horizontal shift of the grid in CSS pixels.
 */
export function resolveQuireTableOuterEdgeShift(input: QuireTableLayoutInput): number {
  const { source } = input;
  if (source.floating != null || source.alignment === "center" || source.alignment === "right"
    || usesQuireTableSeparatedBorders(source)) return 0;
  const first = source.semanticCells
    .filter(cell => cell.gridRect.startRow === 0)
    .sort((a, b) => a.gridRect.startColumn - b.gridRect.startColumn)[0];
  return first === undefined ? 0 : (resolveQuireTableColumnLineAllowance(source).left.get(first.id) ?? 0) / 2;
}

