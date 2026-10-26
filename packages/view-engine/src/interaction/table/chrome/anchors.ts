import type { QuireTableLayoutSnapshot } from "../../../layout/engine/table";
import { createTableInsertionAnchors } from "./insertions";
import { createTableResizeAnchors } from "./resizes";
import { createTableMissingBorderGuides } from "./guides";
import {
  createTableChromeAnchor,
  semanticCellsForColumn,
  semanticCellsForRow,
  uniqueSemanticCellIds
} from "./shared";
import type {
  QuireTableChromeAnchor,
  QuireTableChromeFragment
} from "./types";

/**
 * Builds all affordances for one page-local Table fragment.
 *
 * @param table - Page-projected Table layout snapshot.
 * @returns Headless fragment chrome in document space.
 */
export function createQuireTableChromeFragment(
  table: QuireTableLayoutSnapshot
): QuireTableChromeFragment {
  const tablePos = table.tableRange.from;
  const semanticCellIds = uniqueSemanticCellIds(
    table.cells.map((cell) => cell.semanticCellId)
  );
  const sourceRows = table.rows.map((row): QuireTableChromeAnchor => ({
    id: `${table.fragmentId}:row:${row.rowIndex}`,
    kind: "row-bar",
    rect: row.rect,
    tablePos,
    rowIndex: row.rowIndex,
    semanticCellIds: semanticCellsForRow(table, row.rowIndex)
  })).filter((anchor) => anchor.semanticCellIds.length > 0);
  const sourceColumns = table.tracks.map((track): QuireTableChromeAnchor => ({
    id: `${table.fragmentId}:column:${track.columnIndex}`,
    kind: "column-bar",
    rect: {
      x: track.x,
      y: table.rect.y,
      width: track.width,
      height: table.rect.height
    },
    tablePos,
    columnIndex: track.columnIndex,
    semanticCellIds: semanticCellsForColumn(table, track.columnIndex)
  })).filter((anchor) => anchor.semanticCellIds.length > 0);
  const tableRect = resolveTableChromeVisualRect(
    table,
    sourceRows,
    sourceColumns
  );
  const rows = sourceRows.map((anchor): QuireTableChromeAnchor => ({
    ...anchor,
    rect: {
      x: tableRect.x,
      y: anchor.rect.y,
      width: tableRect.width,
      height: anchor.rect.height
    }
  }));
  const columns = sourceColumns.map((anchor): QuireTableChromeAnchor => ({
    ...anchor,
    rect: {
      x: anchor.rect.x,
      y: tableRect.y,
      width: anchor.rect.width,
      height: tableRect.height
    }
  }));

  return {
    fragmentId: table.fragmentId,
    tableRect,
    guides: createTableMissingBorderGuides(table),
    corner: createTableChromeAnchor(
      `${table.fragmentId}:corner`,
      "table-corner",
      tableRect,
      tablePos,
      semanticCellIds
    ),
    rows,
    columns,
    insertions: createTableInsertionAnchors(
      table,
      tableRect,
      semanticCellIds
    ),
    resizes: createTableResizeAnchors(table, tableRect),
    menu: createTableChromeAnchor(
      `${table.fragmentId}:menu`,
      "menu",
      tableRect,
      tablePos,
      semanticCellIds
    )
  };
}

/**
 * Resolves the visible semantic grid bounds independently from the provider's
 * full-width Table flow footprint.
 *
 * @param table - Page-local Table snapshot.
 * @param rows - Rows that own at least one semantic cell.
 * @param columns - Columns that own at least one semantic cell.
 * @returns Visual grid rectangle used by interactive chrome.
 */
function resolveTableChromeVisualRect(
  table: QuireTableLayoutSnapshot,
  rows: readonly QuireTableChromeAnchor[],
  columns: readonly QuireTableChromeAnchor[]
): QuireTableLayoutSnapshot["rect"] {
  const left = columns.length === 0
    ? table.rect.x
    : Math.min(...columns.map((anchor) => anchor.rect.x));
  const right = columns.length === 0
    ? table.rect.x + table.rect.width
    : Math.max(...columns.map((anchor) => anchor.rect.x + anchor.rect.width));
  const top = rows.length === 0
    ? table.rect.y
    : Math.min(...rows.map((anchor) => anchor.rect.y));
  const bottom = rows.length === 0
    ? table.rect.y + table.rect.height
    : Math.max(...rows.map((anchor) => anchor.rect.y + anchor.rect.height));

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}
