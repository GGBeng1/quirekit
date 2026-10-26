import { describe, expect, it } from "vitest";
import { layoutQuireTableGeometry } from "../geometry";
import type { QuireTableLayoutInput, QuireTableSourceRow } from "../types";

/**
 * Creates a one-column table with controlled content measurements.
 * @param heights - Source row rules in CSS pixels.
 * @param contentHeight - Measured content height before insets.
 * @param span - Whether the first cell covers every row.
 * @returns Complete neutral table layout request.
 */
function input(
  heights: readonly QuireTableSourceRow["height"][],
  contentHeight = 12,
  span = false
): QuireTableLayoutInput {
  const rows = heights.map((height, rowIndex) => ({
    id: `row-${rowIndex}`, rowIndex, rowPos: rowIndex * 10 + 1, height,
    gridBefore: { side: "before" as const, startColumn: 0, columnSpan: 0 },
    gridAfter: { side: "after" as const, startColumn: 1, columnSpan: 0 },
    isHeader: false, cantSplit: false, cellSpacing: null
  }));
  return {
    tableId: "table", tableRange: { from: 0, to: rows.length * 10 },
    source: {
      tableId: "table", tableRange: { from: 0, to: rows.length * 10 }, rows,
      columns: [{ id: "column", columnIndex: 0, width: null }],
      semanticCells: (span ? rows.slice(0, 1) : rows).map(row => ({
        id: `cell-${row.rowIndex}`, originExplicitCellId: `cell-${row.rowIndex}`,
        explicitCellIds: [`cell-${row.rowIndex}`], originCellPos: row.rowPos + 1,
        gridRect: { startRow: row.rowIndex, rowSpan: span ? rows.length : 1, startColumn: 0, columnSpan: 1 },
        contentRange: { from: row.rowPos + 2, to: row.rowPos + 8 },
        shading: null, backgroundColor: null, borders: null, cellMargins: null,
        preferredWidth: null, noWrap: null, verticalAlign: null, formatted: null
      })),
      preferredWidth: null, layoutMode: null, alignment: null, tableIndent: null,
      defaultCellMargins: null, cellSpacing: null, borders: null, diagnostics: [],
      style: { backgroundColor: null, borderColor: "#000000", borderWidth: 1 }
    },
    constraints: {
      rect: { x: 0, y: 0, width: 200, height: 0 },
      defaultRowHeight: 28, defaultCellPadding: 4, defaultBorderWidth: 1
    },
    measureContent: () => ({ height: contentHeight })
  };
}

describe("explicit table row heights", () => {
  it("retains the automatic preset while allowing smaller content-safe explicit heights", () => {
    const geometry = layoutQuireTableGeometry(input([null, { rule: "auto", value: 100 }, { rule: "at-least", value: 12 }]));
    expect(geometry.sizing!.rowHeights).toEqual([28, 28, 22]);
  });

  // The default one-pixel grid applies: an exact last row adds the table's bottom edge below its height.
  it("sizes automatic rows of an imported table by content alone, without the authoring default", () => {
    const authored = input([null, { rule: "at-least", value: 12 }]);
    const imported = { ...authored, source: { ...authored.source, contentSizedRows: true } };
    expect(layoutQuireTableGeometry(imported).sizing!.rowHeights).toEqual([21, 22]);
  });

  it("honors exact heights independently of content and preserves measured intrinsic sizing", () => {
    const geometry = layoutQuireTableGeometry(input([{ rule: "exact", value: 12 }], 80));
    expect(geometry.sizing!.rowHeights).toEqual([13]);
    expect(geometry.sizing!.cellMinimumHeights[0]?.height).toBe(90);
    expect(geometry.cells[0]?.contentRect).toEqual({ x: 4.5, y: 5, width: 192, height: 3 });
  });

  it.each([
    [[{ rule: "exact", value: 12 }, null], [12, 78]],
    [[null, { rule: "exact", value: 12 }], [77, 13]],
    [[{ rule: "exact", value: 12 }, { rule: "exact", value: 12 }], [12, 13]]
  ] as const)("grows only non-exact rows under a spanning cell: %j", (heights, expected) => {
    expect(layoutQuireTableGeometry(input(heights, 80, true)).sizing!.rowHeights).toEqual(expected);
  });

  it("keeps an empty content clip inside a row shorter than its insets", () => {
    const geometry = layoutQuireTableGeometry(input([{ rule: "exact", value: 3 }]));
    const cell = geometry.cells[0]!;
    expect(cell.rect.height).toBe(4);
    expect(cell.contentRect.height).toBe(0);
    expect(cell.contentRect.y).toBeLessThanOrEqual(cell.rect.y + cell.rect.height);
  });
});
