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
  collectQuireTableCellRowTextSlices
} from "./row-text";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../../test-support/layout/table-cell-sub-layout";

describe("table-cell row text ownership", () => {
  it("summarizes baseline-owned text by covering cell", () => {
    const row = createRow({
      rowIndex: 1,
      rect: { x: 0, y: 28, width: 100, height: 28 },
      range: { from: 31, to: 40 }
    });
    const spanningCell = createCell({
      id: "wordTable-0:cell-0-0",
      semanticCellId: "semantic:span",
      originExplicitCellId: "cell:span",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 0, width: 50, height: 56 },
      contentRect: { x: 0, y: 0, width: 50, height: 56 },
      startRow: 0,
      rowSpan: 2,
      startColumn: 0
    });
    const rowCell = createCell({
      id: "wordTable-0:cell-1-1",
      semanticCellId: "semantic:row",
      originExplicitCellId: "cell:row",
      range: { from: 31, to: 40 },
      rect: { x: 50, y: 28, width: 50, height: 28 },
      contentRect: { x: 50, y: 28, width: 50, height: 28 },
      startRow: 1,
      rowSpan: 1,
      startColumn: 1
    });
    const previousSpanLine = createFragment({
      id: "previous-span-line",
      range: { from: 12, to: 14 },
      y: 18,
      baseline: 27
    });
    const continuationSpanLine = createFragment({
      id: "continuation-span-line",
      range: { from: 14, to: 16 },
      y: 30,
      baseline: 38
    });
    const rowLine = createFragment({
      id: "row-line",
      range: { from: 32, to: 36 },
      y: 30,
      baseline: 38
    });
    const table = createTable({
      row,
      cells: [spanningCell, rowCell],
      children: [
        createCellBox(spanningCell, [previousSpanLine, continuationSpanLine]),
        createCellBox(rowCell, [rowLine])
      ]
    });

    const slices = collectQuireTableCellRowTextSlices({
      row,
      cells: [spanningCell, rowCell],
      subLayoutProjectionByCellId: createSubLayoutResultMap(
        [spanningCell, rowCell],
        table.children
      )
    });

    expect(slices).toEqual([
      {
        cellId: "wordTable-0:cell-0-0",
        semanticCellId: "semantic:span",
        originExplicitCellId: "cell:span",
        explicitCellIds: ["cell:span"],
        originCellPos: 11,
        gridRect: { startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 1 },
        range: { from: 11, to: 20 },
        contentRect: { x: 0, y: 0, width: 50, height: 56 },
        fragments: [continuationSpanLine]
      },
      {
        cellId: "wordTable-0:cell-1-1",
        semanticCellId: "semantic:row",
        originExplicitCellId: "cell:row",
        explicitCellIds: ["cell:row"],
        originCellPos: 31,
        gridRect: { startRow: 1, startColumn: 1, rowSpan: 1, columnSpan: 1 },
        range: { from: 31, to: 40 },
        contentRect: { x: 50, y: 28, width: 50, height: 28 },
        fragments: [rowLine]
      }
    ]);
    expect(slices.flatMap((slice) => slice.fragments)).toEqual([
      continuationSpanLine,
      rowLine
    ]);
  });

  it("summarizes cell-owned text into line slices", () => {
    const row = createRow({
      rowIndex: 0,
      rect: { x: 0, y: 10, width: 100, height: 40 },
      range: { from: 10, to: 50 }
    });
    const cell = createCell({
      id: "wordTable-0:cell-0-0",
      semanticCellId: "semantic:cell",
      originExplicitCellId: "cell:origin",
      range: { from: 11, to: 40 },
      rect: { x: 0, y: 10, width: 100, height: 40 },
      contentRect: { x: 0, y: 10, width: 100, height: 40 },
      startRow: 0,
      rowSpan: 1,
      startColumn: 0
    });
    const firstFragment = createFragment({
      id: "first-fragment",
      range: { from: 12, to: 16 },
      y: 18,
      baseline: 26
    });
    const secondFragment = createFragment({
      id: "second-fragment",
      range: { from: 16, to: 22 },
      y: 18,
      baseline: 26
    });
    const table = createTable({
      row,
      cells: [cell],
      children: [createCellBox(cell, [secondFragment, firstFragment])]
    });

    expect(collectQuireTableCellRowLineSlices({
      row,
      cells: [cell],
      subLayoutProjectionByCellId: createSubLayoutResultMap([cell], table.children)
    })).toEqual([
      {
        cellId: "wordTable-0:cell-0-0",
        semanticCellId: "semantic:cell",
        originExplicitCellId: "cell:origin",
        explicitCellIds: ["cell:origin"],
        originCellPos: 11,
        gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
        cellRange: { from: 11, to: 40 },
        contentRect: { x: 0, y: 10, width: 100, height: 40 },
        from: 12,
        to: 22,
        top: 18,
        bottom: 28
      }
    ]);
  });

  it("summarizes row text from explicit cell child flow inputs", () => {
    const row = createRow({
      rowIndex: 0,
      rect: { x: 0, y: 10, width: 100, height: 40 },
      range: { from: 10, to: 50 }
    });
    const cell = createCell({
      id: "wordTable-0:cell-0-0",
      semanticCellId: "semantic:cell",
      originExplicitCellId: "cell:origin",
      range: { from: 11, to: 40 },
      rect: { x: 0, y: 10, width: 100, height: 40 },
      contentRect: { x: 0, y: 10, width: 100, height: 40 },
      startRow: 0,
      rowSpan: 1,
      startColumn: 0
    });
    const visible = createFragment({
      id: "visible",
      range: { from: 12, to: 16 },
      y: 18,
      baseline: 26
    });
    const outsideRow = createFragment({
      id: "outside-row",
      range: { from: 16, to: 20 },
      y: 60,
      baseline: 68
    });
    const nestedChild = createCellBox(cell, [visible, outsideRow]);
    const wrapper: QuireLayoutContainer = {
      id: "cell-wrapper",
      range: cell.range,
      rect: cell.contentRect,
      children: [nestedChild]
    };

    expect(collectQuireTableCellRowTextSlices({
      row,
      cells: [cell],
      subLayoutProjectionByCellId: createSubLayoutResultMap([cell], [wrapper])
    })).toEqual([
      {
        cellId: "wordTable-0:cell-0-0",
        semanticCellId: "semantic:cell",
        originExplicitCellId: "cell:origin",
        explicitCellIds: ["cell:origin"],
        originCellPos: 11,
        gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
        range: { from: 11, to: 40 },
        contentRect: { x: 0, y: 10, width: 100, height: 40 },
        fragments: [visible]
      }
    ]);
    expect(collectQuireTableCellRowLineSlices({
      row,
      cells: [cell],
      subLayoutProjectionByCellId: createSubLayoutResultMap([cell], [wrapper])
    })).toEqual([
      {
        cellId: "wordTable-0:cell-0-0",
        semanticCellId: "semantic:cell",
        originExplicitCellId: "cell:origin",
        explicitCellIds: ["cell:origin"],
        originCellPos: 11,
        gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
        cellRange: { from: 11, to: 40 },
        contentRect: { x: 0, y: 10, width: 100, height: 40 },
        from: 12,
        to: 16,
        top: 18,
        bottom: 28
      }
    ]);
  });

  it("uses table-cell sub-layout results as the row text handoff", () => {
    const row = createRow({
      rowIndex: 0,
      rect: { x: 0, y: 10, width: 100, height: 40 },
      range: { from: 10, to: 50 }
    });
    const cell = createCell({
      id: "wordTable-0:cell-0-0",
      semanticCellId: "semantic:cell",
      originExplicitCellId: "cell:origin",
      range: { from: 11, to: 40 },
      rect: { x: 0, y: 10, width: 100, height: 40 },
      contentRect: { x: 0, y: 10, width: 100, height: 40 },
      startRow: 0,
      rowSpan: 1,
      startColumn: 0
    });
    const visible = createFragment({
      id: "visible",
      range: { from: 12, to: 16 },
      y: 18,
      baseline: 26
    });
    const wrapper: QuireLayoutContainer = {
      id: "cell-wrapper",
      range: cell.range,
      rect: cell.contentRect,
      children: [createCellBox(cell, [visible])]
    };
    const subLayoutProjectionByCellId = createSubLayoutResultMap([cell], [wrapper]);

    expect(collectQuireTableCellRowTextSlices({
      row,
      cells: [cell],
      subLayoutProjectionByCellId
    })).toEqual([
      {
        cellId: "wordTable-0:cell-0-0",
        semanticCellId: "semantic:cell",
        originExplicitCellId: "cell:origin",
        explicitCellIds: ["cell:origin"],
        originCellPos: 11,
        gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
        range: { from: 11, to: 40 },
        contentRect: { x: 0, y: 10, width: 100, height: 40 },
        fragments: [visible]
      }
    ]);
  });
});

