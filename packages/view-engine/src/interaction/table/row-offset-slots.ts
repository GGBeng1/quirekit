import { containsQuirePoint } from "@quirekit/renderer";
import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import type {
  QuireTableLayoutSnapshot,
  QuireTableRowFragment
} from "../../layout";
import type { QuireTableRowOffsetSlotHit } from "../types";

/** Options used to find a Word row-offset table grid slot at a point. */
export interface QuireTableRowOffsetSlotAtPointOptions {
  /** Table layout snapshot whose row offsets should be tested. */
  readonly table: QuireTableLayoutSnapshot;
  /** Document-space point to test. */
  readonly point: QuirePoint;
}

/**
 * Finds a row-offset grid slot at a point.
 *
 * Word row offsets represent omitted leading or trailing grid columns in one
 * source row. They are spatial facts, not editable cells, so callers should use
 * the returned hit to choose a neighboring real-cell boundary instead of
 * materializing a source cell.
 *
 * @param options - Table layout snapshot and point to inspect.
 * @returns Row-offset slot hit, or null when the point is not in one.
 */
export function findQuireTableRowOffsetSlotAtPoint(
  options: QuireTableRowOffsetSlotAtPointOptions
): QuireTableRowOffsetSlotHit | null {
  for (const row of options.table.rows) {
    if (!containsQuirePoint(row.rect, options.point)) {
      continue;
    }

    const beforeSlot = findRowOffsetSlotAtPoint({
      table: options.table,
      row,
      side: "before",
      point: options.point
    });

    if (beforeSlot) {
      return beforeSlot;
    }

    const afterSlot = findRowOffsetSlotAtPoint({
      table: options.table,
      row,
      side: "after",
      point: options.point
    });

    if (afterSlot) {
      return afterSlot;
    }
  }

  return null;
}

/**
 * Finds a slot inside one row offset range.
 *
 * @param options - Table, row, side, and point to inspect.
 * @returns Row-offset slot for the matching grid column, or null.
 */
function findRowOffsetSlotAtPoint(options: {
  /** Table layout snapshot whose tracks define slot geometry. */
  readonly table: QuireTableLayoutSnapshot;
  /** Row fragment whose offset should be inspected. */
  readonly row: QuireTableRowFragment;
  /** Offset side to inspect. */
  readonly side: "before" | "after";
  /** Document-space point to test. */
  readonly point: QuirePoint;
}): QuireTableRowOffsetSlotHit | null {
  const offset = options.side === "before"
    ? options.row.gridBefore
    : options.row.gridAfter;

  if (offset === undefined || offset.columnSpan <= 0) {
    return null;
  }

  const endColumn = offset.startColumn + offset.columnSpan;

  for (let columnIndex = offset.startColumn; columnIndex < endColumn; columnIndex += 1) {
    const track = options.table.tracks[columnIndex];

    if (track === undefined) {
      continue;
    }

    const rect = createRowTrackRect(options.row, track.x, track.width);

    if (!containsQuirePoint(rect, options.point)) {
      continue;
    }

    return {
      kind: "table-row-offset-slot",
      tableId: options.table.tableId,
      tableRange: options.table.tableRange,
      rowIndex: options.row.rowIndex,
      columnIndex,
      sourceKind: "row-offset",
      side: options.side,
      rect
    };
  }

  return null;
}

/**
 * Creates the document-space rectangle occupied by one row-local grid track.
 *
 * @param row - Row fragment that supplies vertical placement.
 * @param x - Horizontal track origin.
 * @param width - Horizontal track width.
 * @returns Slot rectangle in document coordinates.
 */
function createRowTrackRect(
  row: QuireTableRowFragment,
  x: number,
  width: number
): QuireRect {
  return {
    x,
    y: row.rect.y,
    width,
    height: row.rect.height
  };
}
