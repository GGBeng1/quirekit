import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../../layout";
import type { QuireTableLayoutSnapshot } from "../../../layout/engine/table";
import { buildQuireTableChromeModel } from "./model";

describe("Table chrome model", () => {
  it("exposes source sizing once instead of summing repeated or split visual rows", () => {
    const sizing = { width: 240, columnWidths: [80, 160], rowHeights: [40, 120], cellMinimumHeights: [] };
    const model = buildQuireTableChromeModel({
      nodes: [createTableNode({ ...createTableSnapshot("page-1", 100), sizing }),
        createTableNode({ ...createTableSnapshot("page-2", 500, 1), sizing })],
      tablePos: 4, activePosition: 6
    });
    expect(model?.sizing).toBe(sizing);
    expect(model?.sizing?.rowHeights).toEqual([40, 120]);
  });
  it("derives every insertion boundary and trailing resize edge", () => {
    const model = buildQuireTableChromeModel({
      nodes: [
        createTableNode(createTableSnapshot("page-1", 100)),
        createTableNode(createTableSnapshot("page-2", 500, 1))
      ],
      tablePos: 4,
      activePosition: 6
    });

    expect(model).not.toBeNull();
    expect(model?.activeFragmentId).toBe("page-1");
    expect(model?.fragments).toHaveLength(2);
    expect(model?.fragments[0]).toMatchObject({
      fragmentId: "page-1",
      tableRect: { x: 80, y: 100, width: 240, height: 80 },
      corner: {
        kind: "table-corner",
        tablePos: 4,
        semanticCellIds: ["merged", "right"]
      },
      menu: {
        kind: "menu",
        tablePos: 4
      }
    });
    expect(model?.fragments[0]?.rows.map((anchor) => ({
      rowIndex: anchor.rowIndex,
      cells: anchor.semanticCellIds
    }))).toEqual([
      { rowIndex: 0, cells: ["merged", "right"] },
      { rowIndex: 1, cells: ["merged", "right"] }
    ]);
    expect(model?.fragments[0]?.columns.map((anchor) => ({
      columnIndex: anchor.columnIndex,
      cells: anchor.semanticCellIds
    }))).toEqual([
      { columnIndex: 0, cells: ["merged"] },
      { columnIndex: 1, cells: ["right"] }
    ]);
    expect(model?.fragments[0]?.insertions.map((anchor) => ({
      kind: anchor.kind,
      boundaryIndex: anchor.boundaryIndex
    }))).toEqual([
      { kind: "insert-row", boundaryIndex: 0 },
      { kind: "insert-row", boundaryIndex: 1 },
      { kind: "insert-row", boundaryIndex: 2 },
      { kind: "insert-column", boundaryIndex: 0 },
      { kind: "insert-column", boundaryIndex: 1 },
      { kind: "insert-column", boundaryIndex: 2 }
    ]);
    expect(model?.fragments[0]?.resizes.map((anchor) => ({
      kind: anchor.kind,
      rowIndex: anchor.rowIndex,
      columnIndex: anchor.columnIndex,
      rect: anchor.rect
    }))).toEqual([
      {
        kind: "resize-row",
        rowIndex: 1,
        columnIndex: undefined,
        rect: { x: 80, y: 180, width: 240, height: 0 }
      },
      {
        kind: "resize-column",
        rowIndex: undefined,
        columnIndex: 0,
        rect: { x: 200, y: 100, width: 0, height: 80 }
      },
      {
        kind: "resize-column",
        rowIndex: undefined,
        columnIndex: 1,
        rect: { x: 320, y: 100, width: 0, height: 80 }
      }
    ]);
  });

  it("leaves resize gaps where merged cells hide grid boundaries", () => {
    const table = createTableSnapshot("horizontal-merge", 100);
    const horizontalMerge: QuireTableLayoutSnapshot = {
      ...table,
      cells: [
        createCell(
          "horizontal-merge:top",
          "top",
          { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 2 },
          { x: 80, y: 100, width: 240, height: 40 }
        ),
        createCell(
          "horizontal-merge:bottom-left",
          "bottom-left",
          { startRow: 1, rowSpan: 1, startColumn: 0, columnSpan: 1 },
          { x: 80, y: 140, width: 120, height: 40 }
        ),
        createCell(
          "horizontal-merge:bottom-right",
          "bottom-right",
          { startRow: 1, rowSpan: 1, startColumn: 1, columnSpan: 1 },
          { x: 200, y: 140, width: 120, height: 40 }
        )
      ]
    };
    const model = buildQuireTableChromeModel({
      nodes: [createTableNode(horizontalMerge)],
      tablePos: 4,
      activePosition: 6
    });

    expect(model?.fragments[0]?.resizes.map((anchor) => ({
      kind: anchor.kind,
      rowIndex: anchor.rowIndex,
      columnIndex: anchor.columnIndex,
      rect: anchor.rect
    }))).toEqual([
      {
        kind: "resize-row",
        rowIndex: 0,
        columnIndex: undefined,
        rect: { x: 80, y: 140, width: 240, height: 0 }
      },
      {
        kind: "resize-row",
        rowIndex: 1,
        columnIndex: undefined,
        rect: { x: 80, y: 180, width: 240, height: 0 }
      },
      {
        kind: "resize-column",
        rowIndex: undefined,
        columnIndex: 0,
        rect: { x: 200, y: 140, width: 0, height: 40 }
      },
      {
        kind: "resize-column",
        rowIndex: undefined,
        columnIndex: 1,
        rect: { x: 320, y: 100, width: 0, height: 80 }
      }
    ]);
  });

  it("returns null instead of inventing chrome without retained geometry", () => {
    expect(buildQuireTableChromeModel({
      nodes: [],
      tablePos: 4,
      activePosition: 6
    })).toBeNull();
  });

  it("bounds chrome to the semantic grid instead of the full flow footprint", () => {
    const table = createTableSnapshot("narrow-table", 120);
    const narrowTable: QuireTableLayoutSnapshot = {
      ...table,
      rect: { x: 80, y: 120, width: 560, height: 40 },
      tracks: [
        { id: "column:0", columnIndex: 0, x: 80, width: 40 },
        { id: "column:1", columnIndex: 1, x: 120, width: 520 }
      ],
      rows: [{
        ...table.rows[0]!,
        rect: { x: 80, y: 120, width: 560, height: 40 }
      }],
      cells: [
        createCell(
          "narrow-table:cell",
          "cell",
          { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
          { x: 80, y: 120, width: 40, height: 40 }
        )
      ]
    };
    const model = buildQuireTableChromeModel({
      nodes: [createTableNode(narrowTable)],
      tablePos: 4,
      activePosition: 6
    });
    const fragment = model?.fragments[0];

    expect(fragment?.tableRect).toEqual({
      x: 80,
      y: 120,
      width: 40,
      height: 40
    });
    expect(fragment?.columns).toHaveLength(1);
    expect(fragment?.rows[0]?.rect).toEqual({
      x: 80,
      y: 120,
      width: 40,
      height: 40
    });
    expect(fragment?.insertions.map((anchor) => ({
      kind: anchor.kind,
      boundaryIndex: anchor.boundaryIndex,
      rect: anchor.rect
    }))).toEqual([
      {
        kind: "insert-row",
        boundaryIndex: 0,
        rect: { x: 80, y: 120, width: 0, height: 0 }
      },
      {
        kind: "insert-row",
        boundaryIndex: 1,
        rect: { x: 80, y: 160, width: 0, height: 0 }
      },
      {
        kind: "insert-column",
        boundaryIndex: 0,
        rect: { x: 80, y: 120, width: 0, height: 0 }
      },
      {
        kind: "insert-column",
        boundaryIndex: 1,
        rect: { x: 120, y: 120, width: 0, height: 0 }
      }
    ]);
    expect(fragment?.resizes.map((anchor) => anchor.rect)).toEqual([
      { x: 80, y: 160, width: 40, height: 0 },
      { x: 120, y: 120, width: 0, height: 40 }
    ]);
  });

  it("derives editor-only guides for edges without effective borders", () => {
    const table = createTableSnapshot("borderless-table", 100);
    const borderless: QuireTableLayoutSnapshot = {
      ...table,
      style: {
        backgroundColor: null,
        borderColor: "#000000",
        borderWidth: 1
      },
      borders: {
        top: null,
        right: null,
        bottom: null,
        left: null,
        insideH: null,
        insideV: null
      }
    };
    const model = buildQuireTableChromeModel({
      nodes: [createTableNode(borderless)],
      tablePos: 4,
      activePosition: 6
    });

    expect(model?.fragments[0]?.guides).toHaveLength(7);
    expect(model?.fragments[0]?.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({
        orientation: "vertical",
        rect: { x: 200, y: 100, width: 0, height: 80 }
      }),
      expect.objectContaining({
        orientation: "horizontal",
        rect: { x: 80, y: 180, width: 120, height: 0 }
      })
    ]));
  });
});

