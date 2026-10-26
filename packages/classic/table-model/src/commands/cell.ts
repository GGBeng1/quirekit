import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../map";
import {
  createEmptyWordTableCellNode,
  getWordTableCommandNodeTypesFromTable
} from "./derive/node/builder";
import { cloneRowWithAttrs, cloneTableWithRows } from "./derive/node/clone";
import { readWordTableCellSpan } from "./derive/grid/ranges";
import { prepareWordTableCommand } from "./repair";
import type {
  AddWordTableCellOptions,
  DeleteWordTableCellOptions,
  WordTableCommandResult
} from "./types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
  withWordTableRepairReport
} from "./types";

/**
 * Adds one explicit cell by consuming a proven row grid offset.
 *
 * @param tableNode - Source native Word table.
 * @param options - Target row and leading/trailing boundary.
 * @returns Updated valid table or a typed failure.
 */
export function addWordTableCell(
  tableNode: PMNode,
  options: AddWordTableCellOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const row = sourceTable.maybeChild(options.rowIndex);
  const gridSpan = options.gridSpan ?? 1;
  if (row?.type.name !== "wordTableRow") {
    return wordTableCommandFailure("invalid-selection");
  }
  if (!Number.isSafeInteger(gridSpan) || gridSpan <= 0) {
    return wordTableCommandFailure("invalid-selection");
  }
  const interior = options.route !== undefined;
  const cellIndex = options.cellIndex;
  if (interior) {
    if (
      options.side !== undefined
      || !Number.isSafeInteger(cellIndex)
      || (cellIndex as number) <= 0
      || (cellIndex as number) >= row.childCount
    ) return wordTableCommandFailure("invalid-selection");
  } else if (
    cellIndex !== undefined
    || (options.side !== "before" && options.side !== "after")
  ) return wordTableCommandFailure("invalid-selection");
  const offsetName = interior
    ? options.route === "shift-leading" ? "gridBefore" : "gridAfter"
    : options.side === "before" ? "gridBefore" : "gridAfter";
  const offset = Number(row.attrs[offsetName] ?? 0);
  if (!Number.isSafeInteger(offset) || offset < gridSpan) {
    return wordTableCommandFailure("invalid-selection");
  }
  const nodeTypes = getWordTableCommandNodeTypesFromTable(sourceTable);
  const emptyCell = createEmptyWordTableCellNode(nodeTypes);
  const cell = emptyCell.type.create({
    ...emptyCell.attrs,
    colspan: gridSpan,
    gridSpan
  }, emptyCell.content, emptyCell.marks);
  const cells = interior
    ? [
        ...row.children.slice(0, cellIndex as number),
        cell,
        ...row.children.slice(cellIndex as number)
      ]
    : options.side === "before"
      ? [cell, ...row.children]
      : [...row.children, cell];
  const nextRow = cloneRowWithAttrs(
    row,
    { [offsetName]: offset - gridSpan },
    cells
  );
  const rows = sourceTable.children.map((candidate, index) => (
    index === options.rowIndex ? nextRow : candidate
  ));
  const table = cloneTableWithRows(sourceTable, {}, rows);
  if (createWordTableMap(table).diagnostics.length > 0) {
    return wordTableCommandFailure("malformed-table");
  }
  return withWordTableRepairReport(
    wordTableCommandSuccess(table),
    prepared.value.repair
  );
}

/**
 * Deletes one unmerged cell and exposes its logical span as a proven row offset.
 *
 * @param tableNode - Source native Word table.
 * @param options - Target row and direct cell index.
 * @returns Updated valid table or a typed failure.
 */
export function deleteWordTableCell(
  tableNode: PMNode,
  options: DeleteWordTableCellOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const row = sourceTable.maybeChild(options.rowIndex);
  const cell = row?.maybeChild(options.cellIndex);
  const gridSpan = cell == null ? 0 : readRoutableDirectCellSpan(cell);
  if (
    row?.type.name !== "wordTableRow"
    || cell?.type.name !== "wordTableCell"
    || row.childCount <= 1
    || gridSpan === 0
  ) return wordTableCommandFailure("invalid-selection");
  const leading = options.cellIndex === 0;
  const trailing = options.cellIndex === row.childCount - 1;
  const interior = !leading && !trailing;
  if (
    interior
      ? options.route === undefined
      : options.route !== undefined
  ) {
    return wordTableCommandFailure("invalid-selection");
  }
  const offsetName = interior
    ? options.route === "shift-leading" ? "gridBefore" : "gridAfter"
    : leading ? "gridBefore" : "gridAfter";
  const offset = Number(row.attrs[offsetName] ?? 0);
  const cells = row.children.filter((_candidate, index) => (
    index !== options.cellIndex
  ));
  const nextRow = cloneRowWithAttrs(
    row,
    { [offsetName]: offset + gridSpan },
    cells
  );
  const rows = sourceTable.children.map((candidate, index) => (
    index === options.rowIndex ? nextRow : candidate
  ));
  const table = cloneTableWithRows(sourceTable, {}, rows);
  if (createWordTableMap(table).diagnostics.length > 0) {
    return wordTableCommandFailure("malformed-table");
  }
  return withWordTableRepairReport(
    wordTableCommandSuccess(table),
    prepared.value.repair
  );
}

/**
 * Reads one direct cell span only when no merge semantics own the cell.
 *
 * @param cell - Candidate direct cell.
 * @returns Positive matching colspan/gridSpan, or zero when unsupported.
 */
function readRoutableDirectCellSpan(cell: PMNode): number {
  const gridSpan = readWordTableCellSpan(cell);
  return Number(cell.attrs.colspan ?? 1) === gridSpan
    && Number(cell.attrs.gridSpan ?? 1) === gridSpan
    && Number(cell.attrs.rowspan ?? 1) === 1
    && cell.attrs.hMerge === null
    && cell.attrs.vMerge === null
    ? gridSpan
    : 0;
}
