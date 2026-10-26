import type { Editor, QuireMountedTableChromeAnchor, QuireMountedTableChromeFragment, QuireMountedTableChromeModel } from "@quirekit/core";
import type { BlockTableTarget } from "../ui/types";

/**
 * Measures only the active HTML table; physical cell edges omit merged-cell gaps.
 * @param editor - Public DOM position owner.
 * @param target - Immutable canonical table identity.
 * @returns Client-space chrome and source CSS-pixel sizes, or null before layout.
 */
export function measureBlockTable(editor: Editor, target: BlockTableTarget): QuireMountedTableChromeModel | null {
  const table = editor.view.nodeDOM?.(target.tablePos);
  if (!(table instanceof HTMLTableElement) || editor.state.doc !== target.doc) return null;
  const tableRect = table.getBoundingClientRect();
  if (tableRect.width <= 0 || table.offsetWidth <= 0) return null;
  const scale = tableRect.width / table.offsetWidth;
  const columns = Array.from(table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"));
  const rows = Array.from(table.rows);
  if (columns.length !== target.map.width || rows.length !== target.map.height) return null;
  /** @param kind - Control role. @param rect - Client-space extent. @param index - Axis index. @returns Stable spatial anchor. */
  function anchor(kind: QuireMountedTableChromeAnchor["kind"], rect: QuireMountedTableChromeAnchor["rect"], index = 0): QuireMountedTableChromeAnchor {
    return { id: `${target.tablePos}:${kind}:${index}`, kind, rect, tablePos: target.tablePos, semanticCellIds: [],
      ...(kind.includes("row") ? { rowIndex: index } : { columnIndex: index }),
      ...(kind.startsWith("insert") ? { boundaryIndex: index } : {}) };
  }
  const columnRects = columns.map(col => col.getBoundingClientRect()), rowRects = rows.map(row => row.getBoundingClientRect());
  const resizes: QuireMountedTableChromeAnchor[] = [];
  // Only real semantic edges are interactive; a spanning cell cannot expose an
  // invented internal border merely because the grid has a column there.
  for (const cell of target.map.semanticCells) {
    const element = editor.view.nodeDOM?.(target.tablePos + cell.originCellPos);
    if (!(element instanceof HTMLTableCellElement)) continue;
    const rect = element.getBoundingClientRect();
    const column = cell.rect.startColumn + cell.rect.columnSpan - 1, row = cell.rect.startRow + cell.rect.rowSpan - 1;
    resizes.push({ ...anchor("resize-column", { left: rect.right, right: rect.right, top: rect.top, bottom: rect.bottom }, column), id: `column:${cell.id}`, semanticCellIds: [cell.id] });
    resizes.push({ ...anchor("resize-row", { top: rect.bottom, bottom: rect.bottom, left: rect.left, right: rect.right }, row), id: `row:${cell.id}`, semanticCellIds: [cell.id] });
  }
  const fragment: QuireMountedTableChromeFragment = {
    fragmentId: `html:${target.tablePos}`, tableRect, guides: [], corner: anchor("table-corner", tableRect), menu: anchor("menu", tableRect),
    columns: columnRects.map((rect, index) => anchor("column-bar", { left: rect.left, right: rect.right, top: tableRect.top, bottom: tableRect.bottom }, index)),
    rows: rowRects.map((rect, index) => anchor("row-bar", { top: rect.top, bottom: rect.bottom, left: tableRect.left, right: tableRect.right }, index)),
    insertions: [
      ...Array.from({ length: columns.length + 1 }, (_, index) => { const x = columnRects[index]?.left ?? tableRect.right; return anchor("insert-column", { left: x, right: x, top: tableRect.top, bottom: tableRect.bottom }, index); }),
      ...Array.from({ length: rows.length + 1 }, (_, index) => { const y = rowRects[index]?.top ?? tableRect.bottom; return anchor("insert-row", { top: y, bottom: y, left: tableRect.left, right: tableRect.right }, index); })
    ], resizes
  };
  return { selection: null, resizeSession: null, tableId: `html:${target.tablePos}`, tablePos: target.tablePos, sourceDocument: target.doc, activeFragmentId: fragment.fragmentId, fragments: [fragment],
    sizing: { width: tableRect.width / scale, columnWidths: columnRects.map(rect => rect.width / scale), rowHeights: rowRects.map(rect => rect.height / scale), cellMinimumHeights: [] } };
}
