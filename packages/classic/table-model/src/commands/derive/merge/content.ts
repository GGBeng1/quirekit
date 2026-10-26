import { Fragment, type Node as PMNode } from "@quirekit/pm";
import type {
  WordTableExplicitCellRef,
  WordTableSemanticCellRef
} from "../../../map";

/**
 * Collects explicit ids owned by semantic cells.
 *
 * @param semanticCells - Semantic cells consumed by a merge.
 * @returns Explicit cell ids.
 */
export function collectAffectedExplicitIds(
  semanticCells: readonly WordTableSemanticCellRef[]
): ReadonlySet<string> {
  const affectedExplicitIds = new Set<string>();

  for (const semanticCell of semanticCells) {
    affectedExplicitIds.add(semanticCell.originExplicitCellId);

    for (const explicitCellId of semanticCell.continuationExplicitCellIds) {
      affectedExplicitIds.add(explicitCellId);
    }
  }

  return affectedExplicitIds;
}

/**
 * Collects row/cell keys from explicit ids.
 *
 * @param explicitCellIds - Explicit cell ids.
 * @param explicitCellsById - Explicit cell lookup.
 * @returns Row/cell keys.
 */
export function collectAffectedCellKeys(
  explicitCellIds: ReadonlySet<string>,
  explicitCellsById: ReadonlyMap<string, WordTableExplicitCellRef>
): ReadonlySet<string> {
  const affectedCellKeys = new Set<string>();

  for (const explicitCellId of explicitCellIds) {
    const explicitCell = explicitCellsById.get(explicitCellId);

    if (explicitCell) {
      affectedCellKeys.add(getCellKey(explicitCell.rowIndex, explicitCell.cellIndex));
    }
  }

  return affectedCellKeys;
}

/**
 * Collects origin content from merged cells in source order.
 *
 * @param tableNode - Source table node.
 * @param semanticCells - Semantic cells consumed by the merge.
 * @param explicitCellsById - Explicit cell lookup.
 * @param originSemanticCellId - Semantic id of the merge origin.
 * @returns Merged cell content.
 */
export function collectMergedContent(
  tableNode: PMNode,
  semanticCells: readonly WordTableSemanticCellRef[],
  explicitCellsById: ReadonlyMap<string, WordTableExplicitCellRef>,
  originSemanticCellId: string
): Fragment {
  let content = Fragment.empty;

  for (const semanticCell of semanticCells) {
    const explicitCell = explicitCellsById.get(semanticCell.originExplicitCellId);

    if (!explicitCell) {
      continue;
    }

    const cell = getExplicitCellNode(tableNode, explicitCell);

    if (semanticCell.id === originSemanticCellId || explicitCell.hasMeaningfulContent) {
      content = content.append(cell.content);
    }
  }

  return content;
}

/**
 * Sorts semantic cells in source-grid order.
 *
 * @param cells - Semantic cells to sort.
 * @returns Sorted cells.
 */
export function sortSemanticCells(
  cells: readonly WordTableSemanticCellRef[]
): readonly WordTableSemanticCellRef[] {
  return [...cells].sort((left, right) =>
    left.rect.startRow - right.rect.startRow ||
    left.rect.startColumn - right.rect.startColumn
  );
}

/**
 * Gets a source cell node from an explicit cell ref.
 *
 * @param tableNode - Source table node.
 * @param explicitCell - Explicit cell ref.
 * @returns Source cell node.
 */
export function getExplicitCellNode(
  tableNode: PMNode,
  explicitCell: WordTableExplicitCellRef
): PMNode {
  return tableNode.child(explicitCell.rowIndex).child(explicitCell.cellIndex);
}

/**
 * Creates a stable row/cell key.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Source cell index.
 * @returns Row/cell key.
 */
export function getCellKey(rowIndex: number, cellIndex: number): string {
  return `${rowIndex}:${cellIndex}`;
}
