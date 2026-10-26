import type { QuireJSONContent } from "@quirekit/core";
import { Schema, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { wordTableNodeSpecs } from "../schema";
import { createWordTableMap } from "./build";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Creates a paragraph JSON node for table cell content.
 *
 * @param text - Optional paragraph text.
 * @returns Paragraph JSON node.
 */
function paragraph(text = ""): QuireJSONContent {
  return text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };
}

/**
 * Creates a word table cell JSON node.
 *
 * @param attrs - Optional cell attrs.
 * @param text - Optional cell text.
 * @returns Cell JSON node.
 */
function cell(
  attrs: Record<string, unknown> = {},
  text = ""
): QuireJSONContent {
  const content = [paragraph(text)];

  return Object.keys(attrs).length > 0
    ? { type: "wordTableCell", attrs, content }
    : { type: "wordTableCell", content };
}

/**
 * Creates a word table row JSON node.
 *
 * @param cells - Row cells.
 * @param attrs - Optional row attrs.
 * @returns Row JSON node.
 */
function row(
  cells: readonly QuireJSONContent[],
  attrs: Record<string, unknown> = {}
): QuireJSONContent {
  return Object.keys(attrs).length > 0
    ? { type: "wordTableRow", attrs, content: [...cells] }
    : { type: "wordTableRow", content: [...cells] };
}

/**
 * Creates a parsed table node from row JSON.
 *
 * @param rows - Table rows.
 * @param attrs - Optional table attrs.
 * @returns Parsed `wordTable` node.
 */
function table(
  rows: readonly QuireJSONContent[],
  attrs: Record<string, unknown> = {}
): PMNode {
  const tableJson: QuireJSONContent = Object.keys(attrs).length > 0
    ? { type: "wordTable", attrs, content: [...rows] }
    : { type: "wordTable", content: [...rows] };
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [tableJson]
  });

  return doc.child(0);
}

/**
 * Returns all diagnostic codes from a table map.
 *
 * @param tableNode - Table node to inspect.
 * @returns Diagnostic codes in emitted order.
 */
function diagnosticCodes(tableNode: PMNode): readonly string[] {
  return createWordTableMap(tableNode).diagnostics.map((item) => item.code);
}

