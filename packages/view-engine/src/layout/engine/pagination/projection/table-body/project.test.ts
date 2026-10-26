import { describe, expect, it } from "vitest";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type {
  QuireTableCellFragment,
  QuireTableHitTarget,
  QuireTableLayoutSnapshot,
  QuireTableRowFragment
} from "../../../table";
import type { QuirePageBodyProjection } from "../types";
import { createQuireTableBodyCellSourceFlowSlice } from "./cell-slice";
import { projectQuireTableBodyToPage } from "./project";

describe("table body projection", () => {
  it("summarizes a body cell source-flow slice from covered rows", () => {
    const row = createRow({
      id: "row-1",
      rowIndex: 1,
      range: { from: 20, to: 25 },
      rect: { x: 0, y: 40, width: 200, height: 40 }
    });
    const cell = createCell({
      id: "cell-a",
      semanticCellId: "semantic-a",
      range: { from: 1, to: 10 },
      gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 },
      rect: { x: 0, y: 0, width: 100, height: 80 },
      contentRect: { x: 5, y: 5, width: 90, height: 70 },
      contentLayoutRect: { x: 5, y: 20, width: 90, height: 45 }
    });

    expect(
      createQuireTableBodyCellSourceFlowSlice(
        cell,
        { from: 20, to: 30 },
        { top: 20, bottom: 90 },
        [row]
      )
    ).toEqual({
      cellId: "cell-a",
      semanticCellId: "semantic-a",
      originExplicitCellId: "cell-a",
      explicitCellIds: ["cell-a"],
      originCellPos: 1,
      gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 },
      range: { from: 20, to: 25 },
      flowClip: { top: 40, bottom: 80 },
      rect: { x: 0, y: 40, width: 100, height: 40 },
      contentRect: { x: 5, y: 40, width: 90, height: 35 },
      contentLayoutRect: { x: 5, y: 40, width: 90, height: 25 },
      contentFlowClip: { top: 40, bottom: 75 },
      cellSourceFlowY: 35,
      cellSourceFlowHeight: 35
    });
  });

  it("keeps a row-spanning cell on a continuation page by covered row geometry", () => {
    const result = projectQuireTableBodyToPage({
      table: createTable({
        rows: [
          createRow({
            id: "row-0",
            rowIndex: 0,
            range: { from: 1, to: 10 },
            rect: { x: 0, y: 0, width: 200, height: 40 }
          }),
          createRow({
            id: "row-1",
            rowIndex: 1,
            range: { from: 20, to: 25 },
            rect: { x: 0, y: 40, width: 200, height: 40 }
          })
        ],
        cells: [
          createCell({
            id: "cell-a",
            semanticCellId: "semantic-a",
            range: { from: 1, to: 10 },
            gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 },
            rect: { x: 0, y: 0, width: 100, height: 80 },
            contentRect: { x: 5, y: 5, width: 90, height: 70 },
            contentLayoutRect: { x: 5, y: 20, width: 90, height: 45 }
          })
        ],
        hitTargets: [
          createHitTarget({
            id: "hit-a",
            semanticCellId: "semantic-a",
            range: { from: 1, to: 10 },
            rect: { x: 0, y: 0, width: 100, height: 80 }
          })
        ]
      }),
      pageRange: { from: 20, to: 30 },
      flowClip: { top: 40, bottom: 80 },
      projection: createProjection({ pageIndex: 2, range: { from: 20, to: 30 } })
    });

    expect(result.rows.map((row) => row.id)).toEqual(["row-1"]);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toMatchObject({
      id: "cell-a#p2",
      range: { from: 20, to: 25 },
      rect: { x: 0, y: 40, width: 100, height: 40 },
      contentRect: { x: 5, y: 40, width: 90, height: 35 },
      contentLayoutRect: { x: 5, y: 40, width: 90, height: 25 }
    });
    expect(result.cells[0]).toMatchObject({
      cellSourceFlowY: 35,
      cellSourceFlowHeight: 35
    });
    expect(result.hitTargets[0]).toMatchObject({
      id: "hit-a#p2",
      range: { from: 20, to: 25 },
      rect: { x: 0, y: 40, width: 100, height: 40 }
    });
  });

  it("inherits continuation hit-target identity from the projected cell slice", () => {
    const result = projectQuireTableBodyToPage({
      table: createTable({
        rows: [
          createRow({
            id: "row-1",
            rowIndex: 1,
            range: { from: 20, to: 25 },
            rect: { x: 0, y: 40, width: 200, height: 40 }
          })
        ],
        cells: [
          createCell({
            id: "cell-a",
            semanticCellId: "semantic-a",
            range: { from: 1, to: 10 },
            gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 },
            rect: { x: 0, y: 0, width: 100, height: 80 },
            contentRect: { x: 5, y: 5, width: 90, height: 70 }
          })
        ],
        hitTargets: [
          {
            ...createHitTarget({
              id: "hit-a",
              semanticCellId: "semantic-a",
              range: { from: 1, to: 10 },
              rect: { x: 0, y: 0, width: 100, height: 80 }
            }),
            originExplicitCellId: "stale-origin",
            explicitCellIds: ["stale-origin"],
            originCellPos: 99
          }
        ]
      }),
      pageRange: { from: 20, to: 30 },
      flowClip: { top: 40, bottom: 80 },
      projection: createProjection({ pageIndex: 2, range: { from: 20, to: 30 } })
    });

    expect(result.hitTargets[0]).toMatchObject({
      semanticCellId: "semantic-a",
      originExplicitCellId: "cell-a",
      explicitCellIds: ["cell-a"],
      originCellPos: 1
    });
  });
});

