import { createBlockTableExtensions } from "../extension";
import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "@quirekit/block-editor";
import { captureTableTarget, executeTableAction } from "./actions";
import { createWordTableMap } from "@quirekit/classic-table-model";

const sessions: BlockEditorInstance[] = [];
/** @returns An unmounted session with a canonical 2 by 3 table. */
function setup() {
  const instance = createBlockEditor({ extensions: createBlockTableExtensions() }); sessions.push(instance);
  expect(instance.editor.commands.insertBlockTable({ rowCount: 2, columnCount: 3 })).toBe(true);
  return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(value => value.destroy()));
it("shares canonical tables and only the table profile with Classic", () => {
  const editor = setup();
  const profile = editor.extensionManager.documentProfileRegistry;
  expect(profile?.getByFacet("table-model")?.id).toBe("word-table");
  expect(profile?.getByFacet("page-model")).toBeUndefined();
  const target = captureTableTarget(editor)!;
  expect(target.map.width).toBe(3); expect(target.map.height).toBe(2);
  const before = editor.getJSON();
  expect(executeTableAction(editor, target, "rowAfter", true)).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  expect(executeTableAction(editor, target, "rowAfter")).toBe(true);
  expect(captureTableTarget(editor)!.map.height).toBe(3);
  expect(executeTableAction(editor, target, "deleteTable")).toBe(false);
});
it("selects, merges and unmerges canonical cells without losing text", () => {
  const editor = setup(); editor.commands.insertContent("内容");
  expect(executeTableAction(editor, captureTableTarget(editor)!, "selectRow")).toBe(true);
  const row = captureTableTarget(editor)!;
  expect(row.rect.columnSpan).toBe(3);
  expect(executeTableAction(editor, row, "merge")).toBe(true);
  const merged = captureTableTarget(editor)!;
  expect(merged.map.cellAt(0, 0)?.rect.columnSpan).toBe(3);
  expect(executeTableAction(editor, merged, "split")).toBe(true);
  expect(createWordTableMap(editor.state.doc.nodeAt(merged.tablePos)!).cellAt(0, 0)?.rect.columnSpan).toBe(1);
  expect(editor.getText()).toContain("内容");
});
it("selects complete axes from a middle cell and reuses its immutable map", () => {
  const editor = setup();
  const initial = captureTableTarget(editor)!;
  const cell = initial.map.cellAt(1, 1)!;
  editor.commands.setTextSelection(initial.tablePos + cell.originCellPos + 2);
  const middle = captureTableTarget(editor)!;
  expect(middle.map).toBe(initial.map);
  expect(executeTableAction(editor, middle, "selectRow")).toBe(true);
  expect(captureTableTarget(editor)!.rect).toEqual({ startRow: 1, startColumn: 0, rowSpan: 1, columnSpan: 3 });
  editor.commands.setTextSelection(initial.tablePos + cell.originCellPos + 2);
  expect(executeTableAction(editor, captureTableTarget(editor)!, "selectColumn")).toBe(true);
  expect(captureTableTarget(editor)!.rect).toEqual({ startRow: 0, startColumn: 1, rowSpan: 2, columnSpan: 1 });
});
it("round-trips table contents and formatting in JSON and respects read-only", () => {
  const editor = setup();
  expect(executeTableAction(editor, captureTableTarget(editor)!, "shadeBlue")).toBe(true);
  const content = editor.getJSON();
  const restored = createBlockEditor({ content, extensions: createBlockTableExtensions() }); sessions.push(restored);
  expect(restored.editor.getJSON()).toEqual(content);
  const target = captureTableTarget(editor)!;
  editor.setEditable(false);
  expect(executeTableAction(editor, target, "deleteRows")).toBe(false);
  expect(editor.getJSON()).toEqual(content);
});
it("replaces a slash paragraph in a chain and selects the first new cell", () => {
  const instance = createBlockEditor({ extensions: createBlockTableExtensions(), content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "/table" }] }] } });
  sessions.push(instance);
  const editor = instance.editor;
  editor.commands.setTextSelection(7);
  expect(editor.chain().focus().insertBlockTable({ rowCount: 3, columnCount: 3, position: { from: 0, to: 8 } }).run()).toBe(true);
  expect(editor.state.pm.selection.from).toBe(4);
  editor.commands.insertContent("First");
  expect(editor.state.doc.firstChild?.firstChild?.firstChild?.textContent).toBe("First");
});
