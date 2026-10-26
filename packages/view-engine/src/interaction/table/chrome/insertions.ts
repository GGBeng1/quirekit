import type { QuireTableLayoutSnapshot } from "../../../layout/engine/table";
import {
  createTableChromeAnchor,
  semanticCellsForColumn,
  semanticCellsForRow
} from "./shared";
import type { QuireTableChromeAnchor } from "./types";

/**
 * Builds insertion anchors before, between, and after every visible axis item.
 *
 * @param table - Page-local Table snapshot.
 * @param tableRect - Semantic visual grid bounds.
 * @param semanticCellIds - Stable semantic cells represented by the fragment.
 * @returns Row boundaries followed by column boundaries.
 */
export function createTableInsertionAnchors(
  table: QuireTableLayoutSnapshot,
  tableRect: QuireTableLayoutSnapshot["rect"],
  semanticCellIds: readonly string[]
): readonly QuireTableChromeAnchor[] {
  const visibleRows = table.rows.filter(
    (row) => semanticCellsForRow(table, row.rowIndex).length > 0
  );
  const rowAnchors = visibleRows.map((row): QuireTableChromeAnchor => ({
    ...createTableChromeAnchor(
      `${table.fragmentId}:insert-row:${row.rowIndex}`,
      "insert-row",
      { x: tableRect.x, y: row.rect.y, width: 0, height: 0 },
      table.tableRange.from,
      semanticCellIds
    ),
    boundaryIndex: row.rowIndex
  }));
  const lastRow = visibleRows.at(-1);
  if (lastRow !== undefined) {
    rowAnchors.push({
      ...createTableChromeAnchor(
        `${table.fragmentId}:insert-row:${lastRow.rowIndex + 1}`,
        "insert-row",
        {
          x: tableRect.x,
          y: lastRow.rect.y + lastRow.rect.height,
          width: 0,
          height: 0
        },
        table.tableRange.from,
        semanticCellIds
      ),
      boundaryIndex: lastRow.rowIndex + 1
    });
  }

  const visibleColumns = table.tracks.filter(
    (track) => semanticCellsForColumn(table, track.columnIndex).length > 0
  );
  const columnAnchors = visibleColumns.map(
    (track): QuireTableChromeAnchor => ({
      ...createTableChromeAnchor(
        `${table.fragmentId}:insert-column:${track.columnIndex}`,
        "insert-column",
        { x: track.x, y: tableRect.y, width: 0, height: 0 },
        table.tableRange.from,
        semanticCellIds
      ),
      boundaryIndex: track.columnIndex
    })
  );
  const lastColumn = visibleColumns.at(-1);
  if (lastColumn !== undefined) {
    columnAnchors.push({
      ...createTableChromeAnchor(
        `${table.fragmentId}:insert-column:${lastColumn.columnIndex + 1}`,
        "insert-column",
        {
          x: lastColumn.x + lastColumn.width,
          y: tableRect.y,
          width: 0,
          height: 0
        },
        table.tableRange.from,
        semanticCellIds
      ),
      boundaryIndex: lastColumn.columnIndex + 1
    });
  }

  return [...rowAnchors, ...columnAnchors];
}
