import type { QuirePoint } from "@quirekit/renderer";
import type { QuireTableCellFragment } from "../../../../layout";
import {
  mapQuireEditableTextHitTargetPointToCaret
} from "../../../text";
import type {
  QuireHitTestResult,
  QuireTableRowOffsetSlotHit
} from "../../../types";
import {
  readQuireLayoutHitCandidateNodesAtPoint
} from "../query-candidates";
import type { QuireTableRowOffsetSlotCaretOptions } from "./types";

const tableGeometryEpsilon = 0.001;

/**
 * Maps a row-offset slot to the nearest editable boundary of the adjacent cell.
 *
 * @param options - Layout snapshot, table snapshot, slot, and pointer point.
 * @returns Position hit for the adjacent real cell boundary, or null when no cell exists.
 */
export function mapQuireTableRowOffsetSlotToAdjacentCellCaret(
  options: QuireTableRowOffsetSlotCaretOptions
): QuireHitTestResult | null {
  const targetCell = findAdjacentQuireTableCellForRowOffsetSlot(
    options.table,
    options.slot
  );

  if (targetCell === null) {
    return null;
  }

  const edgePoint = createQuireTableCellBoundaryPoint({
    cell: targetCell,
    point: options.point,
    side: options.slot.side
  });
  const textTarget = mapQuireEditableTextHitTargetPointToCaret({
    nodes: readQuireLayoutHitCandidateNodesAtPoint({
      snapshot: options.snapshot,
      point: edgePoint,
      fallbackToAllEntries: true
    }),
    range: targetCell.range,
    rect: targetCell.rect,
    point: edgePoint
  });

  if (textTarget !== null) {
    return {
      kind: "position",
      ...textTarget,
      tableRowOffsetSlot: options.slot
    };
  }

  return {
    kind: "position",
    position: options.slot.side === "before"
      ? { pos: targetCell.range.from + 1, bias: 1 }
      : { pos: targetCell.range.to, bias: -1 },
    inside: targetCell.range.from,
    rect: targetCell.rect,
    tableRowOffsetSlot: options.slot
  };
}

/**
 * Finds the real cell adjacent to a row-offset slot.
 *
 * @param table - Table snapshot containing cells and row-offset metadata.
 * @param slot - Row-offset slot to map.
 * @returns Adjacent real cell, or null when the row has no neighbor on that side.
 */
function findAdjacentQuireTableCellForRowOffsetSlot(
  table: QuireTableRowOffsetSlotCaretOptions["table"],
  slot: QuireTableRowOffsetSlotHit
): QuireTableCellFragment | null {
  const rowCells = table.cells.filter((cell) =>
    doesQuireTableCellCoverRowIndex(cell, slot.rowIndex)
  );

  if (slot.side === "before") {
    return rowCells
      .filter((cell) => cell.gridRect.startColumn >= slot.columnIndex)
      .sort((left, right) => left.rect.x - right.rect.x)[0] ?? null;
  }

  return rowCells
    .filter((cell) =>
      cell.gridRect.startColumn + cell.gridRect.columnSpan <= slot.columnIndex
    )
    .sort((left, right) =>
      (right.rect.x + right.rect.width) - (left.rect.x + left.rect.width)
    )[0] ?? null;
}

/**
 * Checks whether a table cell covers a source row index.
 *
 * @param cell - Cell fragment to inspect.
 * @param rowIndex - Source row index to test.
 * @returns Whether the cell spans the row.
 */
function doesQuireTableCellCoverRowIndex(
  cell: QuireTableCellFragment,
  rowIndex: number
): boolean {
  return cell.gridRect.startRow <= rowIndex &&
    rowIndex < cell.gridRect.startRow + cell.gridRect.rowSpan;
}

/**
 * Creates a cell-edge point used to refine caret placement inside the target cell.
 *
 * @param options - Target cell, original point, and row-offset side.
 * @returns Document-space point on the target cell content boundary.
 */
function createQuireTableCellBoundaryPoint(options: {
  /** Real cell that should receive the caret. */
  readonly cell: QuireTableCellFragment;
  /** Original document-space pointer point. */
  readonly point: QuirePoint;
  /** Row-offset side that determines the target cell edge. */
  readonly side: QuireTableRowOffsetSlotHit["side"];
}): QuirePoint {
  const edgeX = options.side === "before"
    ? options.cell.contentRect.x
    : options.cell.contentRect.x + options.cell.contentRect.width;

  return {
    x: edgeX,
    y: clampQuireTableCoordinate(
      options.point.y,
      options.cell.contentRect.y,
      options.cell.contentRect.y + options.cell.contentRect.height
    )
  };
}

/**
 * Clamps one coordinate to a visible table-cell interval.
 *
 * @param value - Coordinate to clamp.
 * @param min - Minimum accepted coordinate.
 * @param max - Maximum accepted coordinate.
 * @returns Coordinate inside the interval.
 */
function clampQuireTableCoordinate(
  value: number,
  min: number,
  max: number
): number {
  if (value < min) {
    return min + tableGeometryEpsilon;
  }

  if (value > max) {
    return max - tableGeometryEpsilon;
  }

  return value;
}
