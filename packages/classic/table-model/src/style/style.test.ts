import type { QuireJSONContent } from "@quirekit/core";
import { Schema } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createWordTableMap } from "../map";
import { wordTableNodeSpecs } from "../schema";
import type { WordTableBorder } from "../types";
import {
  createWordTableLookAttrs,
  defaultWordTableStyleLook,
  installWordTableStyleDefinition,
  resolveWordTableStyle,
  resolveWordTableStyleAppearance,
  resolveWordTableStyleLook,
  resolveWordTableStyleRegistry,
  wordTableBuiltinStyles,
  wordThreeLineTableLook,
  wordThreeLineTableStyleId,
  type WordTableStyleDefinition,
  type WordTableStyleFormatting,
  type WordTableStyleRegistry
} from ".";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Builds a table map from row cell attributes.
 *
 * @param rows - Cell attributes per row.
 * @param rowAttrs - Optional attributes per row.
 * @returns Table map.
 */
function tableMap(
  rows: readonly (readonly Record<string, unknown>[])[],
  rowAttrs: readonly Record<string, unknown>[] = []
) {
  const json: QuireJSONContent = {
    type: "wordTable",
    content: rows.map((cells, index) => ({
      type: "wordTableRow",
      attrs: rowAttrs[index] ?? {},
      content: cells.map(attrs => ({
        type: "wordTableCell",
        attrs,
        content: [{ type: "paragraph" }]
      }))
    }))
  };
  return createWordTableMap(schema.nodeFromJSON(json));
}

/**
 * Builds a uniform grid map.
 *
 * @param rows - Row count.
 * @param columns - Column count.
 * @param rowAttrs - Optional attributes per row.
 * @returns Table map.
 */
function grid(rows: number, columns: number, rowAttrs: readonly Record<string, unknown>[] = []) {
  return tableMap(
    Array.from({ length: rows }, () => Array.from({ length: columns }, () => ({}))),
    rowAttrs
  );
}

/** @param size - Width in eighths of a point. @returns Single border. */
function single(size: number): WordTableBorder {
  return { style: "single", size, color: "auto", space: 0 };
}

const nil: WordTableBorder = { style: "nil", size: null, color: null, space: null };

const none: WordTableStyleFormatting = { table: null, row: null, cell: null, paragraph: null, text: null };

/**
 * Creates a registry from definitions.
 *
 * @param styles - Definitions to install.
 * @returns Registry.
 */
function registry(...styles: WordTableStyleDefinition[]): WordTableStyleRegistry {
  return styles.reduce(installWordTableStyleDefinition, resolveWordTableStyleRegistry(null));
}

/**
 * Creates a style definition.
 *
 * @param id - Style id.
 * @param overrides - Definition fields.
 * @returns Definition.
 */
function style(id: string, overrides: Partial<WordTableStyleDefinition> = {}): WordTableStyleDefinition {
  return {
    id,
    name: id,
    basedOn: null,
    isDefault: false,
    custom: true,
    uiPriority: null,
    hidden: false,
    semiHidden: false,
    base: none,
    regions: {},
    ...overrides
  };
}

/**
 * Reads the grid position of each semantic cell as `row:column`.
 *
 * @param map - Table map.
 * @returns Semantic cell id to position.
 */
function positions(map: ReturnType<typeof grid>): Map<string, string> {
  return new Map(map.semanticCells.map(cell => [`${cell.rect.startRow}:${cell.rect.startColumn}`, cell.id]));
}

describe("table style look", () => {
  it("assumes 0x04A0 when the table omits tblLook", () => {
    expect(resolveWordTableStyleLook(null)).toEqual(defaultWordTableStyleLook);
  });

  it("reads the legacy bitmask only without boolean attributes", () => {
    expect(resolveWordTableStyleLook({ rawValue: "0060" })).toMatchObject({
      firstRow: true,
      lastRow: true,
      firstColumn: false,
      bandedRows: true,
      bandedColumns: true
    });
    expect(resolveWordTableStyleLook({ firstRow: false, rawValue: "04A0" }).firstRow).toBe(false);
  });

  it("writes a synchronized bitmask", () => {
    expect(createWordTableLookAttrs(defaultWordTableStyleLook).rawValue).toBe("04A0");
  });
});

describe("table style chain", () => {
  it("compiles default then selected chains base to leaf and folds wholeTable", () => {
    const styles = registry(
      style("Default", { isDefault: true, base: { ...none, table: { borders: { top: single(2), left: single(2) } } } }),
      style("Parent", { basedOn: "Default", base: { ...none, table: { borders: { top: single(4) } } } }),
      style("Child", {
        basedOn: "Parent",
        base: { ...none, table: { borders: { left: single(8) } } },
        regions: { wholeTable: { ...none, cell: { verticalAlign: "center" } } }
      })
    );
    const resolved = resolveWordTableStyle({ ...styles, defaultStyleId: "Default" }, "Child");
    expect(resolved.chain).toEqual(["Default", "Parent", "Child"]);
    expect(resolved.base.table?.borders).toEqual({ top: single(4), left: single(8) });
    expect(resolved.base.cell?.verticalAlign).toBe("center");
    expect(resolved.regions.wholeTable).toBeUndefined();
  });

  it("stops at inheritance cycles", () => {
    const styles = registry(style("A", { basedOn: "B" }), style("B", { basedOn: "A" }));
    expect(resolveWordTableStyle(styles, "A").chain).toEqual(["B", "A"]);
  });
});

