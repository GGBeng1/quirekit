import { describe, expect, it } from "vitest";
import { layoutQuireSinglePageTable } from "./layout";
import type { QuireTableSource } from "@quirekit/layout/table";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireTableViewLayoutInput } from "./types";

const source = {
  tableId: "table-0",
  tableRange: { from: 0, to: 20 },
  rows: [
    {
      id: "row:r0",
      rowIndex: 0,
      rowPos: 1,
      gridBefore: { side: "before", startColumn: 0, columnSpan: 0 },
      gridAfter: { side: "after", startColumn: 2, columnSpan: 0 },
      isHeader: false,
      cantSplit: false,
      height: null,
      cellSpacing: null
    },
    {
      id: "row:r1",
      rowIndex: 1,
      rowPos: 11,
      gridBefore: { side: "before", startColumn: 0, columnSpan: 0 },
      gridAfter: { side: "after", startColumn: 2, columnSpan: 0 },
      isHeader: false,
      cantSplit: false,
      height: null,
      cellSpacing: null
    }
  ],
  columns: [
    { id: "table-0:col-0", columnIndex: 0, width: null },
    { id: "table-0:col-1", columnIndex: 1, width: null }
  ],
  preferredWidth: null,
  layoutMode: null,
  alignment: null,
  tableIndent: null,
  semanticCells: [
    {
      id: "semantic:r0:c0:g1:1",
      originExplicitCellId: "cell:r0:c0:g0:1",
      explicitCellIds: ["cell:r0:c0:g0:1"],
      originCellPos: 2,
      gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
      contentRange: { from: 2, to: 6 },
      shading: { fill: "fee2e2", color: null, pattern: null },
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      noWrap: null,
      verticalAlign: null,
      formatted: null
    },
    {
      id: "semantic:r0:c1:g1:1",
      originExplicitCellId: "cell:r0:c1:g1:1",
      explicitCellIds: ["cell:r0:c1:g1:1"],
      originCellPos: 8,
      gridRect: { startRow: 0, rowSpan: 1, startColumn: 1, columnSpan: 1 },
      contentRange: { from: 8, to: 12 },
      shading: null,
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      noWrap: null,
      verticalAlign: null,
      formatted: null
    },
    {
      id: "semantic:r1:c0:g1:1",
      originExplicitCellId: "cell:r1:c0:g0:1",
      explicitCellIds: ["cell:r1:c0:g0:1"],
      originCellPos: 14,
      gridRect: { startRow: 1, rowSpan: 1, startColumn: 0, columnSpan: 1 },
      contentRange: { from: 14, to: 18 },
      shading: null,
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      noWrap: null,
      verticalAlign: null,
      formatted: null
    },
    {
      id: "semantic:r1:c1:g1:1",
      originExplicitCellId: "cell:r1:c1:g1:1",
      explicitCellIds: ["cell:r1:c1:g1:1"],
      originCellPos: 20,
      gridRect: { startRow: 1, rowSpan: 1, startColumn: 1, columnSpan: 1 },
      contentRange: { from: 20, to: 24 },
      shading: null,
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      noWrap: null,
      verticalAlign: null,
      formatted: null
    }
  ],
  diagnostics: [],
  defaultCellMargins: null,
  cellSpacing: null,
  borders: null,
  style: {
    backgroundColor: "#fef3c7",
    borderColor: "#334155",
    borderWidth: 2
  }
} satisfies QuireTableSource;

/**
 * Creates a default single-page table layout input.
 *
 * @param tableSource - Optional source override for a geometry fixture.
 * @returns Table layout input for the geometry fixture.
 */
function createInput(tableSource: QuireTableSource = source): QuireTableViewLayoutInput {
  return {
    tableId: "table-0",
    tableRange: tableSource.tableRange,
    source: tableSource,
    constraints: {
      rect: { x: 10, y: 20, width: 300, height: 0 },
      defaultRowHeight: 28,
      defaultCellPadding: 4,
      defaultBorderWidth: 1
    },
    measureContent: () => ({ height: 12, children: [] })
  };
}

