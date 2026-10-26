import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import type { WordTableCommandResult } from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";
import { promoteOrphanVerticalMergeContinuations } from "./continuation";

/**
 * Repairs vertical merge metadata for well-formed merge chains.
 *
 * @param tableNode - Source table node.
 * @returns Command result containing the repaired table node.
 */
export function repairWordTableVerticalMerges(
  tableNode: PMNode
): WordTableCommandResult<PMNode> {
  const promotedTable = promoteOrphanVerticalMergeContinuations(tableNode);
  const map = createWordTableMap(promotedTable);
  const blockingDiagnostics = map.diagnostics.filter((diagnostic) =>
    diagnostic.code !== "grid-span-colspan-mismatch"
  );

  if (blockingDiagnostics.length > 0) {
    return wordTableCommandFailure("malformed-table", blockingDiagnostics);
  }

  return wordTableCommandSuccess(synchronizeVerticalMergeProjection(
    promotedTable,
    map
  ));
}

/**
 * Synchronizes derived `rowspan` with a diagnostic-free vertical source map.
 *
 * @param tableNode - Source table node.
 * @param map - Derived diagnostic-free table map.
 * @returns Table with synchronized vertical merge projection.
 */
function synchronizeVerticalMergeProjection(
  tableNode: PMNode,
  map: ReturnType<typeof createWordTableMap>
): PMNode {
  const semanticCellsById = new Map(
    map.semanticCells.map((cell) => [cell.id, cell] as const)
  );
  const explicitCellsByKey = new Map(
    map.explicitCells.map((cell) =>
      [`${cell.rowIndex}:${cell.cellIndex}`, cell] as const
    )
  );
  const rows = tableNode.children.map((row, rowIndex) =>
    cloneRowWithAttrs(row, {}, row.children.map((cell, cellIndex) => {
      const explicitCell = explicitCellsByKey.get(`${rowIndex}:${cellIndex}`);
      const semanticCell = explicitCell?.semanticCellId
        ? semanticCellsById.get(explicitCell.semanticCellId)
        : null;

      if (!explicitCell || !semanticCell) return cell;
      return cloneCellWithAttrs(cell, {
        rowspan: semanticCell.originExplicitCellId === explicitCell.id
          ? semanticCell.rowSpan
          : 1,
        vMerge: semanticCell.originExplicitCellId === explicitCell.id
          ? semanticCell.rowSpan > 1 ? "restart" : null
          : "continue"
      });
    }))
  );

  return cloneTableWithRows(tableNode, {}, rows);
}
