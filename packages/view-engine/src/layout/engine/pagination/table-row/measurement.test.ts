import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../types";
import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../table";
import {
  createQuireTableCellSourceSubLayoutProjectionMap,
  createQuireTableCellSubLayoutRootMap,
  type QuireTableCellSubLayoutProjectionMap
} from "../../table/sub-layout";
import {
  collectQuireTableCellRowLineSlices,
  type QuireTableCellRowLineSlice
} from "../table-cell";
import {
  createQuireTableRowMeasuredLineSlicesFromCellLineSlices
} from "./measurement";
import type { QuireTableRowMeasuredLineSlice } from "./measurement";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../../test-support/layout/table-cell-sub-layout";

describe("canvas table-row measured source", () => {
  it("merges overlapping row-local line bands from parallel cells", () => {
    const row = createRow({
      rect: { x: 0, y: 10, width: 200, height: 60 },
      range: { from: 10, to: 60 }
    });
    const leftCell = createCell({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 10, width: 100, height: 60 },
      contentRect: { x: 0, y: 10, width: 100, height: 60 },
      startColumn: 0
    });
    const rightCell = createCell({
      id: "wordTable-0:cell-0-1",
      range: { from: 21, to: 30 },
      rect: { x: 100, y: 10, width: 100, height: 60 },
      contentRect: { x: 100, y: 10, width: 100, height: 60 },
      startColumn: 1
    });
    const table = createTable({
      row,
      cells: [leftCell, rightCell],
      children: [
        createCellBox(leftCell, [
          createFragment({ id: "left-line", range: { from: 12, to: 16 }, y: 20 })
        ]),
        createCellBox(rightCell, [
          createFragment({ id: "right-line", range: { from: 22, to: 26 }, y: 28 })
        ])
      ]
    });

    const slices = createMeasuredLineSlicesFromSubLayoutResults({
      row,
      cells: table.table?.cells ?? [],
      subLayoutProjectionByCellId: createSubLayoutResultMap(
        table.table?.cells ?? [],
        table.children
      )
    });

    expect(slices).toEqual([
      {
        range: { from: 10, to: 60 },
        top: 10,
        bottom: 70,
        cellLineSlices: expect.any(Array)
      }
    ]);
    expect(slices[0]?.cellLineSlices?.map((slice) => slice.cellId)).toEqual([
      "wordTable-0:cell-0-0",
      "wordTable-0:cell-0-1"
    ]);
  });

  it("lets a baseline-owned continuation line consume its full line height", () => {
    const row = createRow({
      rect: { x: 0, y: 30, width: 100, height: 8 },
      range: { from: 30, to: 40 }
    });
    const cell = createCell({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 30, width: 100, height: 8 },
      contentRect: { x: 0, y: 30, width: 100, height: 8 },
      startColumn: 0
    });
    const table = createTable({
      row,
      cells: [cell],
      children: [
        createCellBox(cell, [
          createFragment({
            id: "continuation-line",
            range: { from: 12, to: 16 },
            y: 24,
            height: 16,
            baseline: 34
          })
        ])
      ]
    });

    expect(createMeasuredLineSlicesFromSubLayoutResults({
      row,
      cells: table.table?.cells ?? [],
      subLayoutProjectionByCellId: createSubLayoutResultMap(
        table.table?.cells ?? [],
        table.children
      )
    })).toEqual([
      {
        range: { from: 30, to: 40 },
        top: 30,
        bottom: 46,
        cellLineSlices: expect.any(Array)
      }
    ]);
  });

  it("measures explicit cell-line summaries without depending on input order", () => {
    const row = createRow({
      rect: { x: 0, y: 10, width: 200, height: 60 },
      range: { from: 10, to: 60 }
    });
    const leftLine = createCellLineSlice({
      cellId: "wordTable-0:cell-0-0",
      cellRange: { from: 11, to: 20 },
      contentRect: { x: 0, y: 10, width: 100, height: 60 },
      from: 12,
      to: 16,
      top: 20,
      bottom: 32
    });
    const rightLine = createCellLineSlice({
      cellId: "wordTable-0:cell-0-1",
      cellRange: { from: 21, to: 30 },
      contentRect: { x: 100, y: 10, width: 100, height: 60 },
      from: 22,
      to: 26,
      top: 28,
      bottom: 40
    });

    expect(
      createQuireTableRowMeasuredLineSlicesFromCellLineSlices(row, [
        rightLine,
        leftLine
      ])
    ).toEqual([
      {
        range: { from: 10, to: 60 },
        top: 10,
        bottom: 70,
        cellLineSlices: [leftLine, rightLine]
      }
    ]);
  });

  it("measures row slices from explicit table-cell sub-layout results", () => {
    const row = createRow({
      rect: { x: 0, y: 10, width: 200, height: 60 },
      range: { from: 10, to: 60 }
    });
    const leftCell = createCell({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 10, width: 100, height: 60 },
      contentRect: { x: 0, y: 10, width: 100, height: 60 },
      startColumn: 0
    });
    const rightCell = createCell({
      id: "wordTable-0:cell-0-1",
      range: { from: 21, to: 30 },
      rect: { x: 100, y: 10, width: 100, height: 60 },
      contentRect: { x: 100, y: 10, width: 100, height: 60 },
      startColumn: 1
    });

    expect(createMeasuredLineSlicesFromSubLayoutResults({
      row,
      cells: [rightCell, leftCell],
      subLayoutProjectionByCellId: createSubLayoutResultMap(
        [rightCell, leftCell],
        [
          createCellBox(leftCell, [
            createFragment({ id: "left-line", range: { from: 12, to: 16 }, y: 20 })
          ]),
          createCellBox(rightCell, [
            createFragment({ id: "right-line", range: { from: 22, to: 26 }, y: 28 })
          ])
        ]
      )
    })).toEqual([
      {
        range: { from: 10, to: 60 },
        top: 10,
        bottom: 70,
        cellLineSlices: expect.any(Array)
      }
    ]);
  });

  it("keeps row framework padding on the first and last line slices only", () => {
    const row = createRow({
      rect: { x: 0, y: 10, width: 100, height: 60 },
      range: { from: 10, to: 70 }
    });
    const cell = createCell({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 60 },
      rect: { x: 0, y: 10, width: 100, height: 60 },
      contentRect: { x: 0, y: 10, width: 100, height: 60 },
      startColumn: 0
    });
    const table = createTable({
      row,
      cells: [cell],
      children: [
        createCellBox(cell, [
          createFragment({
            id: "first-line",
            range: { from: 12, to: 16 },
            y: 20
          }),
          createFragment({
            id: "last-line",
            range: { from: 42, to: 46 },
            y: 40
          })
        ])
      ]
    });

    expect(createMeasuredLineSlicesFromSubLayoutResults({
      row,
      cells: table.table?.cells ?? [],
      subLayoutProjectionByCellId: createSubLayoutResultMap(
        table.table?.cells ?? [],
        table.children
      )
    })).toEqual([
      {
        range: { from: 10, to: 16 },
        top: 10,
        bottom: 32,
        cellLineSlices: expect.any(Array)
      },
      {
        range: { from: 42, to: 70 },
        top: 40,
        bottom: 70,
        cellLineSlices: expect.any(Array)
      }
    ]);
  });
});

