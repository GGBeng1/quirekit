import type { QuireTableHitTarget } from "../../../../layout";
import type {
  QuireHitTestResult,
  QuireTableCellSelectionHit
} from "../../../types";

/**
 * Retains structural table-cell identity on a position hit.
 *
 * Text shaping remains authoritative for the caret position, while this
 * sidecar preserves the cell coordinates needed if a later drag endpoint
 * crosses into another cell. The absolute table position is derived from the
 * canonical absolute cell range and its table-relative origin position.
 *
 * @param hit - Position or miss result produced by retained geometry.
 * @param target - Structural table-cell target at the same document point.
 * @returns Hit result decorated with structural table-cell facts.
 */
export function withQuireTableCellSelectionHit(
  hit: QuireHitTestResult,
  target: QuireTableHitTarget | null
): QuireHitTestResult {
  if (hit.kind === "miss" || target === null) {
    return hit;
  }

  const tableCell: QuireTableCellSelectionHit = {
    tableId: target.tableId,
    tablePos: target.range.from - target.originCellPos,
    semanticCellId: target.semanticCellId,
    originCellPos: target.originCellPos,
    range: target.range,
    rect: target.rect,
    ...(target.isRepeatedHeader === undefined
      ? {}
      : { isRepeatedHeader: target.isRepeatedHeader })
  };

  return { ...hit, tableCell };
}
