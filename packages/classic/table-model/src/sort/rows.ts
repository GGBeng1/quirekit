import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../map";
import { prepareWordTableCommand } from "../commands/repair/preflight";
import { cloneTableWithRows } from "../commands/derive/node/clone";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
  withWordTableRepairReport,
  type WordTableCommandResult
} from "../commands/types";
import { orderWordSortItems } from "./compare";
import type { SortWordTableRowsOptions, WordTableSortRefusal } from "./types";
import { readWordSortValue } from "./values";

/** Sorted row order of one table. */
export interface WordTableRowSortPlan {
  /** First sorted row; the header row before it stays in place. */
  readonly start: number;
  /** Source row indices in their sorted order. */
  readonly order: readonly number[];
}

/**
 * Plans a Word table sort: which rows move where.
 *
 * Every key reads the text of the cell covering its grid column in each row.
 * A cell spanning several of the sorted rows makes the table unsortable, as in Word.
 *
 * @param tableNode - Source table.
 * @param options - Keys and header choice.
 * @returns Sorted row order, or why the table cannot be sorted.
 */
export function planWordTableRowSort(
  tableNode: PMNode,
  options: SortWordTableRowsOptions
): WordTableRowSortPlan | WordTableSortRefusal {
  const map = createWordTableMap(tableNode);
  const start = options.hasHeader ? 1 : 0;
  if (map.height - start < 2 || options.keys.length === 0) return "nothing-to-sort";
  if (options.keys.some(key => key.column < 0 || key.column >= map.width)) return "invalid-column";
  if (map.semanticCells.some(cell => cell.rowSpan > 1 && cell.rect.startRow + cell.rowSpan > start)) return "vertical-merge";
  const values = Array.from({ length: map.height - start }, (_, offset) => options.keys.map(key => {
    const cell = map.cellAt(start + offset, key.column);
    const node = cell === null ? null : tableNode.nodeAt(cell.originCellPos);
    return readWordSortValue(node === null ? "" : node.textBetween(0, node.content.size, "\n"), key.type);
  }));
  const order = orderWordSortItems(values, options.keys.map(key => key.order === "descending"));
  return { start, order: order.map(index => index + start) };
}

/**
 * Reorders the rows of a table into sorted order.
 *
 * @param tableNode - Source table.
 * @param options - Keys and header choice.
 * @returns Sorted table, or a failure for an unsortable table.
 */
export function sortWordTableRows(
  tableNode: PMNode,
  options: SortWordTableRowsOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, undefined);
  if (!prepared.ok) return prepared;
  const source = prepared.value.tableNode;
  const plan = planWordTableRowSort(source, options);
  if (typeof plan === "string") return wordTableCommandFailure(plan === "vertical-merge" ? "unsupported-merge" : "invalid-selection");
  const rows = [...source.children];
  const sorted = [...rows.slice(0, plan.start), ...plan.order.map(index => rows[index]!)];
  return withWordTableRepairReport(wordTableCommandSuccess(cloneTableWithRows(source, {}, sorted)), prepared.value.repair);
}

/**
 * Inserts the sorted rows as copies before the rows they replace.
 *
 * Under tracked changes this is the first half of a sort, as Word records it:
 * the sorted rows are inserted rows and the original rows become deleted rows.
 *
 * @param tableNode - Source table.
 * @param options - Keys and header choice.
 * @returns Table holding the sorted copies followed by the original rows.
 */
export function insertSortedWordTableRowCopies(
  tableNode: PMNode,
  options: SortWordTableRowsOptions
): WordTableCommandResult<PMNode> {
  const plan = planWordTableRowSort(tableNode, options);
  if (typeof plan === "string") return wordTableCommandFailure(plan === "vertical-merge" ? "unsupported-merge" : "invalid-selection");
  const rows = [...tableNode.children];
  const copies = plan.order.map(index => rows[index]!.copy(rows[index]!.content));
  return wordTableCommandSuccess(cloneTableWithRows(tableNode, {}, [...rows.slice(0, plan.start), ...copies, ...rows.slice(plan.start)]));
}
