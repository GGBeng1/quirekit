import { describe, expect, it } from "vitest";
import { layoutQuireTableGeometry } from "./geometry";
import type {
  QuireTableLayoutInput,
  QuireTableSource,
  QuireTableSourceCell
} from "./types";

/**
 * Creates one normalized semantic cell for the geometry fixture.
 *
 * @param rowIndex - Zero-based source row index.
 * @param columnIndex - Zero-based source column index.
 * @returns Normalized semantic cell occupying one grid slot.
 */
function createCell(
  rowIndex: number,
  columnIndex: number
): QuireTableSourceCell {
  const id = `cell:${rowIndex}:${columnIndex}`;
  const position = 2 + ((rowIndex * 2 + columnIndex) * 4);

  return {
    id,
    originExplicitCellId: id,
    explicitCellIds: [id],
    originCellPos: position,
    gridRect: { startRow: rowIndex, rowSpan: 1, startColumn: columnIndex, columnSpan: 1 },
    contentRange: { from: position, to: position + 3 },
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    noWrap: null,
    verticalAlign: null,
    formatted: null
  };
}

/**
 * Creates the normalized two-by-two table used by geometry tests.
 *
 * @returns Normalized table source with two rows and two columns.
 */
function createSource(): QuireTableSource {
  return {
    tableId: "table-0",
    tableRange: { from: 0, to: 20 },
    rows: [
      {
        id: "row-0",
        rowIndex: 0,
        rowPos: 1,
        gridBefore: { side: "before", startColumn: 0, columnSpan: 0 },
        gridAfter: { side: "after", startColumn: 2, columnSpan: 0 },
        isHeader: false,
        height: null,
        cantSplit: false,
        cellSpacing: null
      },
      {
        id: "row-1",
        rowIndex: 1,
        rowPos: 10,
        gridBefore: { side: "before", startColumn: 0, columnSpan: 0 },
        gridAfter: { side: "after", startColumn: 2, columnSpan: 0 },
        isHeader: false,
        height: null,
        cantSplit: false,
        cellSpacing: null
      }
    ],
    columns: [
      { id: "column-0", columnIndex: 0, width: null },
      { id: "column-1", columnIndex: 1, width: null }
    ],
    preferredWidth: null,
    layoutMode: null,
    alignment: null,
    tableIndent: null,
    defaultCellMargins: null,
    cellSpacing: null,
    borders: null,
    semanticCells: [
      createCell(0, 0),
      createCell(0, 1),
      createCell(1, 0),
      createCell(1, 1)
    ],
    diagnostics: [],
    style: {
      backgroundColor: null,
      borderColor: "#cbd5e1",
      borderWidth: 1
    }
  };
}

/**
 * Creates a geometry request for one normalized table source.
 *
 * @param source - Normalized source to lay out.
 * @returns Complete neutral geometry input.
 */
function createInput(source: QuireTableSource): QuireTableLayoutInput {
  return {
    tableId: source.tableId,
    tableRange: source.tableRange,
    source,
    constraints: {
      rect: { x: 10, y: 20, width: 300, height: 0 },
      defaultRowHeight: 28,
      defaultCellPadding: 4,
      defaultBorderWidth: 1
    },
    measureContent: () => ({ height: 12 })
  };
}

