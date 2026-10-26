import { describe, expect, it } from "vitest";
import { layoutQuireTableGeometry } from "../../geometry";
import type { QuireTableBorder, QuireTableBorders, QuireTableLayoutInput, QuireTableSource, QuireTableSourceCell } from "../../types";
import { resolveQuireTableBorderAllowance } from "./allowance";
import { resolveQuireTableColumnLineAllowance } from "./columns";
import { resolveQuireTableSideInset } from "./lines";
import { resolveQuireTableBorderOccupancy } from "./width";

/** @param style - Line style. @param points - Nominal width in points. @param spacing - Spacing in CSS pixels. @returns Border. */
function line(style: string, points: number, spacing: number | null = null): QuireTableBorder {
  return { style, width: points * 4 / 3, color: "#000000", spacing };
}

const nil: QuireTableBorder = { style: "nil", width: null, color: null, spacing: null };

/** @param border - Border for every table side and inner line, or null. @returns Complete table border map. */
function every(border: QuireTableBorder | null): QuireTableBorders {
  return { top: border, right: border, bottom: border, left: border, insideH: border, insideV: border };
}

/**
 * @param rowCount - Rows of a one-column table.
 * @param options - Table borders, per-row cell borders, a cell spanning every row, and row heights.
 * @returns Neutral layout request whose cells measure 12 px.
 */
function table(rowCount: number, options: {
  readonly borders?: QuireTableBorders | null;
  readonly cellBorders?: Readonly<Record<number, Partial<QuireTableBorders>>>;
  readonly span?: boolean;
  readonly heights?: readonly QuireTableSource["rows"][number]["height"][];
} = {}): QuireTableLayoutInput {
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({
    id: `row-${rowIndex}`, rowIndex, rowPos: rowIndex * 10 + 1, height: options.heights?.[rowIndex] ?? null,
    gridBefore: { side: "before" as const, startColumn: 0, columnSpan: 0 },
    gridAfter: { side: "after" as const, startColumn: 1, columnSpan: 0 },
    isHeader: false, cantSplit: false, cellSpacing: null
  }));
  const cells: QuireTableSourceCell[] = (options.span ? rows.slice(0, 1) : rows).map(row => ({
    id: `cell-${row.rowIndex}`, originExplicitCellId: `cell-${row.rowIndex}`, explicitCellIds: [`cell-${row.rowIndex}`],
    originCellPos: row.rowPos + 1, gridRect: { startRow: row.rowIndex, rowSpan: options.span ? rowCount : 1, startColumn: 0, columnSpan: 1 },
    contentRange: { from: row.rowPos + 2, to: row.rowPos + 8 }, shading: null, backgroundColor: null,
    borders: options.cellBorders?.[row.rowIndex] ? { ...every(null), ...options.cellBorders[row.rowIndex] } : null,
    cellMargins: null, preferredWidth: null, noWrap: null, verticalAlign: null, formatted: null
  }));
  const source: QuireTableSource = {
    tableId: "table", tableRange: { from: 0, to: rowCount * 10 }, rows, columns: [{ id: "column", columnIndex: 0, width: null }],
    semanticCells: cells, preferredWidth: null, layoutMode: null, alignment: null, tableIndent: null,
    defaultCellMargins: { top: { value: 0, unit: "px" }, right: { value: 0, unit: "px" }, bottom: { value: 0, unit: "px" }, left: { value: 0, unit: "px" } },
    cellSpacing: null, borders: options.borders === undefined ? every(nil) : options.borders, diagnostics: [],
    style: { backgroundColor: null, borderColor: "#000000", borderWidth: 1 }
  };
  return { tableId: "table", tableRange: source.tableRange, source,
    constraints: { rect: { x: 0, y: 0, width: 200, height: 0 }, defaultRowHeight: 0, defaultCellPadding: 4, defaultBorderWidth: 1 },
    measureContent: () => ({ height: 12 }) };
}

