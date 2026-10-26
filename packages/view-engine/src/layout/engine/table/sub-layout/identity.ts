import type { QuireTableCellFragment } from "../types";
import type { QuireTableCellSliceIdentity } from "./types";

/**
 * Creates the stable identity shared by table-cell pagination summaries.
 *
 * @param cell - Table-cell fragment represented by the slice.
 * @returns Stable identity fields for recursive cell pagination contracts.
 */
export function createQuireTableCellSliceIdentity(
  cell: QuireTableCellFragment
): QuireTableCellSliceIdentity {
  return {
    cellId: cell.id,
    semanticCellId: cell.semanticCellId,
    originExplicitCellId: cell.originExplicitCellId,
    explicitCellIds: cell.explicitCellIds,
    originCellPos: cell.originCellPos,
    gridRect: cell.gridRect
  };
}