/**
 * Creates a cell-owned line summary fixture.
 *
 * @param options - Cell identity, content band, document range, and line band.
 * @returns Cell-owned line summary fixture.
 */
function createCellLineSlice(options: {
  /** Cell fragment id. */
  readonly cellId: string;
  /** Cell content source range. */
  readonly cellRange: QuireTableCellFragment["range"];
  /** Cell content rectangle. */
  readonly contentRect: QuireRect;
  /** Line start document position. */
  readonly from: number;
  /** Line end document position. */
  readonly to: number;
  /** Line top in source-flow coordinates. */
  readonly top: number;
  /** Line bottom in source-flow coordinates. */
  readonly bottom: number;
}): QuireTableCellRowLineSlice {
  return {
    cellId: options.cellId,
    semanticCellId: `semantic:${options.cellId}`,
    originExplicitCellId: `explicit:${options.cellId}`,
    explicitCellIds: [`explicit:${options.cellId}`],
    originCellPos: options.cellRange.from,
    gridRect: {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1
    },
    cellRange: options.cellRange,
    contentRect: options.contentRect,
    from: options.from,
    to: options.to,
    top: options.top,
    bottom: options.bottom
  };
}

/**
 * Creates measured row slices from table-cell sub-layout results for
 * integration fixtures.
 *
 * @param options - Row, cells, and sub-layout results used to build summaries.
 * @returns Measured row slices produced from cell-owned line summaries.
 */
function createMeasuredLineSlicesFromSubLayoutResults(options: {
  /** Source row whose line slices are being measured. */
  readonly row: QuireTableRowFragment;
  /** Table cells that may visually cover the row. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Table-cell sub-layout results keyed by source cell id. */
  readonly subLayoutProjectionByCellId: QuireTableCellSubLayoutProjectionMap;
}): readonly QuireTableRowMeasuredLineSlice[] {
  return createQuireTableRowMeasuredLineSlicesFromCellLineSlices(
    options.row,
    collectQuireTableCellRowLineSlices(options)
  );
}

