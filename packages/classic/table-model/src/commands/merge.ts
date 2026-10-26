import type { Node as PMNode } from "@quirekit/pm";
import {
  createWordTableMap,
} from "../map";
import {
  createMergePlan,
} from "./derive/merge/plan";
import {
  isRectInsideMap,
  normalizeMergeRect,
  rectContainsOnlyCells,
} from "./derive/grid/rect";
import { cloneTableWithRows } from "./derive/node/clone";
import { prepareWordTableCommand } from "./repair";
import type {
  MergeWordTableCellsOptions,
  WordTableCommandResult,
} from "./types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess,
} from "./types";

/**
 * Merges a rectangular Word table region into one semantic cell.
 *
 * @param tableNode - Source table node.
 * @param options - Merge rectangle options.
 * @returns Command result containing the updated table node.
 */
export function mergeWordTableCells(
  tableNode: PMNode,
  options: MergeWordTableCellsOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const requestedRect = normalizeMergeRect(options);

  if (!requestedRect || !isRectInsideMap(map, requestedRect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rect = map.expandRectToMergedCells(requestedRect);

  if (!isRectInsideMap(map, rect) || !rectContainsOnlyCells(map, rect)) {
    return wordTableCommandFailure("unsupported-merge");
  }

  const plan = createMergePlan(sourceTable, map, rect);

  if (!plan) {
    return wordTableCommandFailure("invalid-selection");
  }

  return wordTableCommandSuccess(
    cloneTableWithRows(sourceTable, {}, plan.rows),
    prepared.value.repair
  );
}
