import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import { distributeNumericTotal } from "../derive/formatting/distribute";
import { distributeGridColumnWidths } from "../derive/formatting/grid";
import { cloneRowWithAttrs, cloneTableWithRows } from "../derive/node/clone";
import { prepareWordTableCommand } from "../repair";
import type {
  DistributeWordTableColumnsOptions,
  DistributeWordTableRowsOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";

/**
 * Distributes declared grid widths across a column range.
 *
 * @param tableNode - Source table node.
 * @param options - Column distribution options.
 * @returns Command result containing the updated table node.
 */
export function distributeWordTableColumns(
  tableNode: PMNode,
  options: DistributeWordTableColumnsOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const range = normalizeRange(options.from, options.to, map.width);

  if (!range) {
    return wordTableCommandFailure("invalid-selection");
  }

  const grid = distributeGridColumnWidths(
    sourceTable.attrs.grid,
    map.width,
    range.from,
    range.to,
    options.totalWidth
  );

  if (!grid) {
    return wordTableCommandFailure("invalid-selection");
  }

  return wordTableCommandSuccess(
    cloneTableWithRows(sourceTable, { grid }, sourceTable.children),
    prepared.value.repair
  );
}

/**
 * Distributes direct row heights across a source row range.
 *
 * @param tableNode - Source table node.
 * @param options - Row distribution options.
 * @returns Command result containing the updated table node.
 */
export function distributeWordTableRows(
  tableNode: PMNode,
  options: DistributeWordTableRowsOptions
): WordTableCommandResult<PMNode> {
  const range = normalizeRange(options.from, options.to, tableNode.childCount);

  if (!range) {
    return wordTableCommandFailure("invalid-selection");
  }

  const totalHeight = options.totalHeight ?? resolveCurrentTotalRowHeight(
    tableNode,
    range.from,
    range.to
  );

  if (!totalHeight) {
    return wordTableCommandFailure("invalid-selection");
  }

  const values = distributeNumericTotal(totalHeight.value, range.count);

  if (!values) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rows = tableNode.children.map((row, rowIndex) => {
    if (rowIndex < range.from || rowIndex > range.to) {
      return row;
    }

    return cloneRowWithAttrs(row, {
      height: createDistributedRowHeight(totalHeight, values[rowIndex - range.from]!)
    });
  });

  return wordTableCommandSuccess(cloneTableWithRows(tableNode, {}, rows));
}

/**
 * Normalizes a command range.
 *
 * @param from - First index in the range.
 * @param to - Optional last index in the range.
 * @param size - Available item count.
 * @returns Normalized range, or null when invalid.
 */
function normalizeRange(
  from: number,
  to: number | undefined,
  size: number
): { readonly from: number; readonly to: number; readonly count: number } | null {
  const end = to ?? from;

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(end) ||
    from < 0 ||
    end < from ||
    end >= size
  ) {
    return null;
  }

  return { from, to: end, count: end - from + 1 };
}

/**
 * Resolves a total row height from the current row attrs.
 *
 * @param tableNode - Source table node.
 * @param from - First source row index to read.
 * @param to - Last source row index to read, inclusive.
 * @returns Total row height, or null when heights cannot be safely combined.
 */
function resolveCurrentTotalRowHeight(
  tableNode: PMNode,
  from: number,
  to: number
): NonNullable<DistributeWordTableRowsOptions["totalHeight"]> | null {
  const firstHeight = tableNode.child(from).attrs.height;

  if (!isRowHeight(firstHeight)) {
    return null;
  }

  let total = firstHeight.value;

  for (let rowIndex = from + 1; rowIndex <= to; rowIndex += 1) {
    const height = tableNode.child(rowIndex).attrs.height;

    if (!isRowHeight(height) || height.rule !== firstHeight.rule) {
      return null;
    }

    total += height.value;
  }

  return createDistributedRowHeight(firstHeight, total);
}

/**
 * Creates a row height value.
 *
 * @param height - Height template to copy.
 * @param value - New numeric height value.
 * @returns Row height value for a distributed row.
 */
function createDistributedRowHeight(
  height: NonNullable<DistributeWordTableRowsOptions["totalHeight"]>,
  value: number
): NonNullable<DistributeWordTableRowsOptions["totalHeight"]> {
  return {
    value,
    rule: height.rule,
  };
}

/**
 * Checks whether a value is a row height object.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a row height.
 */
function isRowHeight(
  value: unknown
): value is NonNullable<DistributeWordTableRowsOptions["totalHeight"]> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { readonly value?: unknown }).value === "number" &&
    typeof (value as { readonly rule?: unknown }).rule === "string"
  );
}
