import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireTableLayoutInput,
  QuireTableRowGeometry
} from "../types";
import type { QuireTablePlacement } from "./placement";
import type { QuireTableTrackLayout } from "./tracks";

/**
 * Creates row fragments from resolved row heights and spacing.
 *
 * @param input - Table source and layout constraints.
 * @param placement - Resolved table placement.
 * @param tracks - Resolved table and row-local track facts.
 * @param rowHeights - Resolved row heights in source order.
 * @returns Row fragments in source order.
 */
export function layoutQuireTableRows(
  input: QuireTableLayoutInput,
  placement: QuireTablePlacement,
  tracks: QuireTableTrackLayout,
  rowHeights: readonly number[]
): readonly QuireTableRowGeometry[] {
  let y = input.constraints.rect.y +
    (tracks.rowCellSpacings[0] ?? tracks.cellSpacing);

  return input.source.rows.map((row, index) => {
    const height = rowHeights[index] ?? input.constraints.defaultRowHeight;
    const cellSpacing = tracks.rowCellSpacings[index] ?? tracks.cellSpacing;
    const fragment = {
      id: `${input.tableId}:row-${row.rowIndex}`,
      sourceRowId: row.id,
      rowIndex: row.rowIndex,
      gridBefore: row.gridBefore,
      gridAfter: row.gridAfter,
      isHeader: row.isHeader,
      cantSplit: row.cantSplit,
      borders: row.borders ?? null,
      cellSpacing,
      range: resolveRowRange(input, row.rowIndex),
      rect: {
        x: placement.x + cellSpacing,
        y,
        width: Math.max(0, placement.width - (cellSpacing * 2)),
        height
      }
    };

    y += height + (tracks.rowCellSpacings[index + 1] ?? cellSpacing);
    return fragment;
  });
}

/**
 * Resolves table height including separated-border outer and inner row gaps.
 *
 * @param rowHeights - Resolved cell row heights.
 * @param tracks - Resolved table and row-local spacing facts.
 * @returns Table fragment height in CSS pixels.
 */
export function resolveQuireTableHeight(
  rowHeights: readonly number[],
  tracks: QuireTableTrackLayout
): number {
  const resolvedRowSpacings = rowHeights.map((_, index) =>
    tracks.rowCellSpacings[index] ?? tracks.cellSpacing
  );
  const trailingSpacing = resolvedRowSpacings.at(-1) ?? tracks.cellSpacing;

  return rowHeights.reduce((total, rowHeight) => total + rowHeight, 0) +
    resolvedRowSpacings.reduce((total, spacing) => total + spacing, 0) +
    trailingSpacing;
}

/**
 * Resolves the document range covered by one source row's editable content.
 *
 * @param input - Table source and layout constraints.
 * @param rowIndex - Zero-based source row index.
 * @returns Document range covered by the row.
 */
function resolveRowRange(
  input: QuireTableLayoutInput,
  rowIndex: number
): QuireDocumentRange {
  const rowCells = input.source.semanticCells.filter(
    (cell) => cell.gridRect.startRow === rowIndex
  );

  if (rowCells.length > 0) {
    return {
      from: Math.min(...rowCells.map((cell) => cell.contentRange.from)),
      to: Math.max(...rowCells.map((cell) => cell.contentRange.to))
    };
  }

  const row = input.source.rows[rowIndex];
  const nextRow = input.source.rows[rowIndex + 1];
  const from = input.tableRange.from + (row?.rowPos ?? 0);
  const to = nextRow === undefined
    ? input.tableRange.to
    : input.tableRange.from + nextRow.rowPos;

  return {
    from: Math.min(from, to),
    to: Math.max(from, to)
  };
}
