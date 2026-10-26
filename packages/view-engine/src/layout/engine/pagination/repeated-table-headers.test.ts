import { describe, expect, it } from "vitest";
import type { QuirePageEndInfo } from "@quirekit/layout/pagination";
import type { QuireTableLayoutSnapshot } from "../table";
import {
  createQuireRepeatedTableHeaderState,
  createQuireRepeatedTableHeaderPageLeadingBand,
  readQuireRepeatedTableHeaderState
} from "./repeated-table-headers";

describe("canvas repeated table header state", () => {
  it("builds repeated header state from header rows", () => {
    expect(createQuireRepeatedTableHeaderState(createTable({
      rows: [
        createRow({ rowIndex: 0, y: 0, height: 12, isHeader: true }),
        createRow({ rowIndex: 1, y: 12, height: 16, isHeader: true }),
        createRow({ rowIndex: 2, y: 28, height: 20, isHeader: false })
      ]
    }))).toEqual({
      tableId: "wordTable-0",
      rowIndexes: [0, 1],
      rows: [
        {
          rowIndex: 0,
          sourceRowId: "row:r0",
          range: { from: 10, to: 20 },
          height: 12
        },
        {
          rowIndex: 1,
          sourceRowId: "row:r1",
          range: { from: 20, to: 30 },
          height: 16
        }
      ],
      height: 28
    });
  });

  it("skips state when a table has no header rows", () => {
    expect(createQuireRepeatedTableHeaderState(createTable({
      rows: [
        createRow({ rowIndex: 0, y: 0, height: 12, isHeader: false })
      ]
    }))).toBeUndefined();
  });

  it("round-trips repeated header state through page end info", () => {
    const endInfo: QuirePageEndInfo = { openMarks: [], openNodes: [] };
    const state = {
      tableId: "wordTable-0",
      rowIndexes: [0],
      rows: [
        {
          rowIndex: 0,
          sourceRowId: "row:r0",
          range: { from: 10, to: 20 },
          height: 12
        }
      ],
      height: 12
    };
    const band = createQuireRepeatedTableHeaderPageLeadingBand(state);
    const next: QuirePageEndInfo = {
      ...endInfo,
      continuationState: band.continuationState
    };

    expect(band.id).toBe("repeated-table-header:wordTable-0");
    expect(band.height).toBe(12);
    expect(readQuireRepeatedTableHeaderState(next, "wordTable-0")).toEqual(state);
    expect(readQuireRepeatedTableHeaderState(next, "other-table")).toBeNull();
  });
});

/**
 * Creates a table snapshot fixture.
 *
 * @param options - Table rows.
 * @returns Table snapshot fixture.
 */
function createTable(options: {
  /** Table rows. */
  readonly rows: QuireTableLayoutSnapshot["rows"];
}): QuireTableLayoutSnapshot {
  return {
    tableId: "wordTable-0",
    fragmentId: "wordTable-0",
    geometryId: "wordTable-0",
    tableRange: { from: 10, to: 60 },
    style: {
      backgroundColor: null,
      borderColor: "#cbd5e1",
      borderWidth: 1
    },
    borders: null,
    rect: { x: 0, y: 0, width: 100, height: 80 },
    tracks: [],
    rows: options.rows,
    cells: [],
    hitTargets: []
  };
}

/**
 * Creates a table row fixture.
 *
 * @param options - Row index, y coordinate, height, and header flag.
 * @returns Table row fixture.
 */
function createRow(options: {
  /** Row index. */
  readonly rowIndex: number;
  /** Source-flow y coordinate. */
  readonly y: number;
  /** Row height. */
  readonly height: number;
  /** Whether the row is a repeated header source row. */
  readonly isHeader: boolean;
}): QuireTableLayoutSnapshot["rows"][number] {
  return {
    id: `wordTable-0:row-${options.rowIndex}`,
    sourceRowId: `row:r${options.rowIndex}`,
    rowIndex: options.rowIndex,
    isHeader: options.isHeader,
    cantSplit: false,
    range: { from: 10 + options.rowIndex * 10, to: 20 + options.rowIndex * 10 },
    rect: { x: 0, y: options.y, width: 100, height: options.height }
  };
}
