import { createEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { describe, expect, it, vi } from "vitest";
import { createWordTableMap } from "../../map";
import { WordTableExtensions } from "../../schema";
import { mergeWordTableCells } from "../merge";
import { splitWordTableCell } from "../split";

/** @returns Named 3×3 table in a headless editor with normal history semantics. */
function fixture() {
  return createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: { type: "doc", content: [{ type: "wordTable", content:
      Array.from({ length: 3 }, (_, r) => ({ type: "wordTableRow", content:
        Array.from({ length: 3 }, (_, c) => ({ type: "wordTableCell", content: [
          { type: "paragraph", content: [{ type: "text", text: `${r}:${c}` }] }
        ] }))
      }))
    }] }
  });
}

describe("rectangular table merge lifecycle", () => {
  it("keeps every multi-cell rectangle valid and splittable, including ordinary trailing rows", () => {
    const editor = fixture();
    const table = editor.state.doc.firstChild!;
    for (let startRow = 0; startRow < 3; startRow++) {
      for (let startColumn = 0; startColumn < 3; startColumn++) {
        for (let rowSpan = 1; rowSpan <= 3 - startRow; rowSpan++) {
          for (let columnSpan = 1; columnSpan <= 3 - startColumn; columnSpan++) {
            if (rowSpan * columnSpan === 1) continue;
            const rect = { startRow, startColumn, rowSpan, columnSpan };
            const merged = mergeWordTableCells(table, { ...rect, repair: "never" });
            expect(merged.ok, JSON.stringify(rect)).toBe(true);
            if (!merged.ok) continue;
            const map = createWordTableMap(merged.value);
            expect(map.diagnostics, JSON.stringify(rect)).toEqual([]);
            expect(map.cellAt(startRow, startColumn)?.rect).toEqual(rect);
            expect(map.semanticCells).toHaveLength(10 - rowSpan * columnSpan);
            const split = splitWordTableCell(merged.value, { rowIndex: startRow, columnIndex: startColumn, repair: "never" });
            expect(split.ok).toBe(true);
            if (!split.ok) continue;
            expect(createWordTableMap(split.value).diagnostics).toEqual([]);
            expect(createWordTableMap(split.value).semanticCells).toHaveLength(9);
            expect(split.value.textContent).toBe(merged.value.textContent);
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
              expect(merged.value.textContent).toContain(`${r}:${c}`);
              if (r < startRow || r >= startRow + rowSpan || c < startColumn || c >= startColumn + columnSpan) {
                expect(split.value.child(r).child(c).eq(table.child(r).child(c))).toBe(true);
              }
            }
          }
        }
      }
    }
    editor.destroy();
  });

  it("retains selection, can, undo/redo and subsequent size/split commands after a 2×2 merge", () => {
    const editor = fixture();
    const before = editor.state.doc;
    const map = createWordTableMap(before.firstChild!);
    editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: map.positionAt(0, 0)!, headCellPos: map.positionAt(1, 1)! });
    const selection = editor.state.pm.selection.toJSON();
    const dispatch = vi.spyOn(editor, "dispatchTransaction");
    expect(editor.can().mergeWordTableCells()).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.mergeWordTableCells()).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const merged = editor.state.doc;
    expect(createWordTableMap(merged.firstChild!).diagnostics).toEqual([]);
    expect(editor.can().splitWordTableCell()).toBe(true);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.eq(merged)).toBe(true);
    expect(editor.commands.setWordTableColumnWidth({ tablePos: 0, columnIndex: 0, width: { unit: "dxa", value: 1800 } })).toBe(true);
    expect(editor.commands.setWordTableRowHeight({ tablePos: 0, rowIndex: 2, height: { rule: "atLeast", value: 600 } })).toBe(true);
    expect(editor.commands.splitWordTableCell({ tablePos: 0, rowIndex: 0, columnIndex: 0 })).toBe(true);
    expect(createWordTableMap(editor.state.doc.firstChild!).diagnostics).toEqual([]);
    expect(createWordTableMap(editor.state.doc.firstChild!).semanticCells).toHaveLength(9);
    expect(editor.state.pm.selection).toMatchObject({ rect: { startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 2 } });
    expect(editor.commands.mergeWordTableCells()).toBe(true);
    expect(editor.commands.splitWordTableCell()).toBe(true);
    expect(createWordTableMap(editor.state.doc.firstChild!).diagnostics).toEqual([]);
    editor.destroy();
  });
});