describe("Quire single-page table layout", () => {
  it("lays out rows, cells, content rects, and hit targets", () => {
    const container = layoutQuireSinglePageTable(createInput());
    const table = container.table as {
      readonly style?: unknown;
      readonly cells?: readonly { readonly shading?: unknown }[];
    } | undefined;

    // The indent locates the outer edge of the one-pixel left line, so the grid starts half a pixel in.
    expect(container.rect).toEqual({ x: 10.5, y: 20, width: 300, height: 56 });
    expect(table?.style).toEqual(source.style);
    expect(table?.cells?.[0]?.shading).toEqual({ fill: "fee2e2", color: null, pattern: null });
    expect(container.table?.tracks.map((track) => track.x)).toEqual([10.5, 160.5]);
    expect(container.table?.cells[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 150,
      height: 28
    });
    // Only the line above a row reserves space in it; the bottom edge belongs to the last row.
    expect(container.table?.cells[0]?.contentRect).toEqual({
      x: 14.5,
      y: 25,
      width: 142,
      height: 19
    });
    expect(container.table?.cells[0]).toEqual(expect.objectContaining({
      originExplicitCellId: "cell:r0:c0:g0:1",
      explicitCellIds: ["cell:r0:c0:g0:1"],
      originCellPos: 2
    }));
    expect(container.table?.hitTargets).toEqual([
      {
        id: "table-0:hit:semantic:r0:c0:g1:1",
        kind: "cell",
        tableId: "table-0",
        semanticCellId: "semantic:r0:c0:g1:1",
        originExplicitCellId: "cell:r0:c0:g0:1",
        explicitCellIds: ["cell:r0:c0:g0:1"],
        originCellPos: 2,
        range: { from: 2, to: 6 },
        rect: { x: 10.5, y: 20, width: 150, height: 28 }
      },
      {
        id: "table-0:hit:semantic:r0:c1:g1:1",
        kind: "cell",
        tableId: "table-0",
        semanticCellId: "semantic:r0:c1:g1:1",
        originExplicitCellId: "cell:r0:c1:g1:1",
        explicitCellIds: ["cell:r0:c1:g1:1"],
        originCellPos: 8,
        range: { from: 8, to: 12 },
        rect: { x: 160.5, y: 20, width: 150, height: 28 }
      },
      {
        id: "table-0:hit:semantic:r1:c0:g1:1",
        kind: "cell",
        tableId: "table-0",
        semanticCellId: "semantic:r1:c0:g1:1",
        originExplicitCellId: "cell:r1:c0:g0:1",
        explicitCellIds: ["cell:r1:c0:g0:1"],
        originCellPos: 14,
        range: { from: 14, to: 18 },
        rect: { x: 10.5, y: 48, width: 150, height: 28 }
      },
      {
        id: "table-0:hit:semantic:r1:c1:g1:1",
        kind: "cell",
        tableId: "table-0",
        semanticCellId: "semantic:r1:c1:g1:1",
        originExplicitCellId: "cell:r1:c1:g1:1",
        explicitCellIds: ["cell:r1:c1:g1:1"],
        originCellPos: 20,
        range: { from: 20, to: 24 },
        rect: { x: 160.5, y: 48, width: 150, height: 28 }
      }
    ]);
  });

  it("retains sub-layout query products on single-page table cell boxes", () => {
    const container = layoutQuireSinglePageTable({
      ...createInput(),
      measureContent: (_cell, _contentRect) => ({
        height: 24,
        children: [
          {
            id: "paragraph-0",
            range: { from: 3, to: 12 },
            minHeight: 24,
            textFragments: [createLocalTextFragment()]
          }
        ]
      })
    });
    const firstCell = container.children[0] as typeof container.children[number] & {
      readonly subLayoutFragments?: readonly [{
        readonly subLayout: {
          readonly view: {
            readonly queryProducts: {
              readonly hitTargets: readonly {
                readonly id: string;
                readonly range: { readonly from: number; readonly to: number };
                readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
              }[];
            };
          };
        };
      }];
    };
    const contentRect = container.table?.cells[0]?.contentRect;

    expect(firstCell.subLayoutFragments?.[0]?.subLayout.view.queryProducts.hitTargets)
      .toEqual([
        {
          id: "paragraph-0:sub-layout-hit",
          range: { from: 3, to: 12 },
          rect: { x: 14.5, y: 25, width: 142, height: 24 }
        },
        {
          id: "paragraph-0:sub-layout-trailing-blank-hit",
          range: { from: 3, to: 12 },
          rect: contentRect
        }
      ]);
  });

  it("uses Word row heights and cell margins for row and content geometry", () => {
    const cellMargins = {
      top: { value: 5, unit: "px" },
      right: { value: 20, unit: "px" },
      bottom: { value: 10, unit: "px" },
      left: { value: 10, unit: "px" }
    } as const;
    const tableSource = {
      ...source,
      rows: [
        { ...source.rows[0]!, height: { value: 40, rule: "at-least" } },
        source.rows[1]!
      ],
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          cellMargins
        },
        ...source.semanticCells.slice(1)
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    // An at-least height excludes the one-pixel line above the row.
    expect(container.rect).toEqual({ x: 10.5, y: 20, width: 300, height: 69 });
    expect(container.table?.rows.map((row) => row.rect)).toEqual([
      { x: 10.5, y: 20, width: 300, height: 41 },
      { x: 10.5, y: 61, width: 300, height: 28 }
    ]);
    expect(container.table?.cells[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 150,
      height: 41
    });
    expect(container.table?.cells[0]?.contentRect).toEqual({
      x: 20.5,
      y: 26,
      width: 120,
      height: 25
    });
    expect(container.table?.hitTargets[2]?.rect).toEqual({
      x: 10.5,
      y: 61,
      width: 150,
      height: 28
    });
  });

  it("applies table cell spacing as separated cell geometry", () => {
    const tableSource = {
      ...source,
      cellSpacing: { value: 8, unit: "px" }
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.rect).toEqual({ x: 10, y: 20, width: 300, height: 80 });
    expect(container.table?.cellSpacing).toBe(8);
    expect(container.table?.tracks.map((track) => ({
      x: track.x,
      width: track.width
    }))).toEqual([
      { x: 18, width: 138 },
      { x: 164, width: 138 }
    ]);
    expect(container.table?.rows.map((row) => row.rect)).toEqual([
      { x: 18, y: 28, width: 284, height: 28 },
      { x: 18, y: 64, width: 284, height: 28 }
    ]);
    expect(container.table?.cells[0]?.rect).toEqual({
      x: 18,
      y: 28,
      width: 138,
      height: 28
    });
    expect(container.table?.cells[1]?.rect).toEqual({
      x: 164,
      y: 28,
      width: 138,
      height: 28
    });
    expect(container.table?.cells[2]?.rect).toEqual({
      x: 18,
      y: 64,
      width: 138,
      height: 28
    });
    expect(container.table?.cells[0]?.contentRect).toEqual({
      x: 23,
      y: 33,
      width: 128,
      height: 18
    });
    expect(container.table?.hitTargets[0]?.rect).toEqual({
      x: 18,
      y: 28,
      width: 138,
      height: 28
    });
  });

  it("lets row cell spacing override table-level separated geometry", () => {
    const tableSource = {
      ...source,
      cellSpacing: { value: 8, unit: "px" },
      rows: [
        source.rows[0]!,
        { ...source.rows[1]!, cellSpacing: { value: 16, unit: "px" } }
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.rect).toEqual({ x: 10, y: 20, width: 300, height: 96 });
    expect(container.table?.cellSpacing).toBe(8);
    expect(container.table?.rows.map((row) => ({
      rect: row.rect,
      cellSpacing: row.cellSpacing
    }))).toEqual([
      {
        rect: { x: 18, y: 28, width: 284, height: 28 },
        cellSpacing: 8
      },
      {
        rect: { x: 26, y: 72, width: 268, height: 28 },
        cellSpacing: 16
      }
    ]);
    expect(container.table?.cells[0]?.rect).toEqual({
      x: 18,
      y: 28,
      width: 138,
      height: 28
    });
    expect(container.table?.cells[1]?.rect).toEqual({
      x: 164,
      y: 28,
      width: 138,
      height: 28
    });
    expect(container.table?.cells[2]?.rect).toEqual({
      x: 26,
      y: 72,
      width: 126,
      height: 28
    });
    expect(container.table?.cells[3]?.rect).toEqual({
      x: 168,
      y: 72,
      width: 126,
      height: 28
    });
  });

  it("aligns cell content vertically without moving the clip rectangle", () => {
    const tableSource = {
      ...source,
      rows: [
        { ...source.rows[0]!, height: { value: 60, rule: "at-least" } },
        source.rows[1]!
      ],
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          verticalAlign: "center"
        },
        {
          ...source.semanticCells[1]!,
          verticalAlign: "bottom"
        },
        ...source.semanticCells.slice(2)
      ]
    } satisfies QuireTableSource;
    const input = {
      ...createInput(tableSource),
      measureContent: () => ({ height: 12, children: [] })
    } satisfies QuireTableViewLayoutInput;

    const container = layoutQuireSinglePageTable(input);
    const centerCell = container.table?.cells[0];
    const bottomCell = container.table?.cells[1];

    expect(centerCell?.contentRect).toEqual({
      x: 14.5,
      y: 25,
      width: 142,
      height: 52
    });
    // The at-least 60 row grows by the line above it, which it excludes.
    expect(centerCell?.contentLayoutRect).toEqual({
      x: 14.5,
      y: 45,
      width: 142,
      height: 32
    });
    expect(bottomCell?.contentRect).toEqual({
      x: 164.5,
      y: 25,
      width: 142,
      height: 52
    });
    expect(bottomCell?.contentLayoutRect).toEqual({
      x: 164.5,
      y: 65,
      width: 142,
      height: 12
    });
    expect(centerCell?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 150,
      height: 61
    });
  });

  it("lays out column-spanning semantic cells across covered tracks", () => {
    const tableSource = {
      ...source,
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          explicitCellIds: ["cell:r0:c0:g0:1", "cell:r0:c1:g1:1"],
          gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 2 },
          contentRange: { from: 2, to: 12 }
        },
        ...source.semanticCells.slice(2)
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.table?.cells[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 300,
      height: 28
    });
    expect(container.table?.cells[0]?.contentRect).toEqual({
      x: 14.5,
      y: 25,
      width: 292,
      height: 19
    });
    expect(container.table?.hitTargets[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 300,
      height: 28
    });
  });

  it("lays out row-spanning semantic cells across covered row fragments", () => {
    const tableSource = {
      ...source,
      rows: [
        { ...source.rows[0]!, height: { value: 40, rule: "at-least" } },
        source.rows[1]!
      ],
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          explicitCellIds: ["cell:r0:c0:g0:1", "cell:r1:c0:g0:1"],
          gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 }
        },
        source.semanticCells[1]!,
        source.semanticCells[3]!
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.table?.cells[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 150,
      height: 69
    });
    expect(container.table?.cells[0]?.contentRect).toEqual({
      x: 14.5,
      y: 25,
      width: 142,
      height: 59
    });
    expect(container.table?.hitTargets[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 150,
      height: 69
    });
    expect(container.table?.hitTargets[0]).toEqual(expect.objectContaining({
      originExplicitCellId: "cell:r0:c0:g0:1",
      explicitCellIds: ["cell:r0:c0:g0:1", "cell:r1:c0:g0:1"],
      originCellPos: 2
    }));
  });

  it("carries repeated-header and cant-split row metadata into row fragments", () => {
    const tableSource = {
      ...source,
      rows: [
        { ...source.rows[0]!, isHeader: true },
        { ...source.rows[1]!, cantSplit: true }
      ]
    } satisfies QuireTableSource;
    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.table?.rows.map((row) => ({
      rowIndex: row.rowIndex,
      gridBefore: row.gridBefore,
      gridAfter: row.gridAfter,
      isHeader: row.isHeader,
      cantSplit: row.cantSplit
    }))).toEqual([
      {
        rowIndex: 0,
        gridBefore: { side: "before", startColumn: 0, columnSpan: 0 },
        gridAfter: { side: "after", startColumn: 2, columnSpan: 0 },
        isHeader: true,
        cantSplit: false
      },
      {
        rowIndex: 1,
        gridBefore: { side: "before", startColumn: 0, columnSpan: 0 },
        gridAfter: { side: "after", startColumn: 2, columnSpan: 0 },
        isHeader: false,
        cantSplit: true
      }
    ]);
  });

  it("preserves row offset metadata while positioning cells by grid columns", () => {
    const tableSource = {
      ...source,
      rows: [
        source.rows[0]!,
        {
          ...source.rows[1]!,
          gridBefore: { side: "before", startColumn: 0, columnSpan: 1 },
          gridAfter: { side: "after", startColumn: 2, columnSpan: 1 }
        }
      ],
      columns: [
        { id: "table-0:col-0", columnIndex: 0, width: null },
        { id: "table-0:col-1", columnIndex: 1, width: null },
        { id: "table-0:col-2", columnIndex: 2, width: null }
      ],
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 }
        },
        {
          ...source.semanticCells[1]!,
          gridRect: { startRow: 0, rowSpan: 1, startColumn: 1, columnSpan: 1 }
        },
        {
          ...source.semanticCells[2]!,
          gridRect: { startRow: 1, rowSpan: 1, startColumn: 1, columnSpan: 1 }
        }
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));
    const offsetRowCell = container.table?.cells.find((cell) =>
      cell.gridRect.startRow === 1
    );

    expect(container.table?.rows[1]?.gridBefore).toEqual({
      side: "before",
      startColumn: 0,
      columnSpan: 1
    });
    expect(container.table?.rows[1]?.gridAfter).toEqual({
      side: "after",
      startColumn: 2,
      columnSpan: 1
    });
    expect(container.table?.tracks.map((track) => track.x)).toEqual([10.5, 110.5, 210.5]);
    expect(offsetRowCell?.rect).toEqual({
      x: 110.5,
      y: 48,
      width: 100,
      height: 28
    });
  });

  it("lays out mixed row and column spanning semantic cells atomically", () => {
    const tableSource = {
      ...source,
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          id: "semantic:r0:c0:g2:2",
          originExplicitCellId: "cell:r0:c0:g0:2",
          explicitCellIds: ["cell:r0:c0:g0:2", "cell:r1:c0:g0:2"],
          gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 2 },
          contentRange: { from: 2, to: 24 }
        }
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.table?.cells).toHaveLength(1);
    expect(container.table?.cells[0]).toEqual(expect.objectContaining({
      semanticCellId: "semantic:r0:c0:g2:2",
      originExplicitCellId: "cell:r0:c0:g0:2",
      explicitCellIds: ["cell:r0:c0:g0:2", "cell:r1:c0:g0:2"],
      originCellPos: 2,
      gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 2 },
      rect: { x: 10.5, y: 20, width: 300, height: 56 },
      contentRect: { x: 14.5, y: 25, width: 292, height: 46 }
    }));
    expect(container.table?.hitTargets).toEqual([
      expect.objectContaining({
        semanticCellId: "semantic:r0:c0:g2:2",
        originExplicitCellId: "cell:r0:c0:g0:2",
        explicitCellIds: ["cell:r0:c0:g0:2", "cell:r1:c0:g0:2"],
        rect: { x: 10.5, y: 20, width: 300, height: 56 }
      })
    ]);
  });

  it("grows the last covered row when row-spanning content needs more height", () => {
    const tableSource = {
      ...source,
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          explicitCellIds: ["cell:r0:c0:g0:1", "cell:r1:c0:g0:1"],
          gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 }
        },
        source.semanticCells[1]!,
        source.semanticCells[3]!
      ]
    } satisfies QuireTableSource;
    const input = {
      ...createInput(tableSource),
      measureContent: (cell) => ({
        height: cell.id === source.semanticCells[0]!.id ? 110 : 12,
        children: []
      })
    } satisfies QuireTableViewLayoutInput;

    const container = layoutQuireSinglePageTable(input);

    expect(container.rect.height).toBe(120);
    expect(container.table?.rows.map((row) => row.rect)).toEqual([
      { x: 10.5, y: 20, width: 300, height: 28 },
      { x: 10.5, y: 48, width: 300, height: 92 }
    ]);
    expect(container.table?.cells[0]?.rect).toEqual({
      x: 10.5,
      y: 20,
      width: 150,
      height: 120
    });
    expect(container.table?.cells[1]?.rect).toEqual({
      x: 160.5,
      y: 20,
      width: 150,
      height: 28
    });
    expect(container.table?.cells[2]?.rect).toEqual({
      x: 160.5,
      y: 48,
      width: 150,
      height: 92
    });
  });

  it("carries table and cell border metadata into layout snapshots", () => {
    const tableBorders = {
      top: { style: "single", width: 1, color: "ff0000", spacing: 0 },
      right: null,
      bottom: null,
      left: null,
      insideH: null,
      insideV: null
    };
    const cellBorders = {
      top: null,
      right: { style: "single", width: 2, color: "0000ff", spacing: 0 },
      bottom: null,
      left: null,
      insideH: null,
      insideV: null
    };
    const tableSource = {
      ...source,
      borders: tableBorders,
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          borders: cellBorders
        },
        ...source.semanticCells.slice(1)
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.table?.borders).toEqual(tableBorders);
    expect(container.table?.cells[0]?.borders).toEqual(cellBorders);
  });

  it("uses the preferred Word table width as the grid width", () => {
    const tableSource = {
      ...source,
      preferredWidth: { value: 200, unit: "px" }
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.rect).toEqual({ x: 10.5, y: 20, width: 200, height: 56 });
    expect(container.table?.rect).toEqual({ x: 10.5, y: 20, width: 200, height: 56 });
    expect(container.table?.rows.map((row) => row.rect)).toEqual([
      { x: 10.5, y: 20, width: 200, height: 28 },
      { x: 10.5, y: 48, width: 200, height: 28 }
    ]);
    expect(container.table?.tracks.map((track) => track.width)).toEqual([100, 100]);
    expect(container.table?.cells[1]?.rect).toEqual({
      x: 110.5,
      y: 20,
      width: 100,
      height: 28
    });
  });

  it("uses cell-derived source column widths for missing table grids", () => {
    const tableSource = {
      ...source,
      columns: [
        {
          id: "table-0:col-0",
          columnIndex: 0,
          width: { value: 120, unit: "px" }
        },
        source.columns[1]!
      ],
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          preferredWidth: { value: 120, unit: "px" }
        },
        ...source.semanticCells.slice(1)
      ]
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.table?.tracks.map((track) => track.width)).toEqual([120, 180]);
    expect(container.table?.tracks.map((track) => track.x)).toEqual([10.5, 130.5]);
    expect(container.table?.cells[0]).toEqual(expect.objectContaining({
      preferredWidth: { value: 120, unit: "px" },
      rect: { x: 10.5, y: 20, width: 120, height: 28 }
    }));
    expect(container.table?.cells[1]?.rect).toEqual({
      x: 130.5,
      y: 20,
      width: 180,
      height: 28
    });
  });

  it("aligns a preferred-width table within the available body width", () => {
    const centeredSource = {
      ...source,
      preferredWidth: { value: 200, unit: "px" },
      alignment: "center"
    } satisfies QuireTableSource;
    const rightSource = {
      ...source,
      preferredWidth: { value: 200, unit: "px" },
      alignment: "right"
    } satisfies QuireTableSource;

    const centered = layoutQuireSinglePageTable(createInput(centeredSource));
    const right = layoutQuireSinglePageTable(createInput(rightSource));

    expect(centered.rect.x).toBe(60);
    expect(centered.table?.rect.x).toBe(60);
    expect(centered.table?.tracks.map((track) => track.x)).toEqual([60, 160]);
    expect(centered.table?.rows[0]?.rect.x).toBe(60);
    expect(centered.table?.cells[0]?.rect.x).toBe(60);
    expect(right.rect.x).toBe(110);
    expect(right.table?.rect.x).toBe(110);
    expect(right.table?.tracks.map((track) => track.x)).toEqual([110, 210]);
    expect(right.table?.rows[0]?.rect.x).toBe(110);
    expect(right.table?.cells[0]?.rect.x).toBe(110);
  });

  it("applies table indent to left and default table placement", () => {
    const tableSource = {
      ...source,
      tableIndent: { value: 48, unit: "px" }
    } satisfies QuireTableSource;

    const container = layoutQuireSinglePageTable(createInput(tableSource));

    expect(container.rect).toEqual({ x: 58.5, y: 20, width: 252, height: 56 });
    expect(container.table?.rect).toEqual({ x: 58.5, y: 20, width: 252, height: 56 });
    expect(container.table?.tracks.map((track) => track.x)).toEqual([58.5, 184.5]);
    expect(container.table?.tracks.map((track) => track.width)).toEqual([126, 126]);
    expect(container.table?.rows[0]?.rect).toEqual({
      x: 58.5,
      y: 20,
      width: 252,
      height: 28
    });
    expect(container.table?.cells[0]?.rect).toEqual({
      x: 58.5,
      y: 20,
      width: 126,
      height: 28
    });
  });

  it("keeps center and right placement authoritative over table indent in C1", () => {
    const tableIndent = { value: 48, unit: "px" } as const;
    const centeredSource = {
      ...source,
      preferredWidth: { value: 200, unit: "px" },
      alignment: "center",
      tableIndent
    } satisfies QuireTableSource;
    const rightSource = {
      ...source,
      preferredWidth: { value: 200, unit: "px" },
      alignment: "right",
      tableIndent
    } satisfies QuireTableSource;

    const centered = layoutQuireSinglePageTable(createInput(centeredSource));
    const right = layoutQuireSinglePageTable(createInput(rightSource));

    expect(centered.rect.x).toBe(60);
    expect(centered.table?.tracks.map((track) => track.x)).toEqual([60, 160]);
    expect(right.rect.x).toBe(110);
    expect(right.table?.tracks.map((track) => track.x)).toEqual([110, 210]);
  });
});

/**
 * Creates a local text fragment for table-cell child layout tests.
 *
 * @returns Text fragment measured from a local block origin.
 */
function createLocalTextFragment(): QuireTextFragment {
  return {
    id: "paragraph-0:text-0",
    text: "Row 2 A",
    range: { from: 4, to: 11 },
    rect: { x: 0, y: 0, width: 70, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 18,
    caretStops: [
      { position: { pos: 4, bias: 1 }, localX: 0 },
      { position: { pos: 5, bias: 0 }, localX: 10 },
      { position: { pos: 6, bias: 0 }, localX: 20 },
      { position: { pos: 7, bias: 0 }, localX: 30 },
      { position: { pos: 8, bias: 0 }, localX: 40 },
      { position: { pos: 9, bias: 0 }, localX: 50 },
      { position: { pos: 10, bias: 0 }, localX: 60 },
      { position: { pos: 11, bias: -1 }, localX: 70 }
    ]
  };
}
