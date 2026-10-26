import { describe, expect, it } from "vitest";
import { buildQuireTablePaintModel } from "./paint-model";
import type { QuireTableGeometrySnapshot } from "./types";

const snapshot = {
  tableId: "table-0",
  geometryId: "table-0",
  tableRange: { from: 0, to: 20 },
  style: {
    backgroundColor: null,
    borderColor: "#cbd5e1",
    borderWidth: 1
  },
  borders: null,
  rect: { x: 10, y: 20, width: 300, height: 56 },
  tracks: [
    { id: "table-0:col-0", columnIndex: 0, x: 10, width: 150 },
    { id: "table-0:col-1", columnIndex: 1, x: 160, width: 150 }
  ],
  rows: [
    {
      id: "table-0:row-0",
      sourceRowId: "row:r0",
      rowIndex: 0,
      isHeader: false,
      cantSplit: false,
      range: { from: 2, to: 12 },
      rect: { x: 10, y: 20, width: 300, height: 28 }
    },
    {
      id: "table-0:row-1",
      sourceRowId: "row:r1",
      rowIndex: 1,
      isHeader: false,
      cantSplit: false,
      range: { from: 14, to: 18 },
      rect: { x: 10, y: 48, width: 300, height: 28 }
    }
  ],
  cells: [
    {
      id: "table-0:cell-0-0",
      semanticCellId: "semantic:r0:c0:g1:1",
      originExplicitCellId: "cell:r0:c0:g0:1",
      explicitCellIds: ["cell:r0:c0:g0:1"],
      originCellPos: 2,
      range: { from: 2, to: 6 },
      shading: null,
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
      rect: { x: 10, y: 20, width: 150, height: 28 },
      contentRect: { x: 15, y: 25, width: 140, height: 18 }
    },
    {
      id: "table-0:cell-0-1",
      semanticCellId: "semantic:r0:c1:g1:1",
      originExplicitCellId: "cell:r0:c1:g1:1",
      explicitCellIds: ["cell:r0:c1:g1:1"],
      originCellPos: 8,
      range: { from: 8, to: 12 },
      shading: null,
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      gridRect: { startRow: 0, rowSpan: 1, startColumn: 1, columnSpan: 1 },
      rect: { x: 160, y: 20, width: 150, height: 28 },
      contentRect: { x: 165, y: 25, width: 140, height: 18 }
    }
  ],
} satisfies QuireTableGeometrySnapshot;