/**
 * Creates a table row fixture.
 *
 * @param options - Row index, rectangle, and source range.
 * @returns Table row fragment fixture.
 */
function createRow(options: {
  /** Zero-based source row index. */
  readonly rowIndex: number;
  /** Row rectangle in source-flow coordinates. */
  readonly rect: QuireRect;
  /** Row source range. */
  readonly range: QuireTableRowFragment["range"];
}): QuireTableRowFragment {
  return {
    id: `wordTable-0:row-${options.rowIndex}`,
    sourceRowId: `row:r${options.rowIndex}`,
    rowIndex: options.rowIndex,
    isHeader: false,
    cantSplit: false,
    range: options.range,
    rect: options.rect
  };
}

/**
 * Creates a table cell fixture.
 *
 * @param options - Cell identity, geometry, range, and grid position.
 * @returns Table cell fragment fixture.
 */
function createCell(options: {
  /** Cell id. */
  readonly id: string;
  /** Semantic cell id. */
  readonly semanticCellId: string;
  /** Explicit origin cell id. */
  readonly originExplicitCellId: string;
  /** Cell source range. */
  readonly range: QuireTableCellFragment["range"];
  /** Full cell rectangle. */
  readonly rect: QuireRect;
  /** Cell content rectangle. */
  readonly contentRect: QuireRect;
  /** Grid start row. */
  readonly startRow: number;
  /** Grid row span. */
  readonly rowSpan: number;
  /** Grid start column. */
  readonly startColumn: number;
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: options.semanticCellId,
    originExplicitCellId: options.originExplicitCellId,
    explicitCellIds: [options.originExplicitCellId],
    originCellPos: options.range.from,
    range: options.range,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: {
      startRow: options.startRow,
      startColumn: options.startColumn,
      rowSpan: options.rowSpan,
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
 * @param options - Row, cells, and recursive child boxes.
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
  return {
    id: "wordTable-0:layout",
    range: { from: 10, to: 50 },
    rect: { x: 0, y: 0, width: 100, height: 56 },
    table: {
      tableId: "wordTable-0",
      fragmentId: "wordTable-0",
      geometryId: "wordTable-0",
      tableRange: { from: 10, to: 50 },
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: { x: 0, y: 0, width: 100, height: 56 },
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
 * @param options - Fragment identity, source range, line top, and baseline.
 * @returns Text fragment fixture.
 */
function createFragment(options: {
  /** Fragment id. */
  readonly id: string;
  /** Source range. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow line top. */
  readonly y: number;
  /** Fragment baseline. */
  readonly baseline: number;
}): QuireTextFragment {
  return {
    id: options.id,
    text: "line",
    range: options.range,
    rect: { x: 0, y: options.y, width: 40, height: 10 },
    font: "12px test",
    lineHeight: 10,
    baseline: options.baseline,
    caretStops: []
  };
}