/**
 * Creates one table-owning retained layout node.
 *
 * @param table - Page-local Table snapshot.
 * @returns Minimal retained layout fixture.
 */
function createTableNode(table: QuireTableLayoutSnapshot): QuireLayoutNode {
  return {
    id: `node:${table.fragmentId}`,
    kind: "block",
    range: table.tableRange,
    rect: table.rect,
    table
  };
}

/**
 * Creates one two-row, two-column fragment with a vertically merged first cell.
 *
 * @param fragmentId - Stable page-local fragment identity.
 * @param y - Document-space fragment top.
 * @param firstRowIndex - Source row represented by the first fragment row.
 * @returns Minimal page-local Table layout snapshot.
 */
function createTableSnapshot(
  fragmentId: string,
  y: number,
  firstRowIndex = 0
): QuireTableLayoutSnapshot {
  const rows = [
    {
      id: `${fragmentId}:row:0`,
      sourceRowId: `row:${firstRowIndex}`,
      rowIndex: firstRowIndex,
      isHeader: firstRowIndex === 0,
      cantSplit: false,
      range: { from: 5, to: 12 },
      rect: { x: 80, y, width: 240, height: 40 }
    },
    {
      id: `${fragmentId}:row:1`,
      sourceRowId: `row:${firstRowIndex + 1}`,
      rowIndex: firstRowIndex + 1,
      isHeader: false,
      cantSplit: false,
      range: { from: 13, to: 20 },
      rect: { x: 80, y: y + 40, width: 240, height: 40 }
    }
  ] as QuireTableLayoutSnapshot["rows"];
  const cells = [
    createCell(
      `${fragmentId}:merged`,
      "merged",
      { startRow: firstRowIndex, rowSpan: 2, startColumn: 0, columnSpan: 1 },
      { x: 80, y, width: 120, height: 80 }
    ),
    createCell(
      `${fragmentId}:right`,
      "right",
      { startRow: firstRowIndex, rowSpan: 2, startColumn: 1, columnSpan: 1 },
      { x: 200, y, width: 120, height: 80 }
    )
  ];

  return {
    tableId: "table:4",
    geometryId: `geometry:${fragmentId}`,
    fragmentId,
    tableRange: { from: 4, to: 21 },
    style: {} as QuireTableLayoutSnapshot["style"],
    borders: null,
    rect: { x: 80, y, width: 240, height: 80 },
    tracks: [
      { id: "column:0", columnIndex: 0, x: 80, width: 120 },
      { id: "column:1", columnIndex: 1, x: 200, width: 120 }
    ],
    rows,
    cells,
    hitTargets: []
  };
}

/**
 * Creates one minimal page-local cell fragment.
 *
 * @param id - Fragment-local cell id.
 * @param semanticCellId - Stable semantic cell identity.
 * @param gridRect - Grid region occupied by the cell.
 * @param rect - Document-space cell bounds.
 * @returns Minimal Table cell fragment.
 */
function createCell(
  id: string,
  semanticCellId: string,
  gridRect: {
    readonly startRow: number;
    readonly rowSpan: number;
    readonly startColumn: number;
    readonly columnSpan: number;
  },
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): QuireTableLayoutSnapshot["cells"][number] {
  return {
    id,
    semanticCellId,
    originExplicitCellId: `${semanticCellId}:origin`,
    explicitCellIds: [`${semanticCellId}:origin`],
    originCellPos: 2,
    range: { from: 5, to: 20 },
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect,
    rect,
    contentRect: rect,
    contentChildren: []
  };
}