describe("normalized table geometry", () => {
  it("retains content-safe source sizing, excluding row gaps and alignment slack", () => {
    const source = createSource();
    const input = createInput({ ...source, cellSpacing: { value: 8, unit: "px" },
      rows: source.rows.map(row => ({ ...row, height: { value: 80, rule: "at-least" } })),
      semanticCells: source.semanticCells.map(cell => ({ ...cell, verticalAlign: "center" })) });
    let measurements = 0;
    const geometry = layoutQuireTableGeometry({ ...input, measureContent: () => { measurements += 1; return { height: 12 }; } });
    expect(measurements).toBe(4);
    expect(geometry.sizing).toEqual({ width: 300, columnWidths: [138, 138], rowHeights: [80, 80],
      cellMinimumHeights: [
        { startRow: 0, rowSpan: 1, height: 22 }, { startRow: 0, rowSpan: 1, height: 22 },
        { startRow: 1, rowSpan: 1, height: 22 }, { startRow: 1, rowSpan: 1, height: 22 }
      ] });
  });
  it("resolves stable geometry identity, tracks, rows, and cells", () => {
    const geometry = layoutQuireTableGeometry(createInput(createSource()));

    expect(geometry.geometryId).toBe("table-0");
    // The indent locates the outer edge of the one-pixel left line, so the grid starts half a pixel in.
    expect(geometry.rect).toEqual({ x: 10.5, y: 20, width: 300, height: 56 });
    expect(geometry.tracks.map((track) => ({ x: track.x, width: track.width })))
      .toEqual([{ x: 10.5, width: 150 }, { x: 160.5, width: 150 }]);
    expect(geometry.rows.map((row) => row.rect.height)).toEqual([28, 28]);
    // Only the line above a row reserves space inside it; the table's bottom edge belongs to the last row.
    // Text keeps clear of half the centred line or the 4 px margin, whichever is wider.
    expect(geometry.cells[0]?.contentRect).toEqual({
      x: 14.5,
      y: 25,
      width: 142,
      height: 19
    });
  });

  it("applies normalized row heights and cell margins", () => {
    const source = createSource();
    const geometry = layoutQuireTableGeometry(createInput({
      ...source,
      rows: [
        { ...source.rows[0]!, height: { value: 40, rule: "at-least" } },
        source.rows[1]!
      ],
      semanticCells: [
        {
          ...source.semanticCells[0]!,
          cellMargins: {
            top: { value: 5, unit: "px" },
            right: { value: 20, unit: "px" },
            bottom: { value: 10, unit: "px" },
            left: { value: 10, unit: "px" }
          }
        },
        ...source.semanticCells.slice(1)
      ]
    }));

    // An at-least height excludes the line above the row.
    expect(geometry.rows.map((row) => row.rect.height)).toEqual([41, 28]);
    expect(geometry.cells[0]?.contentRect).toEqual({
      x: 20.5,
      y: 26,
      width: 120,
      height: 25
    });
  });

  it("keeps separated-border spacing inside the neutral kernel", () => {
    const source = createSource();
    const geometry = layoutQuireTableGeometry(createInput({
      ...source,
      cellSpacing: { value: 8, unit: "px" }
    }));

    expect(geometry.rect.height).toBe(80);
    expect(geometry.cellSpacing).toBe(8);
    expect(geometry.tracks.map((track) => ({ x: track.x, width: track.width })))
      .toEqual([{ x: 18, width: 138 }, { x: 164, width: 138 }]);
    expect(geometry.cells[0]?.rect).toEqual({
      x: 18,
      y: 28,
      width: 138,
      height: 28
    });
  });

  it("centers an auto-width table from its concrete grid tracks", () => {
    const source = createSource();
    const geometry = layoutQuireTableGeometry(createInput({
      ...source,
      alignment: "center",
      preferredWidth: { value: null, unit: "auto" },
      columns: [
        { ...source.columns[0]!, width: { value: 80, unit: "px" } },
        { ...source.columns[1]!, width: { value: 120, unit: "px" } }
      ]
    }));

    expect(geometry.rect).toEqual({ x: 60, y: 20, width: 200, height: 56 });
    expect(geometry.tracks.map((track) => ({ x: track.x, width: track.width })))
      .toEqual([{ x: 60, width: 80 }, { x: 140, width: 120 }]);
  });

  it("right-aligns an auto-width table without changing its grid widths", () => {
    const source = createSource();
    const geometry = layoutQuireTableGeometry(createInput({
      ...source,
      alignment: "right",
      preferredWidth: { value: 0, unit: "auto" },
      columns: [
        { ...source.columns[0]!, width: { value: 80, unit: "px" } },
        { ...source.columns[1]!, width: { value: 120, unit: "px" } }
      ]
    }));

    expect(geometry.rect.x).toBe(110);
    expect(geometry.rect.width).toBe(200);
    expect(geometry.tracks.map((track) => track.width)).toEqual([80, 120]);
  });

  it("expands the final covered row for spanning content", () => {
    const source = createSource();
    const spanningCell = {
      ...source.semanticCells[0]!,
      explicitCellIds: ["cell:0:0", "cell:1:0"],
      gridRect: { startRow: 0, rowSpan: 2, startColumn: 0, columnSpan: 1 }
    } satisfies QuireTableSourceCell;
    const geometry = layoutQuireTableGeometry({
      ...createInput({
        ...source,
        semanticCells: [
          spanningCell,
          source.semanticCells[1]!,
          source.semanticCells[3]!
        ]
      }),
      measureContent: (cell) => ({ height: cell.id === spanningCell.id ? 110 : 12 })
    });

    expect(geometry.rect.height).toBe(120);
    expect(geometry.rows.map((row) => row.rect.height)).toEqual([28, 92]);
    expect(geometry.cells[0]?.rect.height).toBe(120);
  });
});
