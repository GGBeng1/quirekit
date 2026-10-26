import { rangeToRect } from "../range";
import { createSemanticCellId } from "./ids";
import type {
  MutableExplicitCellRef,
  MutableSemanticCellRef
} from "./internal";
import type { WordTableSemanticCellRef } from "../types";

/**
 * Creates a semantic cell for an explicit origin.
 *
 * @param explicitCell - Explicit origin cell.
 * @param wellFormed - Whether the semantic cell starts well-formed.
 * @param semanticCells - Mutable semantic cell list.
 * @param semanticById - Mutable semantic cell lookup.
 * @returns Mutable semantic cell ref.
 */
export function createSemanticCell(
  explicitCell: MutableExplicitCellRef,
  wellFormed: boolean,
  semanticCells: MutableSemanticCellRef[],
  semanticById: Map<string, MutableSemanticCellRef>
): MutableSemanticCellRef {
  const semanticCell = {
    id: createSemanticCellId(explicitCell),
    originExplicitCellId: explicitCell.id,
    continuationExplicitCellIds: [],
    rect: rangeToRect(explicitCell.rowIndex, explicitCell.range),
    originCellPos: explicitCell.cellPos,
    gridSpan: explicitCell.range.columnSpan,
    wellFormed
  };

  explicitCell.semanticCellId = semanticCell.id;
  semanticCells.push(semanticCell);
  semanticById.set(semanticCell.id, semanticCell);

  return semanticCell;
}

/**
 * Freezes a mutable semantic cell into the public ref shape.
 *
 * @param cell - Mutable semantic cell.
 * @returns Public semantic cell ref.
 */
export function freezeSemanticCell(
  cell: MutableSemanticCellRef
): WordTableSemanticCellRef {
  return {
    ...cell,
    continuationExplicitCellIds: [...cell.continuationExplicitCellIds],
    rowSpan: cell.rect.rowSpan
  };
}
