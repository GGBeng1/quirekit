import { containsQuirePoint } from "@quirekit/renderer";
import {
  findQuireTableHitTargetAtPoint,
  findQuireTableRowOffsetSlotAtPoint
} from "../../../table";
import type { QuireTableCellLayoutHitOptions } from "./types";

/**
 * Reports whether a point is inside table-owned structural geometry that is not
 * an editable table cell.
 *
 * Word row offsets and separated-cell gaps can occupy visual table space without
 * being document cells. They must block generic block-position mapping so a
 * click in that space does not jump to an unrelated table position.
 *
 * @param options - Snapshot, point, and current normal-flow candidate node.
 * @returns Whether the point is inside non-cell table geometry.
 */
export function isQuireTableStructuralGapAtPoint(
  options: QuireTableCellLayoutHitOptions
): boolean {
  if (
    options.candidateNode?.table === undefined ||
    !containsQuirePoint(options.candidateNode.table.rect, options.point)
  ) {
    return false;
  }

  if (
    findQuireTableRowOffsetSlotAtPoint({
      table: options.candidateNode.table,
      point: options.point
    }) !== null
  ) {
    return false;
  }

  return findQuireTableHitTargetAtPoint({
    hitTargets: options.snapshot.hitTargets,
    point: options.point
  }) === null;
}