describe("Quire table paint model", () => {
  // Horizontal lines fill the space layout reserves below the grid line, or above the table's bottom edge;
  // vertical lines stop at the table's top and bottom edges.
  it("builds deterministic backgrounds, content clips, and solid borders", () => {
    expect(buildQuireTablePaintModel(snapshot)).toEqual({
      backgrounds: [
        {
          id: "table-0:background",
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 300, height: 56 },
          fillStyle: "#ffffff"
        }
      ],
      contentClips: [
        {
          id: "table-0:cell-0-0:clip",
          semanticCellId: "semantic:r0:c0:g1:1",
          rect: { x: 15, y: 25, width: 140, height: 18 }
        },
        {
          id: "table-0:cell-0-1:clip",
          semanticCellId: "semantic:r0:c1:g1:1",
          rect: { x: 165, y: 25, width: 140, height: 18 }
        }
      ],
      borders: [
        {
          id: "table-0:border-top-0",
          from: { x: 10, y: 20.5 },
          to: { x: 310, y: 20.5 },
          strokeStyle: "#cbd5e1",
          lineWidth: 1,
          lineCap: "square"
        },
        {
          id: "table-0:border-top-1",
          from: { x: 10, y: 48.5 },
          to: { x: 310, y: 48.5 },
          strokeStyle: "#cbd5e1",
          lineWidth: 1,
          lineCap: "square"
        },
        {
          id: "table-0:border-bottom-1",
          from: { x: 10, y: 75.5 },
          to: { x: 310, y: 75.5 },
          strokeStyle: "#cbd5e1",
          lineWidth: 1,
          lineCap: "square"
        },
        {
          id: "table-0:border-left-0",
          from: { x: 10, y: 20 },
          to: { x: 10, y: 76 },
          strokeStyle: "#cbd5e1",
          lineWidth: 1,
          lineCap: "butt"
        },
        {
          id: "table-0:border-left-1",
          from: { x: 160, y: 20 },
          to: { x: 160, y: 76 },
          strokeStyle: "#cbd5e1",
          lineWidth: 1,
          lineCap: "butt"
        },
        {
          id: "table-0:border-right-1",
          from: { x: 310, y: 20 },
          to: { x: 310, y: 76 },
          strokeStyle: "#cbd5e1",
          lineWidth: 1,
          lineCap: "butt"
        }
      ]
    });
  });

  it("uses resolved table style and cell shading when painting backgrounds and borders", () => {
    const styledSnapshot = {
      ...snapshot,
      style: {
        backgroundColor: "#fef3c7",
        borderColor: "#334155",
        borderWidth: 2
      },
      cells: [
        {
          ...snapshot.cells[0]!,
          shading: { fill: "fee2e2", color: null, pattern: null }
        },
        snapshot.cells[1]!
      ]
    } as unknown as QuireTableGeometrySnapshot;

    expect(buildQuireTablePaintModel(styledSnapshot)).toEqual(
      expect.objectContaining({
        backgrounds: [
          {
            id: "table-0:background",
            range: { from: 0, to: 20 },
            rect: { x: 10, y: 20, width: 300, height: 56 },
            fillStyle: "#fef3c7"
          },
          {
            id: "table-0:cell-0-0:background",
            range: { from: 2, to: 6 },
            rect: { x: 10, y: 20, width: 150, height: 28 },
            fillStyle: "#fee2e2"
          }
        ],
        borders: expect.arrayContaining([
          expect.objectContaining({
            id: "table-0:border-top-0",
            strokeStyle: "#334155",
            lineWidth: 2
          }),
          expect.objectContaining({
            id: "table-0:border-right-1",
            strokeStyle: "#334155",
            lineWidth: 2
          })
        ])
      })
    );
  });

  it("uses cell background-color shortcuts when shading has no fill", () => {
    const styledSnapshot = {
      ...snapshot,
      cells: [
        {
          ...snapshot.cells[0]!,
          backgroundColor: "#dbeafe"
        },
        {
          ...snapshot.cells[1]!,
          shading: { fill: "fee2e2", color: null, pattern: null },
          backgroundColor: "#dbeafe"
        }
      ]
    } as unknown as QuireTableGeometrySnapshot;

    expect(buildQuireTablePaintModel(styledSnapshot).backgrounds).toEqual([
      {
        id: "table-0:background",
        range: { from: 0, to: 20 },
        rect: { x: 10, y: 20, width: 300, height: 56 },
        fillStyle: "#ffffff"
      },
      {
        id: "table-0:cell-0-0:background",
        range: { from: 2, to: 6 },
        rect: { x: 10, y: 20, width: 150, height: 28 },
        fillStyle: "#dbeafe"
      },
      {
        id: "table-0:cell-0-1:background",
        range: { from: 8, to: 12 },
        rect: { x: 160, y: 20, width: 150, height: 28 },
        fillStyle: "#fee2e2"
      }
    ]);
  });

  it("paints row-offset fallback borders around real cells only", () => {
    const rowOffsetSnapshot = {
      ...snapshot,
      rect: { x: 10, y: 20, width: 300, height: 28 },
      tracks: [
        { id: "table-0:col-0", columnIndex: 0, x: 10, width: 100 },
        { id: "table-0:col-1", columnIndex: 1, x: 110, width: 100 },
        { id: "table-0:col-2", columnIndex: 2, x: 210, width: 100 }
      ],
      rows: [
        {
          ...snapshot.rows[0]!,
          gridBefore: { side: "before", startColumn: 0, columnSpan: 1 },
          gridAfter: { side: "after", startColumn: 2, columnSpan: 1 },
          rect: { x: 10, y: 20, width: 300, height: 28 }
        }
      ],
      cells: [
        {
          ...snapshot.cells[0]!,
          id: "table-0:cell-0-1",
          semanticCellId: "semantic:r0:c1:g1:1",
          originExplicitCellId: "cell:r0:c1:g1:1",
          explicitCellIds: ["cell:r0:c1:g1:1"],
          gridRect: {
            startRow: 0,
            rowSpan: 1,
            startColumn: 1,
            columnSpan: 1
          },
          rect: { x: 110, y: 20, width: 100, height: 28 },
          contentRect: { x: 115, y: 25, width: 90, height: 18 }
        }
      ]
    } as unknown as QuireTableGeometrySnapshot;
    const borders = buildQuireTablePaintModel(rowOffsetSnapshot).borders;

    expect(borders).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: { x: 110, y: 20.5 },
        to: { x: 210, y: 20.5 }
      }),
      expect.objectContaining({
        from: { x: 110, y: 47.5 },
        to: { x: 210, y: 47.5 }
      }),
      expect.objectContaining({
        from: { x: 110, y: 20 },
        to: { x: 110, y: 48 }
      }),
      expect.objectContaining({
        from: { x: 210, y: 20 },
        to: { x: 210, y: 48 }
      })
    ]));
    expect(borders).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: { x: 10, y: 20 },
        to: { x: 310, y: 20 }
      }),
      expect.objectContaining({
        from: { x: 10, y: 20 },
        to: { x: 10, y: 48 }
      }),
      expect.objectContaining({
        from: { x: 310, y: 20 },
        to: { x: 310, y: 48 }
      })
    ]));
  });

  it("maps dashed normalized border styles into line dash paint patterns", () => {
    const dashedSnapshot = {
      ...snapshot,
      borders: {
        top: { style: "dashed", width: 2, color: "ff0000", spacing: 0 },
        right: { style: "dotted", width: 1, color: "00ff00", spacing: 0 },
        bottom: { style: "single", width: 2, color: "ff0000", spacing: 0 },
        left: { style: "single", width: 2, color: "ff0000", spacing: 0 },
        insideH: { style: "single", width: 2, color: "ff0000", spacing: 0 },
        insideV: { style: "single", width: 2, color: "ff0000", spacing: 0 }
      }
    } as unknown as QuireTableGeometrySnapshot;

    expect(buildQuireTablePaintModel(dashedSnapshot).borders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "table-0:cell-0-0:border-top:table..table-0:cell-0-1:border-top:table",
          from: { x: 10, y: 21 },
          to: { x: 310, y: 21 },
          strokeStyle: "#ff0000",
          lineWidth: 2,
          lineCap: "square",
          lineDash: [6, 4]
        }),
        expect.objectContaining({
          from: { x: 310, y: 20 },
          to: { x: 310, y: 48 },
          strokeStyle: "#00ff00",
          lineWidth: 1,
          lineCap: "butt",
          lineDash: [1, 2]
        })
      ])
    );
  });

  // Each line of a compound border takes the nominal width: double fills 3 widths, triple 5.
  it("expands multi-stroke border styles into parallel line paints", () => {
    const multiStrokeSnapshot = {
      ...snapshot,
      borders: {
        top: { style: "double", width: 1, color: "0000ff", spacing: 0 },
        right: { style: "triple", width: 1, color: "00aa55", spacing: 0 },
        bottom: null,
        left: null,
        insideH: null,
        insideV: null
      }
    } as unknown as QuireTableGeometrySnapshot;

    expect(buildQuireTablePaintModel(multiStrokeSnapshot).borders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "table-0:cell-0-0:border-top:table#stroke-0..table-0:cell-0-1:border-top:table#stroke-0",
          from: { x: 10, y: 20.5 },
          to: { x: 310, y: 20.5 },
          strokeStyle: "#0000ff",
          lineWidth: 1
        }),
        expect.objectContaining({
          id: "table-0:cell-0-0:border-top:table#stroke-1..table-0:cell-0-1:border-top:table#stroke-1",
          from: { x: 10, y: 22.5 },
          to: { x: 310, y: 22.5 },
          strokeStyle: "#0000ff",
          lineWidth: 1
        }),
        expect.objectContaining({
          id: "table-0:cell-0-1:border-right:table#stroke-0",
          from: { x: 312, y: 20 },
          to: { x: 312, y: 48 },
          strokeStyle: "#00aa55",
          lineWidth: 1
        }),
        expect.objectContaining({
          id: "table-0:cell-0-1:border-right:table#stroke-1",
          from: { x: 310, y: 20 },
          to: { x: 310, y: 48 },
          strokeStyle: "#00aa55",
          lineWidth: 1
        }),
        expect.objectContaining({
          id: "table-0:cell-0-1:border-right:table#stroke-2",
          from: { x: 308, y: 20 },
          to: { x: 308, y: 48 },
          strokeStyle: "#00aa55",
          lineWidth: 1
        })
      ])
    );
  });

  it("keeps a neighbour's inherited line under a cell's nil edge and fills each line's band in its row", () => {
    const thick = { style: "single", width: 4, color: "000000", spacing: 0 };
    const nil = { style: "nil", width: null, color: null, spacing: null };
    const lowerCell = (column: number) => ({
      ...snapshot.cells[column]!, id: `table-0:cell-1-${column}`,
      gridRect: { startRow: 1, rowSpan: 1, startColumn: column, columnSpan: 1 },
      rect: { ...snapshot.cells[column]!.rect, y: 48 },
      borders: { top: nil, right: null, bottom: null, left: null, insideH: null, insideV: null }
    });
    const nilSnapshot = {
      ...snapshot,
      borders: { top: thick, right: thick, bottom: thick, left: thick, insideH: thick, insideV: thick },
      cells: [...snapshot.cells, lowerCell(0), lowerCell(1)]
    } as unknown as QuireTableGeometrySnapshot;
    const horizontal = buildQuireTablePaintModel(nilSnapshot).borders
      .filter(border => border.from.y === border.to.y).map(border => border.from.y);
    expect([...new Set(horizontal)].sort((a, b) => a - b)).toEqual([22, 50, 74]);
  });

  it("paints concrete diagonal cell borders from page-local cell rectangles", () => {
    const diagonalSnapshot = {
      ...snapshot,
      cells: [
        {
          ...snapshot.cells[0]!,
          borders: {
            top: null,
            right: null,
            bottom: null,
            left: null,
            insideH: null,
            insideV: null,
            tl2br: { style: "single", width: 2, color: "ff0000", spacing: 0 },
            tr2bl: { style: "nil", width: 2, color: "00ff00", spacing: 0 }
          }
        },
        {
          ...snapshot.cells[1]!,
          borders: {
            top: null,
            right: null,
            bottom: null,
            left: null,
            insideH: null,
            insideV: null,
            tl2br: null,
            tr2bl: { style: "single", width: 1, color: "00ff00", spacing: 0 }
          }
        }
      ]
    } as unknown as QuireTableGeometrySnapshot;
    const borders = buildQuireTablePaintModel(diagonalSnapshot).borders;

    const redDiagonal = borders.find((border) =>
      border.id === "table-0:cell-0-0:border-tl2br"
    );
    const greenDiagonal = borders.find((border) =>
      border.id === "table-0:cell-0-1:border-tr2bl"
    );

    expect(redDiagonal).toEqual(expect.objectContaining({
      id: "table-0:cell-0-0:border-tl2br",
      strokeStyle: "#ff0000",
      lineWidth: 2,
      lineCap: "butt"
    }));
    expect(redDiagonal?.from.x).toBeCloseTo(10.983);
    expect(redDiagonal?.from.y).toBeCloseTo(20.184);
    expect(redDiagonal?.to.x).toBeCloseTo(159.017);
    expect(redDiagonal?.to.y).toBeCloseTo(47.816);
    expect(greenDiagonal).toEqual(expect.objectContaining({
      id: "table-0:cell-0-1:border-tr2bl",
      strokeStyle: "#00ff00",
      lineWidth: 1,
      lineCap: "butt"
    }));
    expect(greenDiagonal?.from.x).toBeCloseTo(309.509);
    expect(greenDiagonal?.from.y).toBeCloseTo(20.092);
    expect(greenDiagonal?.to.x).toBeCloseTo(160.491);
    expect(greenDiagonal?.to.y).toBeCloseTo(47.908);
    expect(borders).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "table-0:cell-0-0:border-tr2bl" })
    ]));
  });
});