/**
 * Creates a table snapshot fixture.
 *
 * @param options - Table rows, cells, and hit targets.
 * @returns Table snapshot fixture.
 */
function createTable(options: {
  /** Source table rows in flow coordinates. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Source table cells in flow coordinates. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Source table hit targets in flow coordinates. */
  readonly hitTargets: readonly QuireTableHitTarget[];
}): QuireTableLayoutSnapshot {
  return {
    tableId: "table",
    fragmentId: "table",
    geometryId: "table",
    tableRange: { from: 1, to: 40 },
    style: {} as QuireTableLayoutSnapshot["style"],
    borders: null,
    rect: { x: 0, y: 0, width: 200, height: 80 },
    tracks: [],
    rows: options.rows,
    cells: options.cells,
    hitTargets: options.hitTargets
  };
}

/**
 * Creates a row fragment fixture.
 *
 * @param options - Row id, source index, range, and rectangle.
 * @returns Row fragment fixture.
 */
function createRow(options: {
  /** Stable row id. */
  readonly id: string;
  /** Source row index. */
  readonly rowIndex: number;
  /** Source row document range. */
  readonly range: QuireDocumentRange;
  /** Source-flow row rectangle. */
  readonly rect: QuireRect;
}): QuireTableRowFragment {
  return {
    id: options.id,
    sourceRowId: options.id,
    rowIndex: options.rowIndex,
    isHeader: false,
    cantSplit: false,
    range: options.range,
    rect: options.rect
  };
}

/**
 * Creates a cell fragment fixture.
 *
 * @param options - Cell identity, range, grid rectangle, and visual rectangles.
 * @returns Cell fragment fixture.
 */
function createCell(options: {
  /** Stable cell id. */
  readonly id: string;
  /** Semantic cell id represented by the cell. */
  readonly semanticCellId: string;
  /** Source cell document range. */
  readonly range: QuireDocumentRange;
  /** Source grid rectangle occupied by the cell. */
  readonly gridRect: QuireTableCellFragment["gridRect"];
  /** Source-flow full cell rectangle. */
  readonly rect: QuireRect;
  /** Source-flow cell content rectangle. */
  readonly contentRect: QuireRect;
  /** Optional source-flow cell content layout rectangle. */
  readonly contentLayoutRect?: QuireRect | undefined;
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: options.semanticCellId,
    originExplicitCellId: options.id,
    explicitCellIds: [options.id],
    originCellPos: 1,
    range: options.range,
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect: options.gridRect,
    rect: options.rect,
    contentRect: options.contentRect,
    ...(options.contentLayoutRect === undefined
      ? {}
      : { contentLayoutRect: options.contentLayoutRect }),
    contentChildren: []
  };
}

/**
 * Creates a table hit-target fixture.
 *
 * @param options - Hit target identity, range, and rectangle.
 * @returns Table hit target fixture.
 */
function createHitTarget(options: {
  /** Stable hit-target id. */
  readonly id: string;
  /** Semantic cell id represented by the hit target. */
  readonly semanticCellId: string;
  /** Source hit-target document range. */
  readonly range: QuireDocumentRange;
  /** Source-flow hit rectangle. */
  readonly rect: QuireRect;
}): QuireTableHitTarget {
  return {
    id: options.id,
    kind: "cell",
    tableId: "table",
    semanticCellId: options.semanticCellId,
    originExplicitCellId: options.id,
    explicitCellIds: [options.id],
    originCellPos: 1,
    range: options.range,
    rect: options.rect
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Page index and document range.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Page index being projected. */
  readonly pageIndex: number;
  /** Page document range. */
  readonly range: QuireDocumentRange;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: options.pageIndex,
      range: options.range,
      pageRect: { x: 0, y: 0, width: 400, height: 300 },
      bodyRect: { x: 0, y: 0, width: 200, height: 200 },
      rect: { x: 0, y: 0, width: 200, height: 200 },
      sourceFlowY: 40,
      sourceFlowHeight: 40,
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: 0,
    dy: 0
  };
}
