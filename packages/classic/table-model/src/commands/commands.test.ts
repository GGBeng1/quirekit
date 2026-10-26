import { Schema, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createWordTableMap } from "../map";
import { wordTableNodeSpecs } from "../schema";
import {
  addWordTableColumn,
  deleteWordTableColumns,
  moveWordTableColumns
} from "./column";
import { addWordTableCell, deleteWordTableCell } from "./cell";
import {
  distributeWordTableColumns,
  distributeWordTableRows,
  clearWordTableCellFormatting,
  setWordTableAttrs,
  setWordTableCellAttrs,
  setWordTableCellBorders,
  setWordTableColumnWidth,
  setWordTableRowAttrs,
  setWordTableRowHeight,
  toggleWordTableHeaderRow,
  toggleWordTableRowCantSplit
} from "./formatting";
import { createWordTableNode } from "./insert";
import { mergeWordTableCells } from "./merge";
import {
  repairWordTable,
  repairWordTableGridSpanColspan,
  repairWordTableVerticalMerges
} from "./repair";
import { addWordTableRow, deleteWordTableRows, moveWordTableRows } from "./row";
import { splitWordTableCell } from "./split";
import type { WordTableCommandResult } from "./types";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Unwraps a successful command result.
 *
 * @param result - Command result to unwrap.
 * @returns Result value.
 */
function unwrap<Value>(result: WordTableCommandResult<Value>): Value {
  if (!result.ok) {
    throw new Error(
      `Expected command success, got ${result.reason}: `
      + JSON.stringify(result.diagnostics ?? [])
    );
  }

  return result.value;
}

/**
 * Creates a basic parsed Word table node.
 *
 * @param rowCount - Row count.
 * @param columnCount - Column count.
 * @returns Parsed Word table node.
 */
function table(rowCount: number, columnCount: number): PMNode {
  return unwrap(createWordTableNode(schema, { rowCount, columnCount }));
}

/**
 * Parses a custom Word table node from JSON.
 *
 * @param content - Row content JSON.
 * @param attrs - Optional table attrs.
 * @returns Parsed Word table node.
 */
function customTable(
  content: readonly unknown[],
  attrs: Record<string, unknown> = {}
): PMNode {
  return schema.nodeFromJSON({
    type: "wordTable",
    attrs,
    content
  });
}

/**
 * Creates a row JSON object.
 *
 * @param cells - Cell JSON objects.
 * @returns Row JSON.
 */
function row(
  cells: readonly unknown[],
  attrs: Record<string, unknown> = {}
): unknown {
  return { type: "wordTableRow", attrs, content: cells };
}

/**
 * Creates a cell JSON object.
 *
 * @param attrs - Optional cell attrs.
 * @returns Cell JSON.
 */
function cell(attrs: Record<string, unknown> = {}): unknown {
  return {
    type: "wordTableCell",
    attrs,
    content: [{ type: "paragraph" }]
  };
}

/**
 * Creates a cell JSON object with text content.
 *
 * @param text - Text content.
 * @param attrs - Optional cell attrs.
 * @returns Cell JSON.
 */
function textCell(text: string, attrs: Record<string, unknown> = {}): unknown {
  return {
    type: "wordTableCell",
    attrs,
    content: [{
      type: "paragraph",
      content: [{ type: "text", text }]
    }]
  };
}