/**
 * Creates a table row fixture.
 *
 * @param options - Row rectangle and source range.
 * @returns Table row fragment fixture.
 */
function createRow(options: {
  /** Row rectangle in source-flow coordinates. */
  readonly rect: QuireRect;
  /** Row source range. */
  readonly range: QuireTableRowFragment["range"];
}): QuireTableRowFragment {
  return {
    id: "wordTable-0:row-0",
    sourceRowId: "row:r0",
    rowIndex: 0,
    isHeader: false,
    cantSplit: false,
    range: options.range,
    rect: options.rect
  };
}

/**
 * Creates a table cell fixture.
 *
 * @param options - Cell geometry, identity, and grid column.
 * @returns Table cell fragment fixture.
 */
function createCell(options: {
  /** Cell id. */
  readonly id: string;
  /** Cell source range. */
  readonly range: QuireTableCellFragment["range"];
  /** Full cell rectangle. */
  readonly rect: QuireRect;
  /** Cell content rectangle. */
  readonly contentRect: QuireRect;
  /** Grid start column. */
  readonly startColumn: number;
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: `semantic:${options.id}`,
    originExplicitCellId: `explicit:${options.id}`,
    explicitCellIds: [`explicit:${options.id}`],
    originCellPos: options.range.from,
    range: options.range,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: {
      startRow: 0,
      startColumn: options.startColumn,
      rowSpan: 1,
      columnSpan: 1
    },
    rect: options.rect,
    contentRect: options.contentRect,
    contentChildren: []
  };
}

/**
 * Creates table-cell sub-layout results for row-measurement fixtures.
 *
 * @param cells - Table-cell fragments that may own child flow.
 * @param children - Recursive child layout boxes under the table container.
 * @returns Sub-layout results keyed by source cell id.
 */
function createSubLayoutResultMap(
  cells: readonly QuireTableCellFragment[],
  children: readonly QuireLayoutBox[]
): QuireTableCellSubLayoutProjectionMap {
  return createQuireTableCellSourceSubLayoutProjectionMap({
    subLayoutRootByCellId: createQuireTableCellSubLayoutRootMap({
      cells,
      children,
      parentId: "wordTable-0",
      dependencySignaturePrefix: "test-table-row"
    })
  });
}

/**
 * Creates a table layout box fixture.
 *
 * @param options - Row, cells, and recursive cell child boxes.
 * @returns Table layout container fixture.
 */
function createTable(options: {
  /** Table row fragment. */
  readonly row: QuireTableRowFragment;
  /** Table cell fragments. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Recursive cell content boxes. */
  readonly children: readonly QuireLayoutBox[];
}): QuireLayoutContainer {
  const rect = options.row.rect;

  return {
    id: "wordTable-0:layout",
    range: { from: 10, to: 60 },
    rect,
    table: {
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
      rect,
      tracks: [],
      rows: [options.row],
      cells: options.cells,
      hitTargets: []
    },
    children: options.children
  };
}

/**
 * Creates a recursive table-cell content box.
 *
 * @param cell - Owning table cell.
 * @param fragments - Text fragments inside the cell.
 * @returns Layout container fixture for the cell content.
 */
function createCellBox(
  cell: QuireTableCellFragment,
  fragments: readonly QuireTextFragment[]
): QuireLayoutContainer {
  return retainQuireTestTableCellSubLayoutIdentity({
    id: cell.id,
    range: cell.range,
    rect: cell.contentRect,
    textFragments: fragments,
    children: []
  } as QuireLayoutContainer, cell) as QuireLayoutContainer;
}

/**
 * Creates a text fragment fixture.
 *
 * @param options - Fragment id, range, line top, height, and optional baseline.
 * @returns Text fragment fixture.
 */
function createFragment(options: {
  /** Fragment id. */
  readonly id: string;
  /** Source range. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow line top. */
  readonly y: number;
  /** Line height. */
  readonly height?: number | undefined;
  /** Fragment baseline. */
  readonly baseline?: number | undefined;
}): QuireTextFragment {
  const height = options.height ?? 12;

  return {
    id: options.id,
    text: "line",
    range: options.range,
    rect: { x: 0, y: options.y, width: 40, height },
    font: "12px test",
    lineHeight: height,
    baseline: options.baseline ?? options.y + height,
    caretStops: []
  };
}