describe("WordTableMap", () => {
  it("word-table-map-simple-grid derives cells and slots", () => {
    const map = createWordTableMap(table([
      row([cell(), cell()]),
      row([cell(), cell()])
    ], {
      grid: [{ width: null }, { width: null }]
    }));

    expect(map.width).toBe(2);
    expect(map.height).toBe(2);
    expect(map.diagnostics).toEqual([]);
    expect(map.cellAt(1, 1)?.id).toBe("semantic:r1:c1:g1:1");
    expect(map.slotAt(0, 1)).toMatchObject({
      kind: "cell",
      role: "origin"
    });
  });

  it("word-table-map-grid-before-after preserves row offsets", () => {
    const map = createWordTableMap(table([
      row([cell()], { gridBefore: 1, gridAfter: 1 })
    ], {
      grid: [{ width: null }, { width: null }, { width: null }]
    }));

    expect(map.slotAt(0, 0)).toMatchObject({ kind: "rowOffset", side: "before" });
    expect(map.slotAt(0, 2)).toMatchObject({ kind: "rowOffset", side: "after" });
    expect(map.positionAt(0, 0)).toBeNull();
    expect(map.positionAt(0, 1)).toBe(map.explicitCells[0]?.cellPos);
  });

  it("word-table-map-gridspan places horizontal spans", () => {
    const map = createWordTableMap(table([
      row([cell({ colspan: 2, gridSpan: 2 }), cell()])
    ]));

    expect(map.width).toBe(3);
    expect(map.slotAt(0, 0)).toMatchObject({ role: "origin" });
    expect(map.slotAt(0, 1)).toMatchObject({ role: "horizontalSpan" });
    expect(map.diagnostics).toEqual([]);
  });

  it("diagnoses gridSpan and colspan mismatches", () => {
    expect(diagnosticCodes(table([
      row([cell({ colspan: 2, gridSpan: 3 })])
    ]))).toContain("grid-span-colspan-mismatch");
  });

  it("word-table-map-vmerge-restart-continue joins continuation cells", () => {
    const map = createWordTableMap(table([
      row([cell({ vMerge: "restart" }), cell()]),
      row([cell({ vMerge: "continue" }), cell()])
    ]));
    const merged = map.semanticCells[0];

    expect(merged?.rowSpan).toBe(2);
    expect(merged?.continuationExplicitCellIds).toEqual([
      "cell:r1:c0:g0:1"
    ]);
    expect(map.slotAt(1, 0)).toMatchObject({
      role: "verticalContinuation"
    });
  });

  it("word-table-map-vmerge-gridspan-rectangle diagnoses range mismatch", () => {
    const map = createWordTableMap(table([
      row([cell({ colspan: 2, gridSpan: 2, vMerge: "restart" })]),
      row([cell({ vMerge: "continue" })])
    ]));

    expect(map.diagnostics.map((item) => item.code)).toContain(
      "vmerge-range-mismatch"
    );
  });

  it("word-table-map-orphan-continue-diagnostic emits orphan diagnostics", () => {
    expect(diagnosticCodes(table([
      row([cell({ vMerge: "continue" })])
    ]))).toContain("vmerge-orphan-continue");
  });

  it("ends a rectangular merge before a normal row without reporting overlap", () => {
    const map = createWordTableMap(table([
      row([cell({ colspan: 2, gridSpan: 2, vMerge: "restart" }), cell()]),
      row([cell({ colspan: 2, gridSpan: 2, vMerge: "continue" }), cell()]),
      row([cell(), cell(), cell()])
    ]));
    expect(map.diagnostics).toEqual([]);
    expect(map.cellAt(0, 0)?.rect).toEqual({ startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 2 });
    expect(map.cellAt(2, 0)?.rect.rowSpan).toBe(1);
    expect(map.cellAt(2, 0)?.id).not.toBe(map.cellAt(0, 0)?.id);
  });

  it("starts independent consecutive vertical merges at the same columns", () => {
    const map = createWordTableMap(table([
      row([cell({ vMerge: "restart" })]), row([cell({ vMerge: "continue" })]),
      row([cell({ vMerge: "restart" })]), row([cell({ vMerge: "continue" })])
    ]));
    expect(map.diagnostics).toEqual([]);
    expect(map.semanticCells.map(item => item.rect.rowSpan)).toEqual([2, 2]);
  });

  it.each(["before", "after"] as const)("does not bridge a row with a %s grid offset", side => {
    const gap = side === "before" ? { gridBefore: 1 } : { gridAfter: 1 };
    const affected = side === "before" ? 0 : 1;
    const cells = (merge: string) => [cell(affected === 0 ? { vMerge: merge } : {}), cell(affected === 1 ? { vMerge: merge } : {})];
    const map = createWordTableMap(table([row(cells("restart")), row([cell()], gap), row(cells("continue"))]));
    expect(map.diagnostics.map(item => item.code)).toEqual(["vmerge-orphan-continue"]);
    expect(map.cellAt(0, affected)?.rect.rowSpan).toBe(1);
    expect(map.cellAt(2, affected)?.id).not.toBe(map.cellAt(0, affected)?.id);
  });

  it("does not reconnect a merge after a mismatched continuation row", () => {
    const map = createWordTableMap(table([
      row([cell({ colspan: 2, gridSpan: 2, vMerge: "restart" })]),
      row([cell({ vMerge: "continue" })], { gridAfter: 1 }),
      row([cell({ colspan: 2, gridSpan: 2, vMerge: "continue" })])
    ]));
    expect(map.diagnostics.map(item => item.code)).toEqual(["vmerge-range-mismatch", "vmerge-orphan-continue"]);
    expect(map.cellAt(0, 0)?.rect.rowSpan).toBe(1);
  });

  it("word-table-map-continuation-content-diagnostic emits content diagnostics", () => {
    expect(diagnosticCodes(table([
      row([cell({ vMerge: "restart" })]),
      row([cell({ vMerge: "continue" }, "unexpected")])
    ]))).toContain("vmerge-continuation-content");
  });

  it("word-table-map-header-body-vmerge-crossing emits boundary diagnostics", () => {
    expect(diagnosticCodes(table([
      row([cell({ vMerge: "restart" })], { isHeader: true }),
      row([cell({ vMerge: "continue" })])
    ]))).toContain("header-body-vmerge-crossing");
  });

  it("word-table-map-expand-rect-to-merged-cells expands partial merged cells", () => {
    const map = createWordTableMap(table([
      row([cell({ vMerge: "restart" }), cell()]),
      row([cell({ vMerge: "continue" }), cell()])
    ]));

    expect(map.expandRectToMergedCells({
      startRow: 1,
      rowSpan: 1,
      startColumn: 0,
      columnSpan: 1
    })).toEqual({
      startRow: 0,
      rowSpan: 2,
      startColumn: 0,
      columnSpan: 1
    });
  });

  it("word-table-map-position-at-row-offset returns null for offsets", () => {
    const map = createWordTableMap(table([
      row([cell()], { gridBefore: 1 })
    ]));

    expect(map.positionAt(0, 0)).toBeNull();
    expect(map.positionAt(0, 1)).toBe(map.explicitCells[0]?.cellPos);
  });
});
