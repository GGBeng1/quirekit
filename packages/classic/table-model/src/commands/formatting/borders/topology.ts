import {
  createWordTableMap,
  type WordTableGridRect,
  type WordTableSemanticCellRef
} from "../../../map";
import type { WordTableBorder } from "../../../types";
import type { SetWordTableCellBordersOptions } from "../../types";

/** Physical Table edge addressable by cell-border authoring. */
export type OrthogonalBorderName = "top" | "right" | "bottom" | "left";

const orthogonalBorderNames = Object.freeze([
  "top",
  "right",
  "bottom",
  "left"
] as const satisfies readonly OrthogonalBorderName[]);

/** Opposite owner edge for one shared physical Table line. */
export const oppositeBorderName: Readonly<Record<
  OrthogonalBorderName,
  OrthogonalBorderName
>> = Object.freeze({
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
});

/** Explicit non-painting border used instead of inherited-value `null`. */
export const explicitNilBorder: WordTableBorder = Object.freeze({
  style: "nil",
  size: null,
  color: null,
  space: null,
  shadow: null,
  frame: null
});

/**
 * Resolves the physical edges addressed by one selection-relative preset.
 *
 * @param cell - Selected semantic cell.
 * @param selection - Expanded selected rectangle.
 * @param preset - Requested topology preset.
 * @returns Physical edges the preset must update on this cell.
 */
export function resolvePresetEdges(
  cell: WordTableSemanticCellRef,
  selection: WordTableGridRect,
  preset: SetWordTableCellBordersOptions["preset"]
): readonly OrthogonalBorderName[] {
  const selectionBottom = selection.startRow + selection.rowSpan;
  const selectionRight = selection.startColumn + selection.columnSpan;
  const cellBottom = cell.rect.startRow + cell.rect.rowSpan;
  const cellRight = cell.rect.startColumn + cell.rect.columnSpan;
  const onTop = cell.rect.startRow === selection.startRow;
  const onBottom = cellBottom === selectionBottom;
  const onLeft = cell.rect.startColumn === selection.startColumn;
  const onRight = cellRight === selectionRight;

  switch (preset) {
    case "none":
    case "all":
      return orthogonalBorderNames;
    case "outside":
      return orthogonalBorderNames.filter((edge) =>
        (edge === "top" && onTop)
        || (edge === "right" && onRight)
        || (edge === "bottom" && onBottom)
        || (edge === "left" && onLeft)
      );
    case "inside":
      return orthogonalBorderNames.filter((edge) =>
        (edge === "top" && !onTop)
        || (edge === "right" && !onRight)
        || (edge === "bottom" && !onBottom)
        || (edge === "left" && !onLeft)
      );
    case "top":
      return onTop ? ["top"] : [];
    case "right":
      return onRight ? ["right"] : [];
    case "bottom":
      return onBottom ? ["bottom"] : [];
    case "left":
      return onLeft ? ["left"] : [];
  }
}

/**
 * Finds semantic cells sharing one physical edge with a source cell.
 *
 * Merged-cell edges may touch several smaller neighbors, so the lookup walks
 * every grid slot along the edge and deduplicates semantic owners.
 *
 * @param map - Derived semantic Table map.
 * @param cell - Source semantic cell.
 * @param edge - Physical edge whose opposite owners are requested.
 * @returns Adjacent semantic cells in stable grid order.
 */
export function findAdjacentSemanticCells(
  map: ReturnType<typeof createWordTableMap>,
  cell: WordTableSemanticCellRef,
  edge: OrthogonalBorderName
): readonly WordTableSemanticCellRef[] {
  const neighbors = new Map<string, WordTableSemanticCellRef>();
  const bottom = cell.rect.startRow + cell.rect.rowSpan;
  const right = cell.rect.startColumn + cell.rect.columnSpan;

  if (edge === "top" || edge === "bottom") {
    const row = edge === "top" ? cell.rect.startRow - 1 : bottom;
    for (let column = cell.rect.startColumn; column < right; column += 1) {
      addAdjacentCell(map, neighbors, cell.id, row, column);
    }
  } else {
    const column = edge === "left" ? cell.rect.startColumn - 1 : right;
    for (let row = cell.rect.startRow; row < bottom; row += 1) {
      addAdjacentCell(map, neighbors, cell.id, row, column);
    }
  }

  return [...neighbors.values()];
}

/**
 * Adds one valid adjacent semantic cell to a deduplicated result map.
 *
 * @param map - Derived semantic Table map.
 * @param neighbors - Mutable result map.
 * @param sourceId - Semantic id that must not be returned as its own neighbor.
 * @param row - Grid row to inspect.
 * @param column - Grid column to inspect.
 */
function addAdjacentCell(
  map: ReturnType<typeof createWordTableMap>,
  neighbors: Map<string, WordTableSemanticCellRef>,
  sourceId: string,
  row: number,
  column: number
): void {
  const neighbor = map.cellAt(row, column);
  if (neighbor && neighbor.id !== sourceId) {
    neighbors.set(neighbor.id, neighbor);
  }
}
