import type { Node as PMNode } from "@quirekit/pm";
import {
  createWordTableMap,
  type WordTableSemanticCellRef
} from "../../../map";
import type { WordTableBorder, WordTableBorders } from "../../../types";
import type { OrthogonalBorderName } from "./topology";

const emptyBorders: WordTableBorders = Object.freeze({
  top: null,
  right: null,
  bottom: null,
  left: null,
  insideH: null,
  insideV: null,
  tl2br: null,
  tr2bl: null
});

/**
 * Writes one direct physical edge while preserving every unrelated cell attr.
 *
 * @param pending - Pending complete border tuples by semantic cell id.
 * @param tableNode - Source Table node.
 * @param map - Derived semantic Table map.
 * @param cell - Semantic cell receiving the direct edge.
 * @param edge - Physical edge to replace.
 * @param border - Visible or explicit non-painting border value.
 */
export function writeSemanticBorderEdge(
  pending: Map<string, WordTableBorders>,
  tableNode: PMNode,
  map: ReturnType<typeof createWordTableMap>,
  cell: WordTableSemanticCellRef,
  edge: OrthogonalBorderName,
  border: WordTableBorder
): void {
  const current = pending.get(cell.id)
    ?? readSemanticCellBorders(tableNode, map, cell);
  pending.set(cell.id, { ...current, [edge]: border });
}

/**
 * Checks whether a source Table already declares any border authority.
 *
 * @param tableNode - Source Table node.
 * @returns Whether Table, row, or cell border metadata is present.
 */
export function hasAnyBorderMetadata(tableNode: PMNode): boolean {
  if (tableNode.attrs.borders !== null && tableNode.attrs.borders !== undefined) {
    return true;
  }

  return tableNode.children.some((row) =>
    (row.attrs.borders !== null && row.attrs.borders !== undefined)
    || row.children.some((cell) =>
      cell.attrs.borders !== null && cell.attrs.borders !== undefined
    )
  );
}

/**
 * Reads the origin cell's current border tuple.
 *
 * @param tableNode - Source Table node.
 * @param map - Derived Table map.
 * @param semanticCell - Semantic cell whose origin owns formatting authority.
 * @returns Current complete border tuple.
 */
function readSemanticCellBorders(
  tableNode: PMNode,
  map: ReturnType<typeof createWordTableMap>,
  semanticCell: WordTableSemanticCellRef
): WordTableBorders {
  const origin = map.explicitCells.find(
    cell => cell.id === semanticCell.originExplicitCellId
  );
  const value = origin
    ? tableNode.maybeChild(origin.rowIndex)?.maybeChild(origin.cellIndex)
      ?.attrs.borders
    : null;

  return isWordTableBorders(value) ? value : emptyBorders;
}

/**
 * Checks whether an unknown attr is one complete border tuple.
 *
 * @param value - Attr value to inspect.
 * @returns Whether the value carries the required orthogonal fields.
 */
function isWordTableBorders(value: unknown): value is WordTableBorders {
  return typeof value === "object"
    && value !== null
    && "top" in value
    && "right" in value
    && "bottom" in value
    && "left" in value;
}
