import { createEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { describe, expect, it, vi } from "vitest";
import { createWordTableMap } from "../../map";
import { distributeMeasuredRows } from "../derive/distribution/rows";
import { distributeMeasuredColumns } from "../derive/distribution/columns";
import type { WordTableMeasuredSizing } from "../derive/distribution/types";
import { WordTableExtensions } from "../../schema";
import { WordTableSelection } from "../../selection";

/** @returns Automatic-size table with a retained geometry stub. */
function fixture() {
  const editor = createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: { type: "doc", content: [{ type: "wordTable", content:
      Array.from({ length: 3 }, () => ({ type: "wordTableRow", content:
        Array.from({ length: 3 }, () => ({ type: "wordTableCell", content: [{ type: "paragraph" }] }))
      }))
    }] }
  });
  const sourceDocument = editor.state.doc;
  Object.assign(editor.view, { getTableChrome: () => ({
    tablePos: 0, sourceDocument,
    sizing: {
      width: 300,
      columnWidths: [50, 100, 150],
      rowHeights: [30, 60, 90],
      cellMinimumHeights: [{ startRow: 0, rowSpan: 1, height: 55 }]
    }
  }) });
  return editor;
}

describe("measured table distribution", () => {
  it("rejects one-axis, stale and missing mounted geometry without changing the document", () => {
    const editor = fixture();
    const before = editor.state.doc;
    expect(editor.commands.distributeWordTableColumns({ tablePos: 0, from: 0 })).toBe(false);
    expect(editor.commands.distributeWordTableRows({ tablePos: 0, from: 0, to: 0 })).toBe(false);
    Object.assign(editor.view, { getTableChrome: () => null });
    expect(editor.commands.distributeWordTableRows({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.distributeWordTableRows({ tablePos: 0, from: 0, to: 2, totalHeight: { value: 900, rule: "exact" } })).toBe(true);
    Object.assign(editor.view, { getTableChrome: () => ({ sourceDocument: before, sizing: measurement() }) });
    const after = editor.state.doc;
    expect(editor.can().distributeWordTableRows({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.commands.distributeWordTableColumns({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.state.doc).toBe(after);
    editor.destroy();
  });

  it("rejects readonly and filtered mutations in can and run", () => {
    const editor = fixture();
    const before = editor.state.doc;
    const filter = vi.spyOn(editor.state.pm, "filterTransaction").mockReturnValue(false);
    expect(editor.can().distributeWordTableColumns({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.commands.distributeWordTableRows({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.state.doc).toBe(before);
    filter.mockRestore();
    editor.setEditable(false);
    expect(editor.commands.distributeWordTableColumns({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.can().distributeWordTableRows({ tablePos: 0, from: 0, to: 2 })).toBe(false);
    expect(editor.state.doc).toBe(before);
    editor.destroy();
  });

  it("retains explicit-total compatibility for a single source row", () => {
    const editor = fixture();
    Object.assign(editor.view, { getTableChrome: () => null });
    expect(editor.commands.distributeWordTableRows({ tablePos: 0, from: 1, totalHeight: { value: 900, rule: "exact" } })).toBe(true);
    expect(editor.state.doc.firstChild!.child(1).attrs.height).toEqual({ value: 900, rule: "exact" });
    editor.destroy();
  });

  it("rejects non-finite measurements and mismatched topology", () => {
    const editor = fixture();
    const table = editor.state.doc.firstChild!;
    expect(distributeMeasuredColumns(table, { from: 0, to: 1 }, { ...measurement(), columnWidths: [NaN, 100, 150] }).ok).toBe(false);
    expect(distributeMeasuredRows(table, { from: 0, to: 1 }, { ...measurement(), rowHeights: [30, 40] }).ok).toBe(false);
    expect(distributeMeasuredRows(table, { from: 0, to: 1 }, { ...measurement(), cellMinimumHeights: [{ startRow: 2, rowSpan: 2, height: 100 }] }).ok).toBe(false);
    editor.destroy();
  });

  it("keeps merged topology, content and equal sizing idempotent", () => {
    const editor = fixture();
    expect(editor.commands.mergeWordTableCells({ tablePos: 0, startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 2 })).toBe(true);
    const table = editor.state.doc.firstChild!;
    const result = distributeMeasuredColumns(table, { from: 0, to: 1 }, measurement());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(createWordTableMap(result.value).diagnostics).toEqual([]);
    expect(result.value.child(0).childCount).toBe(2);
    expect(result.value.child(0).child(0).attrs.width).toEqual({ value: 2250, unit: "dxa" });
    expect(result.value.textContent).toBe(table.textContent);
    const repeat = distributeMeasuredColumns(result.value, { from: 0, to: 1 }, { ...measurement(), columnWidths: [75, 75, 150] });
    expect(repeat.ok && repeat.value).toBe(result.value);
    editor.destroy();
  });

  it("accounts for a vertical span crossing the selected range and preserves exact rules", () => {
    const editor = fixture();
    editor.commands.setWordTableRowHeight({ tablePos: 0, rowIndex: 1, height: { value: 900, rule: "exact" } });
    const table = editor.state.doc.firstChild!;
    const sizing = { ...measurement(), cellMinimumHeights: [{ startRow: 0, rowSpan: 3, height: 270 }] };
    const result = distributeMeasuredRows(table, { from: 1, to: 2 }, sizing);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.child(0)).toBe(table.child(0));
    expect(result.value.child(1).attrs.height).toEqual({ value: 1800, rule: "exact" });
    expect(result.value.child(2).attrs.height).toEqual({ value: 1800, rule: "atLeast" });
    const repeat = distributeMeasuredRows(result.value, { from: 1, to: 2 }, { ...sizing, rowHeights: [30, 120, 120] });
    expect(repeat.ok && repeat.value).toBe(result.value);
    editor.destroy();
  });

  it("keeps vertical merge continuations intact across a partial row distribution", () => {
    const editor = fixture();
    expect(editor.commands.mergeWordTableCells({ tablePos: 0, startRow: 1, startColumn: 0, rowSpan: 2, columnSpan: 1 })).toBe(true);
    const table = editor.state.doc.firstChild!;
    expect(createWordTableMap(table).diagnostics).toEqual([]);
    const result = distributeMeasuredRows(table, { from: 0, to: 1 }, {
      ...measurement(), cellMinimumHeights: [{ startRow: 1, rowSpan: 2, height: 260 }]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.child(0).attrs.height.value).toBe(2550);
    expect(result.value.child(1).attrs.height.value).toBe(2550);
    expect(result.value.child(2)).toBe(table.child(2));
    expect(createWordTableMap(result.value).semanticCells.map(cell => cell.rect)).toEqual(createWordTableMap(table).semanticCells.map(cell => cell.rect));
    editor.destroy();
  });

  it("targets a nested table without changing its containing grid", () => {
    const editor = fixture();
    const nested = editor.getJSON().content![0]!;
    editor.commands.setContent({ type: "doc", content: [{ type: "wordTable", content: [{ type: "wordTableRow", content: [{
      type: "wordTableCell", content: [{ type: "paragraph" }, nested]
    }] }] }] });
    let tablePos = -1;
    editor.state.doc.descendants((node, pos) => { if (node.type.name === "wordTable" && pos > 0) tablePos = pos; });
    const document = editor.state.doc;
    const read = vi.fn(() => ({ sourceDocument: document, sizing: measurement() }));
    Object.assign(editor.view, { getTableChrome: read });
    expect(editor.commands.distributeWordTableColumns({ tablePos, from: 0, to: 2 })).toBe(true);
    expect(read.mock.calls).toHaveLength(1);
    expect(editor.state.doc.firstChild!.attrs.grid).toEqual(document.firstChild!.attrs.grid);
    expect(editor.state.doc.nodeAt(tablePos)!.attrs.grid.map((column: { width: { value: number } }) => column.width.value)).toEqual([1500, 1500, 1500]);
    editor.destroy();
  });
  it("distributes automatic columns atomically and preserves selection/undo", () => {
    const editor = fixture();
    expect(editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: 2, headCellPos: 2, mode: "table" })).toBe(true);
    const before = editor.state.doc;
    expect(editor.can().distributeWordTableColumns({ tablePos: 0, from: 0, to: 1 })).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.distributeWordTableColumns({ tablePos: 0, from: 0, to: 1 })).toBe(true);
    const table = editor.state.doc.firstChild!;
    expect(table.attrs.grid.map((column: { width: { value: number } }) => column.width.value)).toEqual([1125, 1125, 2250]);
    expect(table.attrs.tableLayout).toBe("fixed");
    expect(table.child(0).child(0).attrs.width).toEqual({ value: 1125, unit: "dxa" });
    expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    editor.destroy();
  });

  it("raises the equal row height to fit content, retaining unselected rows", () => {
    const editor = fixture();
    expect(editor.commands.distributeWordTableRows({ tablePos: 0, from: 0, to: 1 })).toBe(true);
    const table = editor.state.doc.firstChild!;
    expect(table.child(0).attrs.height).toEqual({ value: 825, rule: "atLeast" });
    expect(table.child(1).attrs.height).toEqual({ value: 825, rule: "atLeast" });
    expect(table.child(2).attrs.height).toBeNull();
    editor.destroy();
  });
});

/** @returns Source-flow measurements without content pressure. */
function measurement(): WordTableMeasuredSizing {
  return { width: 300, columnWidths: [50, 100, 150], rowHeights: [30, 60, 90], cellMinimumHeights: [] };
}
