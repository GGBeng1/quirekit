import type { Node as PMNode } from "@quirekit/pm";

/**
 * Clones a cell with merged attrs.
 *
 * @param cell - Source cell.
 * @param attrs - Attr updates.
 * @returns Cloned cell node.
 */
export function cloneCellWithAttrs(
  cell: PMNode,
  attrs: Readonly<Record<string, unknown>>
): PMNode {
  return cell.type.create({ ...cell.attrs, ...attrs }, cell.content, cell.marks);
}

/**
 * Clones a row with merged attrs and optional replacement cells.
 *
 * @param row - Source row.
 * @param attrs - Attr updates.
 * @param cells - Optional replacement cells.
 * @returns Cloned row node.
 */
export function cloneRowWithAttrs(
  row: PMNode,
  attrs: Readonly<Record<string, unknown>>,
  cells: readonly PMNode[] = row.children
): PMNode {
  return row.type.create({ ...row.attrs, ...attrs }, cells, row.marks);
}

/**
 * Clones a table with merged attrs and replacement rows.
 *
 * @param table - Source table.
 * @param attrs - Attr updates.
 * @param rows - Replacement rows.
 * @returns Cloned table node.
 */
export function cloneTableWithRows(
  table: PMNode,
  attrs: Readonly<Record<string, unknown>>,
  rows: readonly PMNode[]
): PMNode {
  return table.type.create({ ...table.attrs, ...attrs }, rows, table.marks);
}