describe("table style appearance", () => {
  it("draws a three-line table with only horizontal rules", () => {
    const map = grid(4, 3);
    const appearance = resolveWordTableStyleAppearance({
      registry: registry(...wordTableBuiltinStyles),
      map,
      styleId: wordThreeLineTableStyleId,
      tableLook: createWordTableLookAttrs(wordThreeLineTableLook)
    });
    const at = positions(map);
    expect(appearance.table.borders).toMatchObject({ top: single(12), bottom: single(12), insideV: nil });
    for (let column = 0; column < 3; column++) {
      expect(appearance.cells.get(at.get(`0:${column}`)!)?.borders.bottom).toEqual(single(6));
      expect(appearance.cells.get(at.get(`1:${column}`)!)?.borders.bottom).toBeUndefined();
    }
    expect(appearance.cells.get(at.get("2:1")!)?.regions).toEqual([]);
  });

  it("maps region insideH and insideV relative to the region (D1)", () => {
    const header = style("Header", {
      regions: {
        firstRow: { ...none, cell: { borders: { insideV: single(4), right: nil, bottom: single(8) } } }
      }
    });
    const map = grid(2, 3);
    const at = positions(map);
    const cells = resolveWordTableStyleAppearance({
      registry: registry(header), map, styleId: "Header", tableLook: null
    }).cells;
    expect(cells.get(at.get("0:0")!)?.borders).toEqual({ right: single(4), bottom: single(8) });
    expect(cells.get(at.get("0:1")!)?.borders).toMatchObject({ left: single(4), right: single(4) });
    expect(cells.get(at.get("0:2")!)?.borders.right).toEqual(nil);
    expect(cells.get(at.get("1:0")!)?.borders).toEqual({});
  });

  it("applies corner regions only when both switches are on (D2)", () => {
    const corner = style("Corner", {
      regions: {
        firstRow: { ...none, cell: { shading: { fill: "AAAAAA", color: null, pattern: "clear" } } },
        northWestCell: { ...none, cell: { shading: { fill: "FF0000", color: null, pattern: "clear" } } }
      }
    });
    const map = grid(2, 2);
    const at = positions(map);
    const onBoth = resolveWordTableStyleAppearance({
      registry: registry(corner), map, styleId: "Corner", tableLook: { firstRow: true, firstColumn: true }
    }).cells.get(at.get("0:0")!);
    const onRow = resolveWordTableStyleAppearance({
      registry: registry(corner), map, styleId: "Corner", tableLook: { firstRow: true, firstColumn: false }
    }).cells.get(at.get("0:0")!);
    expect(onBoth?.shading?.fill).toBe("FF0000");
    expect(onRow?.shading?.fill).toBe("AAAAAA");
    expect(onRow?.regions).toEqual(["firstRow"]);
  });

  it("treats contiguous repeating header rows as the header region (D3)", () => {
    const map = grid(4, 1, [{ isHeader: true }, { isHeader: true }, {}, { isHeader: true }]);
    const at = positions(map);
    const cells = resolveWordTableStyleAppearance({
      registry: registry(style("S")), map, styleId: "S", tableLook: { firstRow: true, bandedRows: false }
    }).cells;
    expect(cells.get(at.get("0:0")!)?.regions).toEqual(["firstRow"]);
    expect(cells.get(at.get("1:0")!)?.regions).toEqual(["firstRow"]);
    expect(cells.get(at.get("3:0")!)?.regions).toEqual([]);
  });

  it("counts row bands after header rows and disables band size zero (D4)", () => {
    const banded = style("Banded", {
      base: { ...none, table: { rowBandSize: 1 } },
      regions: { band1Horizontal: none, band2Horizontal: none }
    });
    const map = grid(5, 1);
    const at = positions(map);
    const cells = resolveWordTableStyleAppearance({
      registry: registry(banded), map, styleId: "Banded", tableLook: { firstRow: true, lastRow: true, bandedRows: true }
    }).cells;
    expect([0, 1, 2, 3, 4].map(row => cells.get(at.get(`${row}:0`)!)?.regions)).toEqual([
      ["firstRow"],
      ["band1Horizontal"],
      ["band2Horizontal"],
      ["band1Horizontal"],
      ["band2Horizontal", "lastRow"]
    ]);
    const unsized = resolveWordTableStyleAppearance({
      registry: registry(style("Unsized")), map, styleId: "Unsized", tableLook: { firstRow: false, bandedRows: true }
    }).cells;
    expect(unsized.get(at.get("1:0")!)?.regions).toEqual([]);
  });

  it("applies conditional vertical alignment to whole rows", () => {
    const firstColumn = style("FirstColumn", {
      regions: { firstColumn: { ...none, cell: { verticalAlign: "bottom", shading: { fill: "EEEEEE", color: null, pattern: "clear" } } } }
    });
    const map = grid(1, 2);
    const at = positions(map);
    const other = resolveWordTableStyleAppearance({
      registry: registry(firstColumn), map, styleId: "FirstColumn", tableLook: { firstColumn: true }
    }).cells.get(at.get("0:1")!);
    expect(other?.verticalAlign).toBe("bottom");
    expect(other?.shading).toBeNull();
  });

  it("falls back to the default style for an unknown style id", () => {
    const map = grid(1, 1);
    const appearance = resolveWordTableStyleAppearance({
      registry: { ...registry(...wordTableBuiltinStyles), defaultStyleId: "TableNormal" },
      map,
      styleId: "Missing",
      tableLook: null
    });
    expect(appearance.styleId).toBe("TableNormal");
    expect(appearance.table.cellMargins?.left).toEqual({ value: 108, unit: "dxa" });
  });
});
