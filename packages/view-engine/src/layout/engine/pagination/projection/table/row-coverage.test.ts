import { describe, expect, it } from "vitest";
import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../../table";
import {
  createQuireTableRowsFlowClip,
  doesQuireTableCellCoverAnyRowIndex,
  filterQuireTableRowsCoveredByCell
} from "./row-coverage";

describe("table row coverage projection primitives", () => {
  it("filters rows covered by a row-spanning cell", () => {
    const rows = [
      createRow({ rowIndex: 0, y: 10 }),
      createRow({ rowIndex: 1, y: 40 }),
      createRow({ rowIndex: 2, y: 70 })
    ];
    const cell = createCell({ startRow: 1, rowSpan: 2 });

    expect(
      filterQuireTableRowsCoveredByCell(cell, rows).map((row) => row.rowIndex)
    ).toEqual([1, 2]);
  });

  it("checks whether a cell covers any requested row index", () => {
    const cell = createCell({ startRow: 2, rowSpan: 3 });

    expect(doesQuireTableCellCoverAnyRowIndex(cell, [0, 1])).toBe(false);
    expect(doesQuireTableCellCoverAnyRowIndex(cell, [0, 3])).toBe(true);
  });

  it("creates a source-flow band from covered rows", () => {
    expect(createQuireTableRowsFlowClip([
      createRow({ rowIndex: 1, y: 40, height: 18 }),
      createRow({ rowIndex: 2, y: 70, height: 22 })
    ])).toEqual({ top: 40, bottom: 92 });
    expect(createQuireTableRowsFlowClip([])).toBeNull();
  });
});

/**
 * Creates a table row fragment for row coverage tests.
 *
 * @param options - Row index and vertical geometry.
 * @returns Row fragment fixture.
 */
function createRow(options: {
  /** Row index in the source table grid. */
  readonly rowIndex: number;
  /** Row top in source-flow coordinates. */
  readonly y: number;
  /** Row height in source-flow coordinates. */
  readonly height?: number | undefined;
}): QuireTableRowFragment {
  const height = options.height ?? 20;

  return {
    id: `row-${options.rowIndex}`,
    sourceRowId: `source-row-${options.rowIndex}`,
    rowIndex: options.rowIndex,
    isHeader: false,
    cantSplit: false,
    range: {
      from: options.rowIndex * 10 + 1,
      to: options.rowIndex * 10 + 9
    },
    rect: { x: 0, y: options.y, width: 200, height }
  };
}

/**
 * Creates a table cell fragment for row coverage tests.
 *
 * @param options - Source-grid row span.
 * @returns Cell fragment fixture.
 */
function createCell(options: {
  /** First source row covered by the cell. */
  readonly startRow: number;
  /** Number of source rows covered by the cell. */
  readonly rowSpan: number;
}): QuireTableCellFragment {
  return {
    id: "cell",
    semanticCellId: "semantic-cell",
    originExplicitCellId: "explicit-cell",
    explicitCellIds: ["explicit-cell"],
    originCellPos: 1,
    range: { from: 1, to: 9 },
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    gridRect: {
      startRow: options.startRow,
      startColumn: 0,
      rowSpan: options.rowSpan,
      columnSpan: 1
    },
    rect: { x: 0, y: 0, width: 200, height: 40 },
    contentRect: { x: 5, y: 5, width: 190, height: 30 },
    contentChildren: []
  };
}
