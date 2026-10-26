import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import { addWordTableColumns, addWordTableRows } from "../compound";
import {
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import { prepareWordTableCommand } from "../repair";
import type { WordTableCommandResult } from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";
import { prepareWordTableMatrix } from "./source";
import type { PasteWordTableMatrixIntoTableOptions } from "./types";

/**
 * Fills or expands one existing logical Word table from a parsed matrix.
 *
 * Overflow under `fill` fails without truncation. `expand` adds exact bottom
 * rows and right grid columns in memory before cell bodies are replaced.
 * Merged target cells fail closed because multiple matrix slots cannot be
 * assigned to one semantic cell without an unadmitted loss policy.
 *
 * @param tableNode - Existing target table.
 * @param options - Existing-table matrix paste options.
 * @returns Command result containing the updated or unchanged table.
 */
export function pasteWordTableMatrixIntoTable(
  tableNode: PMNode,
  options: PasteWordTableMatrixIntoTableOptions
): WordTableCommandResult<PMNode> {
  if (
    (options.strategy !== "fill" && options.strategy !== "expand")
    || !Number.isSafeInteger(options.startRow)
    || !Number.isSafeInteger(options.startColumn)
    || options.startRow < 0
    || options.startColumn < 0
  ) {
    return wordTableCommandFailure("invalid-selection");
  }

  const source = prepareWordTableMatrix(
    tableNode.type.schema,
    options.matrix,
    options.lossDiagnostics
  );
  if (!source) return wordTableCommandFailure("invalid-content");

  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  let target = prepared.value.tableNode;
  const initialMap = createWordTableMap(target);
  const endRow = options.startRow + source.rowCount;
  const endColumn = options.startColumn + source.columnCount;
  if (
    options.startRow > initialMap.height
    || options.startColumn > initialMap.width
    || (options.strategy === "fill"
      && (endRow > initialMap.height || endColumn > initialMap.width))
  ) {
    return wordTableCommandFailure("invalid-selection");
  }

  if (options.strategy === "expand") {
    const addedRows = Math.max(0, endRow - initialMap.height);
    if (addedRows > 0) {
      const result = addWordTableRows(target, {
        rowIndex: initialMap.height - 1,
        side: "after",
        count: addedRows,
        repair: "never"
      });
      if (!result.ok) return result;
      target = result.value;
    }

    const currentWidth = createWordTableMap(target).width;
    const addedColumns = Math.max(0, endColumn - currentWidth);
    if (addedColumns > 0) {
      const result = addWordTableColumns(target, {
        columnIndex: currentWidth - 1,
        side: "after",
        count: addedColumns,
        repair: "never"
      });
      if (!result.ok) return result;
      target = result.value;
    }
  }

  const filled = fillMatrixBodies(target, source.tableNode, options);
  if (!filled.ok) return filled;
  const unchanged = filled.value === prepared.value.tableNode;

  return wordTableCommandSuccess(
    unchanged && !prepared.value.repair ? tableNode : filled.value,
    prepared.value.repair
  );
}

/**
 * Replaces target unit-cell bodies with validated matrix cell bodies.
 *
 * @param tableNode - Expanded or original target table.
 * @param sourceTable - Validated temporary unit-cell source table.
 * @param options - Matrix target coordinates.
 * @returns Updated target table or a merge-related failure.
 */
function fillMatrixBodies(
  tableNode: PMNode,
  sourceTable: PMNode,
  options: PasteWordTableMatrixIntoTableOptions
): WordTableCommandResult<PMNode> {
  const map = createWordTableMap(tableNode);
  const updates = new Map<string, PMNode>();

  for (let rowOffset = 0; rowOffset < sourceTable.childCount; rowOffset += 1) {
    const sourceRow = sourceTable.child(rowOffset);
    for (let columnOffset = 0; columnOffset < sourceRow.childCount; columnOffset += 1) {
      const rowIndex = options.startRow + rowOffset;
      const columnIndex = options.startColumn + columnOffset;
      const semantic = map.cellAt(rowIndex, columnIndex);
      if (
        !semantic
        || semantic.rect.startRow !== rowIndex
        || semantic.rect.startColumn !== columnIndex
        || semantic.rect.rowSpan !== 1
        || semantic.rect.columnSpan !== 1
      ) {
        return wordTableCommandFailure("unsupported-merge");
      }
      const explicit = map.explicitCells.find((cell) =>
        cell.id === semantic.originExplicitCellId
      );
      if (!explicit) return wordTableCommandFailure("invalid-selection");
      updates.set(`${explicit.rowIndex}:${explicit.cellIndex}`, sourceRow.child(columnOffset));
    }
  }

  let changed = false;
  const rows = tableNode.children.map((row, rowIndex) => {
    const cells = row.children.map((cell, cellIndex) => {
      const sourceCell = updates.get(`${rowIndex}:${cellIndex}`);
      if (!sourceCell || cell.content.eq(sourceCell.content)) return cell;
      changed = true;
      return cell.type.create(cell.attrs, sourceCell.content, cell.marks);
    });
    return cells.every((cell, index) => cell === row.child(index))
      ? row
      : cloneRowWithAttrs(row, {}, cells);
  });

  return wordTableCommandSuccess(
    changed ? cloneTableWithRows(tableNode, {}, rows) : tableNode
  );
}
