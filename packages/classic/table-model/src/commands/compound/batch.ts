import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import { addColumnToRow } from "../derive/column/row";
import { insertGridColumn } from "../derive/grid/table";
import { cloneTableWithRows } from "../derive/node/clone";
import {
  createFullWidthRowAt,
  createRowFromAdjacentShape
} from "../derive/row/create";
import {
  prepareWordTableCommand,
  repairWordTableVerticalMerges
} from "../repair";
import type {
  AddWordTableColumnsOptions,
  AddWordTableRowsOptions,
  WordTableCommandResult,
  WordTableInsertSide
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
  withWordTableRepairReport
} from "../types";

/** ECMAScript indexed arrays cannot represent a larger `length`. */
const maximumIndexedArrayLength = 0xffff_ffff;

/**
 * Inserts multiple Word table rows as one pure table transform.
 *
 * @param tableNode - Source table node.
 * @param options - Atomic row batch options.
 * @returns Command result containing the updated table node.
 */
export function addWordTableRows(
  tableNode: PMNode,
  options: AddWordTableRowsOptions
): WordTableCommandResult<PMNode> {
  if (
    !canGrowIndexedArray(tableNode.childCount, options.count)
    || !isInsertSide(options.side)
    || options.rowIndex < 0
    || options.rowIndex >= tableNode.childCount
  ) {
    return wordTableCommandFailure("invalid-selection");
  }

  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const insertRowIndex = options.side === "before"
    ? options.rowIndex
    : options.rowIndex + 1;

  // All rows share one source insertion boundary so active merge chains and
  // copied row offsets are derived once, then committed by one table replace.
  const insertedRows = Array.from({ length: options.count }, () =>
    options.copyRowShape
      ? createRowFromAdjacentShape(sourceTable, options.rowIndex)
      : createFullWidthRowAt(sourceTable, map, insertRowIndex)
  );
  const rows = sourceTable.children
    .slice(0, insertRowIndex)
    .concat(insertedRows, sourceTable.children.slice(insertRowIndex));

  return withWordTableRepairReport(
    repairWordTableVerticalMerges(cloneTableWithRows(sourceTable, {}, rows)),
    prepared.value.repair
  );
}

/**
 * Inserts multiple Word table grid columns as one pure table transform.
 *
 * @param tableNode - Source table node.
 * @param options - Atomic column batch options.
 * @returns Command result containing the updated table node.
 */
export function addWordTableColumns(
  tableNode: PMNode,
  options: AddWordTableColumnsOptions
): WordTableCommandResult<PMNode> {
  if (!isPositiveSafeInteger(options.count) || !isInsertSide(options.side)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  let current = prepared.value.tableNode;
  let width = createWordTableMap(current).width;
  if (
    !canGrowIndexedArray(width, options.count)
    || options.columnIndex < 0
    || options.columnIndex >= width
  ) {
    return wordTableCommandFailure("invalid-selection");
  }
  let insertColumn = options.side === "before"
    ? options.columnIndex
    : options.columnIndex + 1;

  // Compose the accepted count in memory. Only the final table reaches the
  // editor transaction, so the UI never loops primitive dispatches or history.
  for (let index = 0; index < options.count; index += 1) {
    const rows = current.children.map((row) =>
      addColumnToRow(current, row, insertColumn)
    );
    current = cloneTableWithRows(current, {
      grid: insertGridColumn(current.attrs.grid, width, insertColumn)
    }, rows);
    width += 1;
    insertColumn += 1;
  }

  return wordTableCommandSuccess(current, prepared.value.repair);
}

/**
 * Checks whether one indexed node collection can grow by the requested count.
 *
 * This is a platform-capacity preflight, not a product or Word feature limit.
 * It prevents an accepted command from exceeding the indexed-array structure
 * used by ProseMirror fragments before any new nodes are allocated.
 *
 * @param currentCount - Existing indexed child or grid count.
 * @param addedCount - Candidate insertion count.
 * @returns Whether the final indexed structure is representable.
 */
function canGrowIndexedArray(
  currentCount: number,
  addedCount: number
): boolean {
  return isPositiveSafeInteger(addedCount)
    && currentCount >= 0
    && currentCount <= maximumIndexedArrayLength
    && addedCount <= maximumIndexedArrayLength - currentCount;
}

/**
 * Checks whether one batch count is a positive safe integer.
 *
 * @param count - Candidate batch count.
 * @returns Whether the count is a positive safe integer.
 */
function isPositiveSafeInteger(count: number): boolean {
  return Number.isSafeInteger(count) && count > 0;
}

/**
 * Checks one runtime insertion-side value.
 *
 * @param side - Candidate insertion side.
 * @returns Whether the side is canonical.
 */
function isInsertSide(side: WordTableInsertSide): boolean {
  return side === "before" || side === "after";
}