describe("Word table commands", () => {
  it("word-table-command-insert-basic creates a rectangular table", () => {
    const node = table(2, 3);
    const map = createWordTableMap(node);

    expect(node.childCount).toBe(2);
    expect(node.child(0).childCount).toBe(3);
    expect(map.width).toBe(3);
    expect(map.height).toBe(2);
    expect(node.attrs).toMatchObject({
      tableStyle: "TableGrid",
      width: { value: 5000, unit: "pct" },
      tableLayout: "autofit",
      borders: {
        top: { style: "single", size: 4, color: "auto" },
        right: { style: "single", size: 4, color: "auto" },
        bottom: { style: "single", size: 4, color: "auto" },
        left: { style: "single", size: 4, color: "auto" },
        insideH: { style: "single", size: 4, color: "auto" },
        insideV: { style: "single", size: 4, color: "auto" }
      },
      grid: [{ width: null }, { width: null }, { width: null }]
    });
  });

  it("word-table-command-insert-basic preserves an explicit border override", () => {
    const border = {
      style: "double",
      size: 12,
      color: "4B67F2",
      space: 0,
      shadow: false,
      frame: false
    };
    const borders = {
      top: border,
      right: border,
      bottom: border,
      left: border,
      insideH: border,
      insideV: border,
      tl2br: null,
      tr2bl: null
    };
    const node = unwrap(createWordTableNode(schema, {
      rowCount: 2,
      columnCount: 2,
      tableAttrs: { borders }
    }));

    expect(node.attrs.borders).toEqual(borders);
  });

  it("word-table-command-add-row-simple inserts a full-width row", () => {
    const result = unwrap(addWordTableRow(table(2, 2), {
      rowIndex: 0,
      side: "after"
    }));

    expect(result.childCount).toBe(3);
    expect(result.child(1).childCount).toBe(2);
  });

  it("word-table-command-add-row-through-vmerge preserves vertical merge chains", () => {
    const source = customTable([
      row([cell({ vMerge: "restart", rowspan: 2 }), cell()]),
      row([cell({ vMerge: "continue" }), cell()])
    ]);
    const result = unwrap(addWordTableRow(source, {
      rowIndex: 0,
      side: "after"
    }));
    const map = createWordTableMap(result);

    expect(result.child(1).child(0).attrs.vMerge).toBe("continue");
    expect(result.child(0).child(0).attrs.rowspan).toBe(3);
    expect(map.semanticCells[0]?.rowSpan).toBe(3);
  });

  it("word-table-command-delete-row-normalizes-orphan-vmerge", () => {
    const source = customTable([
      row([cell({ vMerge: "restart", rowspan: 2 }), cell()]),
      row([cell({ vMerge: "continue" }), cell()])
    ]);
    const result = unwrap(deleteWordTableRows(source, { from: 0 }));

    expect(result?.child(0).child(0).attrs.vMerge).toBeNull();
    expect(result?.child(0).child(0).attrs.rowspan).toBe(1);
  });

  it("word-table-command-move-row moves a row range to a source boundary", () => {
    const source = customTable([
      row([textCell("r0")]),
      row([textCell("r1")]),
      row([textCell("r2")])
    ]);
    const result = unwrap(moveWordTableRows(source, {
      from: 0,
      targetIndex: 3
    }));

    expect(result.child(0).textContent).toBe("r1");
    expect(result.child(1).textContent).toBe("r2");
    expect(result.child(2).textContent).toBe("r0");
  });

  it("word-table-command-move-row-rejects-partial-merged-rows", () => {
    const source = customTable([
      row([cell({ vMerge: "restart", rowspan: 2 }), cell()]),
      row([cell({ vMerge: "continue" }), cell()])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = moveWordTableRows(source, {
      from: 0,
      targetIndex: 2
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.reason).toBe("unsupported-merge");
  });

  it("word-table-command-add-column-at-boundary inserts explicit cells", () => {
    const result = unwrap(addWordTableColumn(table(2, 2), {
      columnIndex: 0,
      side: "after"
    }));

    expect(createWordTableMap(result).width).toBe(3);
    expect(result.child(0).childCount).toBe(3);
  });

  it("word-table-command-add-boundary-cell consumes the exact row offset", () => {
    const source = customTable([
      row([textCell("B")], { gridBefore: 1 }),
      row([textCell("A"), textCell("B")])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(addWordTableCell(source, {
      rowIndex: 0,
      side: "before"
    }));

    expect(result.child(0).childCount).toBe(2);
    expect(result.child(0).attrs.gridBefore).toBe(0);
    expect(result.child(0).child(1).textContent).toBe("B");
    expect(createWordTableMap(result).diagnostics).toEqual([]);
  });

  it("word-table-command-delete-boundary-cell exposes its exact row offset", () => {
    const source = customTable([
      row([textCell("A"), textCell("B")]),
      row([textCell("A"), textCell("B")])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(deleteWordTableCell(source, {
      rowIndex: 0,
      cellIndex: 1
    }));

    expect(result.child(0).childCount).toBe(1);
    expect(result.child(0).attrs.gridAfter).toBe(1);
    expect(result.child(0).firstChild?.textContent).toBe("A");
    expect(createWordTableMap(result).diagnostics).toEqual([]);
  });

  it.each([
    { route: "shift-leading" as const, offset: "gridBefore" as const },
    { route: "shift-trailing" as const, offset: "gridAfter" as const }
  ])("word-table-command-routes one explicit interior cell through $route", ({
    route,
    offset
  }) => {
    const source = table(1, 3);
    const deleted = unwrap(deleteWordTableCell(source, {
      rowIndex: 0,
      cellIndex: 1,
      route
    }));

    expect(deleted.firstChild?.children.map(cell => cell.textContent))
      .toEqual(["", ""]);
    expect(deleted.firstChild?.attrs[offset]).toBe(1);
    expect(createWordTableMap(deleted).diagnostics).toEqual([]);

    const inserted = unwrap(addWordTableCell(deleted, {
      rowIndex: 0,
      cellIndex: 1,
      route
    }));
    expect(inserted.firstChild?.childCount).toBe(3);
    expect(inserted.firstChild?.child(0).textContent).toBe("");
    expect(inserted.firstChild?.child(1).textContent).toBe("");
    expect(inserted.firstChild?.child(2).textContent).toBe("");
    expect(inserted.firstChild?.attrs[offset]).toBe(0);
    expect(createWordTableMap(inserted).diagnostics).toEqual([]);
  });

  it.each([
    { route: "shift-leading" as const, offset: "gridBefore" as const },
    { route: "shift-trailing" as const, offset: "gridAfter" as const }
  ])("word-table-command-routes one spanning interior cell through $route", ({
    route,
    offset
  }) => {
    const source = customTable([
      row([
        textCell("A"),
        textCell("B", { colspan: 2, gridSpan: 2 }),
        textCell("C")
      ]),
      row([textCell("A"), textCell("B1"), textCell("B2"), textCell("C")])
    ], {
      grid: Array.from({ length: 4 }, () => ({ width: null }))
    });
    const deleted = unwrap(deleteWordTableCell(source, {
      rowIndex: 0,
      cellIndex: 1,
      route
    }));

    expect(deleted.firstChild?.children.map(cell => cell.textContent))
      .toEqual(["A", "C"]);
    expect(deleted.firstChild?.attrs[offset]).toBe(2);
    expect(createWordTableMap(deleted).diagnostics).toEqual([]);

    const inserted = unwrap(addWordTableCell(deleted, {
      rowIndex: 0,
      cellIndex: 1,
      route,
      gridSpan: 2
    }));
    expect(inserted.firstChild?.childCount).toBe(3);
    expect(inserted.firstChild?.child(1).attrs).toMatchObject({
      colspan: 2,
      gridSpan: 2
    });
    expect(inserted.firstChild?.attrs[offset]).toBe(0);
    expect(createWordTableMap(inserted).diagnostics).toEqual([]);
  });

  it("word-table-command-delete-cell rejects unproved interior and last-row cells", () => {
    const source = table(1, 3);
    expect(deleteWordTableCell(source, {
      rowIndex: 0,
      cellIndex: 1
    })).toMatchObject({ ok: false, reason: "invalid-selection" });
    expect(deleteWordTableCell(table(1, 1), {
      rowIndex: 0,
      cellIndex: 0
    })).toMatchObject({ ok: false, reason: "invalid-selection" });
  });

  it("word-table-command-add-column-safely-repairs-span-metadata", () => {
    const source = customTable([
      row([cell({ colspan: 1, gridSpan: 2 })])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = addWordTableColumn(source, {
      columnIndex: 0,
      side: "after"
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.repair?.applied.map((item) => item.code) : []).toContain(
      "grid-span-colspan-mismatch"
    );
    expect(result.ok ? result.value.child(0).child(0).attrs.colspan : null).toBe(3);
    expect(result.ok ? createWordTableMap(result.value).diagnostics : []).toEqual([]);
  });

  it("word-table-command-safe-repair-fills-row-underflow-and-clamps-offsets", () => {
    const source = customTable([
      row([cell()], { gridBefore: -4 })
    ], {
      grid: [{ width: null }, { width: null }, { width: null }]
    });
    const result = unwrap(repairWordTable(source));

    expect(result.report.applied.map((item) => item.code)).toEqual([
      "invalid-grid-offset",
      "row-grid-underflow"
    ]);
    expect(result.tableNode.child(0).attrs.gridBefore).toBe(0);
    expect(result.tableNode.child(0).childCount).toBe(3);
    expect(createWordTableMap(result.tableNode).diagnostics).toEqual([]);
  });

  it("word-table-command-explicit-repair-preserves-content-and-expands-grid", () => {
    const source = customTable([
      row([cell({ colspan: 2, gridSpan: 2, vMerge: "restart" })]),
      row([textCell("keep me", { vMerge: "continue" })])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(repairWordTable(source, {
      mode: "explicit",
      overflow: "expand-grid",
      malformedContinuation: "restart"
    }));

    expect(result.tableNode.attrs.grid).toHaveLength(2);
    expect(result.tableNode.child(1).child(0).attrs.vMerge).toBeNull();
    expect(result.tableNode.child(1).child(0).textContent).toBe("keep me");
    expect(result.report.remaining).toEqual([]);
    expect(createWordTableMap(result.tableNode).diagnostics).toEqual([]);
  });

  it("word-table-command-add-column-inside-gridspan expands the span", () => {
    const source = customTable([
      row([cell({ colspan: 2, gridSpan: 2 })])
    ]);
    const result = unwrap(addWordTableColumn(source, {
      columnIndex: 0,
      side: "after"
    }));

    expect(result.child(0).child(0).attrs.gridSpan).toBe(3);
    expect(result.child(0).child(0).attrs.colspan).toBe(3);
  });

  it("word-table-command-delete-column-shrinks-gridspan", () => {
    const source = customTable([
      row([cell({ colspan: 3, gridSpan: 3 })])
    ]);
    const result = unwrap(deleteWordTableColumns(source, { from: 1 }));

    expect(result?.child(0).child(0).attrs.gridSpan).toBe(2);
    expect(result?.child(0).child(0).attrs.colspan).toBe(2);
  });

  it("word-table-command-delete-column-removes-table", () => {
    const result = unwrap(deleteWordTableColumns(table(1, 1), { from: 0 }));

    expect(result).toBeNull();
  });

  it("word-table-command-move-column moves rectangular columns", () => {
    const source = customTable([
      row([textCell("a"), textCell("b"), textCell("c")])
    ], {
      grid: [
        { width: { value: 1, unit: "dxa" } },
        { width: { value: 2, unit: "dxa" } },
        { width: { value: 3, unit: "dxa" } }
      ]
    });
    const result = unwrap(moveWordTableColumns(source, {
      from: 0,
      targetIndex: 3
    }));

    expect(result.child(0).child(0).textContent).toBe("b");
    expect(result.child(0).child(1).textContent).toBe("c");
    expect(result.child(0).child(2).textContent).toBe("a");
    expect(result.attrs.grid).toEqual([
      { width: { value: 2, unit: "dxa" } },
      { width: { value: 3, unit: "dxa" } },
      { width: { value: 1, unit: "dxa" } }
    ]);
  });

  it("word-table-command-move-column-rejects-merged-columns", () => {
    const source = customTable([
      row([cell({ colspan: 2, gridSpan: 2 })])
    ]);
    const result = moveWordTableColumns(source, {
      from: 0,
      targetIndex: 2
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.reason).toBe("unsupported-merge");
  });

  it("word-table-command-repair-gridspan-colspan synchronizes spans", () => {
    const source = customTable([
      row([cell({ colspan: 1, gridSpan: 3 })])
    ]);
    const result = unwrap(repairWordTableGridSpanColspan(source));

    expect(result.child(0).child(0).attrs.colspan).toBe(3);
    expect(result.child(0).child(0).attrs.gridSpan).toBe(3);
  });

  it("word-table-command-repair-vmerge-rowspans synchronizes vertical merge attrs", () => {
    const source = customTable([
      row([cell({ vMerge: "restart", rowspan: 1 })]),
      row([cell({ vMerge: "continue", rowspan: 9 })])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(repairWordTableVerticalMerges(source));

    expect(result.child(0).child(0).attrs.vMerge).toBe("restart");
    expect(result.child(0).child(0).attrs.rowspan).toBe(2);
    expect(result.child(1).child(0).attrs.vMerge).toBe("continue");
    expect(result.child(1).child(0).attrs.rowspan).toBe(1);
  });

  it("word-table-command-set-table-width-layout updates table attrs", () => {
    const source = table(1, 1);
    const result = unwrap(setWordTableAttrs(source, {
      attrs: {
        width: { value: 5000, unit: "pct" },
        tableLayout: "fixed"
      }
    }));

    expect(result.attrs.width).toEqual({ value: 5000, unit: "pct" });
    expect(result.attrs.tableLayout).toBe("fixed");
  });

  it("word-table-command-set-column-width updates table grid", () => {
    const source = customTable([
      row([textCell("a"), textCell("b")])
    ], {
      grid: [{ width: null }, { width: null }],
      tableLayout: "autofit"
    });
    const result = unwrap(setWordTableColumnWidth(source, {
      columnIndex: 1,
      width: { value: 1440, unit: "dxa" }
    }));

    expect(result.attrs.grid).toEqual([
      { width: null },
      { width: { value: 1440, unit: "dxa" } }
    ]);
    expect(result.attrs.tableLayout).toBe("fixed");
  });

  it("word-table-command-set-row-height updates row attrs", () => {
    const source = table(2, 1);
    const result = unwrap(setWordTableRowHeight(source, {
      rowIndex: 1,
      height: { value: 480, rule: "exact" }
    }));

    expect(result.child(1).attrs.height).toEqual({ value: 480, rule: "exact" });
  });

  it("word-table-command-set-row-attrs updates row policy attrs", () => {
    const source = table(1, 1);
    const result = unwrap(setWordTableRowAttrs(source, {
      rowIndex: 0,
      attrs: {
        alignment: "center",
        cantSplit: true
      }
    }));

    expect(result.child(0).attrs.alignment).toBe("center");
    expect(result.child(0).attrs.cantSplit).toBe(true);
  });

  it("word-table-command-toggle-header-row and cant-split", () => {
    const source = table(1, 1);
    const headerResult = unwrap(toggleWordTableHeaderRow(source, {
      rowIndex: 0
    }));
    const cantSplitResult = unwrap(toggleWordTableRowCantSplit(headerResult, {
      rowIndex: 0,
      value: true
    }));

    expect(headerResult.child(0).attrs.isHeader).toBe(true);
    expect(cantSplitResult.child(0).attrs.cantSplit).toBe(true);
  });

  it("word-table-command-distribute-columns averages existing grid widths", () => {
    const source = customTable([
      row([textCell("a"), textCell("b"), textCell("c")])
    ], {
      grid: [
        { width: { value: 1200, unit: "dxa" } },
        { width: { value: 1800, unit: "dxa" } },
        { width: { value: 2400, unit: "dxa" } }
      ]
    });
    const result = unwrap(distributeWordTableColumns(source, {
      from: 0,
      to: 2
    }));

    expect(result.attrs.grid).toEqual([
      { width: { value: 1800, unit: "dxa" } },
      { width: { value: 1800, unit: "dxa" } },
      { width: { value: 1800, unit: "dxa" } }
    ]);
  });

  it("word-table-command-distribute-columns accepts an explicit total width", () => {
    const source = table(1, 3);
    const result = unwrap(distributeWordTableColumns(source, {
      from: 0,
      to: 2,
      totalWidth: { value: 6000, unit: "dxa" }
    }));

    expect(result.attrs.grid).toEqual([
      { width: { value: 2000, unit: "dxa" } },
      { width: { value: 2000, unit: "dxa" } },
      { width: { value: 2000, unit: "dxa" } }
    ]);
  });

  it("word-table-command-distribute-rows averages existing row heights", () => {
    const source = customTable([
      row([cell()], { height: { value: 240, rule: "exact" } }),
      row([cell()], { height: { value: 360, rule: "exact" } }),
      row([cell()], { height: { value: 600, rule: "exact" } })
    ]);
    const result = unwrap(distributeWordTableRows(source, {
      from: 0,
      to: 2
    }));

    expect(result.child(0).attrs.height).toEqual({ value: 400, rule: "exact" });
    expect(result.child(1).attrs.height).toEqual({ value: 400, rule: "exact" });
    expect(result.child(2).attrs.height).toEqual({ value: 400, rule: "exact" });
  });

  it("word-table-command-distribute-rows accepts an explicit total height", () => {
    const source = table(3, 1);
    const result = unwrap(distributeWordTableRows(source, {
      from: 0,
      to: 2,
      totalHeight: { value: 900, rule: "atLeast" }
    }));

    expect(result.child(0).attrs.height).toEqual({ value: 300, rule: "atLeast" });
    expect(result.child(1).attrs.height).toEqual({ value: 300, rule: "atLeast" });
    expect(result.child(2).attrs.height).toEqual({ value: 300, rule: "atLeast" });
  });

  it("word-table-command-format-cell-shading updates a grid rect", () => {
    const source = customTable([
      row([cell(), cell()]),
      row([cell(), cell()])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(setWordTableCellAttrs(source, {
      startRow: 0,
      startColumn: 1,
      rowSpan: 2,
      columnSpan: 1,
      attrs: {
        shading: { fill: "D9EAF7", color: null, pattern: "clear" }
      }
    }));

    expect(result.child(0).child(0).attrs.shading).toBeNull();
    expect(result.child(0).child(1).attrs.shading).toEqual({
      fill: "D9EAF7",
      color: null,
      pattern: "clear"
    });
    expect(result.child(1).child(1).attrs.shading).toEqual({
      fill: "D9EAF7",
      color: null,
      pattern: "clear"
    });
  });

  it("word-table-command-format-cell-expands-partial-merged-cell", () => {
    const source = customTable([
      row([textCell("a"), textCell("b")]),
      row([textCell("c"), textCell("d")])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const merged = unwrap(mergeWordTableCells(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 2
    }));
    const result = unwrap(setWordTableCellAttrs(merged, {
      startRow: 1,
      startColumn: 1,
      rowSpan: 1,
      columnSpan: 1,
      attrs: { verticalAlign: "center" }
    }));

    expect(result.child(0).child(0).attrs.verticalAlign).toBe("center");
    expect(result.child(1).child(0).attrs.verticalAlign).toBe("center");
  });

  it("word-table-command-border-outside-preserves-interior-edges", () => {
    const preserved = {
      style: "single",
      size: 16,
      color: "EF4444",
      space: 0,
      shadow: false,
      frame: false
    } as const;
    const existingBorders = {
      top: preserved,
      right: preserved,
      bottom: preserved,
      left: preserved,
      insideH: null,
      insideV: null,
      tl2br: null,
      tr2bl: null
    };
    const source = customTable([
      row([cell({ borders: existingBorders }), cell({ borders: existingBorders })]),
      row([cell({ borders: existingBorders }), cell({ borders: existingBorders })])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const border = {
      style: "single",
      size: 8,
      color: "auto",
      space: 0,
      shadow: false,
      frame: false
    } as const;
    const result = unwrap(setWordTableCellBorders(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 2,
      preset: "outside",
      border
    }));

    expect(result.child(0).child(0).attrs.borders).toMatchObject({
      top: border,
      left: border,
      right: preserved,
      bottom: preserved
    });
    expect(result.child(0).child(1).attrs.borders).toMatchObject({
      top: border,
      right: border,
      left: preserved,
      bottom: preserved
    });
    expect(result.child(1).child(0).attrs.borders).toMatchObject({
      bottom: border,
      left: border,
      top: preserved,
      right: preserved
    });
    expect(result.child(1).child(1).attrs.borders).toMatchObject({
      right: border,
      bottom: border,
      top: preserved,
      left: preserved
    });
  });

  it("word-table-command-border-inside-preserves-the-selection-perimeter", () => {
    const preserved = {
      style: "single",
      size: 16,
      color: "EF4444",
      space: 0,
      shadow: false,
      frame: false
    } as const;
    const existingBorders = {
      top: preserved,
      right: preserved,
      bottom: preserved,
      left: preserved,
      insideH: null,
      insideV: null,
      tl2br: null,
      tr2bl: null
    };
    const source = customTable([
      row([cell({ borders: existingBorders }), cell({ borders: existingBorders })]),
      row([cell({ borders: existingBorders }), cell({ borders: existingBorders })])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const border = {
      style: "single",
      size: 8,
      color: "auto",
      space: 0,
      shadow: false,
      frame: false
    } as const;
    const result = unwrap(setWordTableCellBorders(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 2,
      preset: "inside",
      border
    }));

    expect(result.child(0).child(0).attrs.borders).toMatchObject({
      top: preserved,
      left: preserved,
      right: border,
      bottom: border
    });
    expect(result.child(1).child(1).attrs.borders).toMatchObject({
      top: border,
      left: border,
      right: preserved,
      bottom: preserved
    });
  });

  it("word-table-command-border-all-mutates-only-one-selected-cell box", () => {
    const source = customTable([
      row([cell(), cell()]),
      row([cell(), cell()])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const accent = {
      style: "single",
      size: 8,
      color: "4B67F2",
      space: 0,
      shadow: false,
      frame: false
    } as const;
    const result = unwrap(setWordTableCellBorders(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1,
      preset: "all",
      border: accent
    }));

    expect(result.child(0).child(0).attrs.borders).toMatchObject({
      top: accent,
      right: accent,
      bottom: accent,
      left: accent
    });
    expect(result.child(0).child(1).attrs.borders).toMatchObject({
      left: accent,
      top: null,
      right: null,
      bottom: null
    });
    expect(result.child(1).child(0).attrs.borders).toMatchObject({
      top: accent,
      right: null,
      bottom: null,
      left: null
    });
    expect(result.child(1).child(1).attrs.borders).toBeNull();
  });

  it("word-table-command-border-none-writes-explicit nil edges", () => {
    const source = customTable([
      row([cell(), cell()]),
      row([cell(), cell()])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(setWordTableCellBorders(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1,
      preset: "none",
      border: null
    }));
    const nil = { style: "nil", size: null, color: null };

    expect(result.attrs.borders).toMatchObject({
      top: { style: "single", color: "auto" },
      insideH: { style: "single", color: "auto" },
      insideV: { style: "single", color: "auto" }
    });
    expect(result.child(0).child(0).attrs.borders).toMatchObject({
      top: nil,
      right: nil,
      bottom: nil,
      left: nil
    });
    expect(result.child(0).child(1).attrs.borders).toMatchObject({ left: nil });
    expect(result.child(1).child(0).attrs.borders).toMatchObject({ top: nil });
    expect(result.child(1).child(1).attrs.borders).toBeNull();
  });

  it("word-table-command-border-mirrors-a-merged-edge-to-every-neighbor", () => {
    const source = customTable([
      row([cell(), cell(), cell()]),
      row([cell(), cell(), cell()])
    ], {
      grid: [{ width: null }, { width: null }, { width: null }]
    });
    const merged = unwrap(mergeWordTableCells(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 1
    }));
    const accent = {
      style: "single",
      size: 8,
      color: "4B67F2",
      space: 0,
      shadow: false,
      frame: false
    } as const;
    const result = unwrap(setWordTableCellBorders(merged, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1,
      preset: "right",
      border: accent
    }));

    expect(result.child(0).child(0).attrs.borders).toMatchObject({
      right: accent
    });
    expect(result.child(1).child(0).attrs.borders).toMatchObject({
      right: accent
    });
    expect(result.child(0).child(1).attrs.borders).toMatchObject({
      left: accent
    });
    expect(result.child(1).child(1).attrs.borders).toMatchObject({
      left: accent
    });
    expect(result.child(0).child(2).attrs.borders).toBeNull();
    expect(result.child(1).child(2).attrs.borders).toBeNull();
  });

  it("word-table-command-clear-cell-formatting-preserves-merge-attrs", () => {
    const source = customTable([
      row([
        textCell("a", {
          vMerge: "restart",
          rowspan: 2,
          shading: { fill: "D9EAF7", color: null, pattern: "clear" },
          verticalAlign: "center",
          noWrap: true
        })
      ]),
      row([
        cell({
          vMerge: "continue",
          shading: { fill: "D9EAF7", color: null, pattern: "clear" },
          verticalAlign: "center",
          noWrap: true
        })
      ])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(clearWordTableCellFormatting(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 1
    }));

    expect(result.child(0).child(0).attrs.vMerge).toBe("restart");
    expect(result.child(0).child(0).attrs.rowspan).toBe(2);
    expect(result.child(0).child(0).attrs.shading).toBeNull();
    expect(result.child(0).child(0).attrs.verticalAlign).toBeNull();
    expect(result.child(0).child(0).attrs.noWrap).toBeNull();
    expect(result.child(1).child(0).attrs.vMerge).toBe("continue");
    expect(result.child(1).child(0).attrs.shading).toBeNull();
  });

  it("word-table-command-merge-rect-preserves-content", () => {
    const source = customTable([
      row([textCell("a"), textCell("b")]),
      row([textCell("c"), textCell("d")])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(mergeWordTableCells(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 2
    }));
    const map = createWordTableMap(result);

    expect(result.child(0).childCount).toBe(1);
    expect(result.child(1).childCount).toBe(1);
    expect(result.child(0).child(0).attrs.gridSpan).toBe(2);
    expect(result.child(0).child(0).attrs.vMerge).toBe("restart");
    expect(result.child(1).child(0).attrs.vMerge).toBe("continue");
    expect(result.child(0).child(0).textContent).toBe("abcd");
    expect(map.semanticCells).toHaveLength(1);
  });

  it("word-table-command-split-horizontal-merge", () => {
    const source = customTable([
      row([textCell("a", { colspan: 2, gridSpan: 2 })])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0
    }));

    expect(result.child(0).childCount).toBe(2);
    expect(result.child(0).child(0).attrs.gridSpan).toBe(1);
    expect(result.child(0).child(0).textContent).toBe("a");
    expect(result.child(0).child(1).textContent).toBe("");
  });

  it("word-table-command-split-cell-to-more-columns", () => {
    const source = customTable([
      row([textCell("a")])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0,
      columnCount: 3
    }));

    expect(createWordTableMap(result).width).toBe(3);
    expect(result.child(0).childCount).toBe(3);
    expect(result.child(0).child(0).textContent).toBe("a");
    expect(result.child(0).child(1).textContent).toBe("");
    expect(result.child(0).child(2).textContent).toBe("");
  });

  it("word-table-command-split-cell-expands-other-rows-over-new-columns", () => {
    const source = customTable([
      row([textCell("a")]),
      row([textCell("b")])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0,
      columnCount: 2
    }));

    expect(createWordTableMap(result).width).toBe(2);
    expect(result.child(0).childCount).toBe(2);
    expect(result.child(1).childCount).toBe(1);
    expect(result.child(1).child(0).attrs.gridSpan).toBe(2);
    expect(result.child(1).child(0).attrs.colspan).toBe(2);
    expect(result.child(1).child(0).textContent).toBe("b");
  });

  it("word-table-command-split-cell-to-more-rows", () => {
    const source = customTable([
      row([textCell("a")])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0,
      rowCount: 3
    }));

    expect(createWordTableMap(result).height).toBe(3);
    expect(result.childCount).toBe(3);
    expect(result.child(0).child(0).textContent).toBe("a");
    expect(result.child(1).child(0).textContent).toBe("");
    expect(result.child(2).child(0).textContent).toBe("");
  });

  it("word-table-command-split-cell-expands-other-cells-over-new-rows", () => {
    const source = customTable([
      row([textCell("a"), textCell("b")])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0,
      rowCount: 2
    }));

    expect(createWordTableMap(result).height).toBe(2);
    expect(result.child(0).childCount).toBe(2);
    expect(result.child(1).childCount).toBe(2);
    expect(result.child(0).child(1).attrs.vMerge).toBe("restart");
    expect(result.child(0).child(1).attrs.rowspan).toBe(2);
    expect(result.child(1).child(1).attrs.vMerge).toBe("continue");
    expect(result.child(0).child(1).textContent).toBe("b");
  });

  it("word-table-command-split-merged-cell-to-more-rows", () => {
    const source = customTable([
      row([textCell("a", { vMerge: "restart", rowspan: 2 })]),
      row([cell({ vMerge: "continue" })])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0,
      rowCount: 3
    }));

    expect(createWordTableMap(result).height).toBe(3);
    expect(result.childCount).toBe(3);
    expect(result.child(0).child(0).textContent).toBe("a");
    expect(result.child(0).child(0).attrs.vMerge).toBeNull();
    expect(result.child(1).child(0).textContent).toBe("");
    expect(result.child(1).child(0).attrs.vMerge).toBeNull();
    expect(result.child(2).child(0).textContent).toBe("");
    expect(result.child(2).child(0).attrs.vMerge).toBeNull();
  });

  it("word-table-command-split-merged-cell-expands-sibling-cell-over-new-rows", () => {
    const source = customTable([
      row([textCell("a", { vMerge: "restart", rowspan: 2 }), textCell("b0")]),
      row([cell({ vMerge: "continue" }), textCell("b1")])
    ], {
      grid: [{ width: null }, { width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0,
      rowCount: 3
    }));

    expect(createWordTableMap(result).height).toBe(3);
    expect(result.child(0).child(1).attrs.vMerge).toBe("restart");
    expect(result.child(0).child(1).attrs.rowspan).toBe(2);
    expect(result.child(1).child(1).attrs.vMerge).toBe("continue");
    expect(result.child(2).child(1).textContent).toBe("b1");
  });

  it("word-table-command-split-vertical-merge", () => {
    const source = customTable([
      row([textCell("a", { vMerge: "restart", rowspan: 2 })]),
      row([cell({ vMerge: "continue" })])
    ], {
      grid: [{ width: null }]
    });
    const result = unwrap(splitWordTableCell(source, {
      rowIndex: 0,
      columnIndex: 0
    }));

    expect(result.child(0).child(0).attrs.vMerge).toBeNull();
    expect(result.child(0).child(0).attrs.rowspan).toBe(1);
    expect(result.child(1).child(0).attrs.vMerge).toBeNull();
    expect(result.child(1).child(0).textContent).toBe("");
    expect(createWordTableMap(result).semanticCells).toHaveLength(2);
  });

  it("word-table-command-mixed-grid-edits-conserve-grid-and-merge-invariants", () => {
    let result = unwrap(mergeWordTableCells(table(2, 2), {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 2
    }));

    result = unwrap(addWordTableRow(result, {
      rowIndex: 0,
      side: "after"
    }));
    result = unwrap(addWordTableColumn(result, {
      columnIndex: 0,
      side: "after"
    }));
    result = unwrap(deleteWordTableColumns(result, { from: 1 }))!;
    result = unwrap(deleteWordTableRows(result, { from: 1 }))!;

    const map = createWordTableMap(result);

    expect(result.attrs.grid).toHaveLength(2);
    expect(result.child(0).child(0).attrs).toMatchObject({
      colspan: 2,
      gridSpan: 2,
      rowspan: 2,
      vMerge: "restart"
    });
    expect(result.child(1).child(0).attrs).toMatchObject({
      colspan: 2,
      gridSpan: 2,
      rowspan: 1,
      vMerge: "continue"
    });
    expect(map.rows.map((rowRef) => rowRef.occupiedGridWidth)).toEqual([2, 2]);
    expect(map.diagnostics).toEqual([]);
  });
});