describe("table border occupancy", () => {
  it("measures line styles as Word lays them out", () => {
    expect(resolveQuireTableBorderOccupancy(nil)).toBe(0);
    expect(resolveQuireTableBorderOccupancy(null)).toBe(0);
    expect(resolveQuireTableBorderOccupancy(line("single", 3))).toBe(4);
    expect(resolveQuireTableBorderOccupancy(line("double", 1.5))).toBe(6);
    expect(resolveQuireTableBorderOccupancy(line("triple", 0.75))).toBe(5);
    expect(resolveQuireTableBorderOccupancy(line("thickThinSmallGap", 3))).toBe(6);
    expect(resolveQuireTableBorderOccupancy(line("thinThickThinLargeGap", 1.5))).toBe(8);
    expect(resolveQuireTableBorderOccupancy(line("doubleWave", 3))).toBe(7);
    expect(resolveQuireTableBorderOccupancy(line("single", 3, 16 / 3))).toBeCloseTo(28 / 3);
  });

  it("gives each horizontal line the widest edge of the cells on it", () => {
    expect(resolveQuireTableBorderAllowance(table(3).source)).toEqual({ rowTop: [0, 0, 0], bottom: 0 });
    expect(resolveQuireTableBorderAllowance(table(3, { borders: every(line("single", 3)) }).source)).toEqual({ rowTop: [4, 4, 4], bottom: 4 });
    expect(resolveQuireTableBorderAllowance(table(3, { borders: { ...every(nil), insideH: line("single", 3) } }).source))
      .toEqual({ rowTop: [0, 4, 4], bottom: 0 });
    // A wider bottom edge of one cell and a narrower top edge of the next settle on the wider one, either way round.
    for (const [above, below] of [[1, 3], [3, 1]] as const) {
      const input = table(3, { cellBorders: { 0: { bottom: line("single", above) }, 1: { top: line("single", below) } } });
      expect(resolveQuireTableBorderAllowance(input.source).rowTop[1]).toBe(4);
    }
  });

  it("lets a cell's nil edge hide only its own side, not the neighbour's inherited line", () => {
    const input = table(3, { borders: every(line("single", 3)), cellBorders: { 1: { top: nil } } });
    expect(resolveQuireTableBorderAllowance(input.source).rowTop[1]).toBe(4);
  });

  it("keeps the one-pixel default grid for a table without border metadata", () => {
    expect(resolveQuireTableBorderAllowance(table(2, { borders: null }).source)).toEqual({ rowTop: [1, 1], bottom: 1 });
  });

  it("skips lines a merged cell crosses", () => {
    const input = table(3, { borders: every(line("single", 3)), span: true });
    expect(resolveQuireTableBorderAllowance(input.source)).toEqual({ rowTop: [4, 0, 0], bottom: 4 });
  });

  it("puts the line above inside exact rows and outside at-least rows, and the bottom edge below the last row", () => {
    const borders = every(line("single", 3));
    const auto = layoutQuireTableGeometry(table(2, { borders }));
    expect(auto.sizing!.rowHeights).toEqual([16, 20]);
    expect(auto.cells.map(cell => cell.contentRect.y)).toEqual([4, 20]);
    const exact = layoutQuireTableGeometry(table(2, { borders, heights: [{ rule: "exact", value: 40 }, { rule: "exact", value: 40 }] }));
    expect(exact.sizing!.rowHeights).toEqual([40, 44]);
    const atLeast = layoutQuireTableGeometry(table(2, { borders, heights: [{ rule: "at-least", value: 40 }, { rule: "at-least", value: 40 }] }));
    expect(atLeast.sizing!.rowHeights).toEqual([44, 48]);
  });

  it("gives each cell the widest vertical line on its sides and keeps text clear of it", () => {
    const twoColumns = (options: Parameters<typeof table>[1] = {}) => {
      const input = table(2, options);
      const cells = input.source.semanticCells.flatMap(cell => [
        { ...cell, id: `${cell.id}-a`, gridRect: { ...cell.gridRect, startColumn: 0 } },
        { ...cell, id: `${cell.id}-b`, borders: null, gridRect: { ...cell.gridRect, startColumn: 1 } }
      ]);
      return { ...input.source, columns: [...input.source.columns, { id: "column-2", columnIndex: 1, width: null }], semanticCells: cells };
    };
    const lines = resolveQuireTableColumnLineAllowance(twoColumns({ borders: { ...every(nil), left: line("single", 3), insideV: line("single", 0.75) } }));
    expect([lines.left.get("cell-0-a"), lines.right.get("cell-0-a"), lines.left.get("cell-0-b"), lines.right.get("cell-0-b")]).toEqual([4, 1, 1, 0]);
    // A cell's nil side does not hide the neighbour's inherited line; a wider cell side wins the shared line.
    const conflict = resolveQuireTableColumnLineAllowance(twoColumns({ borders: every(line("single", 0.75)),
      cellBorders: { 0: { right: nil }, 1: { right: line("double", 1.5) } } }));
    expect([conflict.right.get("cell-0-a"), conflict.left.get("cell-0-b"), conflict.right.get("cell-1-a"), conflict.left.get("cell-1-b")]).toEqual([1, 1, 6, 6]);
    // Word keeps the text clear of half the centred line or the margin, whichever is wider.
    expect(resolveQuireTableSideInset(4, 0)).toBe(2);
    expect(resolveQuireTableSideInset(4, 7.2)).toBeCloseTo(7.2);
  });
});
