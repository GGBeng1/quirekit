import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "@quirekit/block-editor";
import { createWordTableMap, resolveWordTableCellHtmlStyles, resolveWordTableStyleRegistry } from "@quirekit/classic-table-model";
import { createBlockTableExtensions } from "../extension";
import { captureTableTarget } from "../ui/actions";
import { applyBlockTableStyle, readBlockTableLook, setBlockTableHeading } from "./commands";
import { Fragment, Slice } from "@quirekit/pm";
import { prepareBlockTablePasteStyles } from "./paste";

const sessions: BlockEditorInstance[] = [];
/** @returns A canonical editable table session. */
function setup() {
  const instance = createBlockEditor({ extensions: createBlockTableExtensions(), content: {
    type: "doc", attrs: { wordTableStyleRegistry: null }, content: [{ type: "paragraph" }]
  } });
  sessions.push(instance);
  instance.editor.commands.insertBlockTable({ rowCount: 3, columnCount: 2 });
  return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(instance => instance.destroy()));

it("applies horizontal rules and its registry atomically without changing content or geometry", () => {
  const editor = setup();
  editor.commands.insertContent("Keep this");
  const target = captureTableTarget(editor)!;
  const before = editor.getJSON(), table = editor.state.doc.nodeAt(target.tablePos)!;
  expect(applyBlockTableStyle(editor, target, "horizontal", true)).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  expect(applyBlockTableStyle(editor, target, "horizontal")).toBe(true);
  const after = editor.state.doc.nodeAt(target.tablePos)!;
  expect(after.textContent).toBe(table.textContent);
  expect(after.attrs.grid).toEqual(table.attrs.grid);
  const styles = resolveWordTableCellHtmlStyles(after, createWordTableMap(after), resolveWordTableStyleRegistry(editor.state.doc.attrs.wordTableStyleRegistry))!;
  expect(styles[0]!.style).toContain("border-left: none");
  expect(styles[0]!.style).toContain("border-bottom:");
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

it("toggles header regions without adding marks and preserves them across style changes", () => {
  const editor = setup();
  expect(readBlockTableLook(editor.state.doc.firstChild!).firstRow).toBe(false);
  applyBlockTableStyle(editor, captureTableTarget(editor)!, "grid");
  const body = editor.state.doc.firstChild!.content.toJSON();
  expect(setBlockTableHeading(editor, captureTableTarget(editor)!, "firstRow", false)).toBe(true);
  expect(setBlockTableHeading(editor, captureTableTarget(editor)!, "firstColumn", true)).toBe(true);
  expect(applyBlockTableStyle(editor, captureTableTarget(editor)!, "banded")).toBe(true);
  expect(editor.state.doc.firstChild!.attrs.tableLook).toMatchObject({ firstRow: false, firstColumn: true, bandedRows: true });
  expect(editor.state.doc.firstChild!.content.toJSON()).toEqual(body);
  const reopened = createBlockEditor({ content: editor.getJSON(), extensions: createBlockTableExtensions() });
  sessions.push(reopened);
  expect(reopened.editor.getJSON()).toEqual(editor.getJSON());
});

it("rejects stale targets and read-only commands without registry mutations", () => {
  const editor = setup(), target = captureTableTarget(editor)!;
  editor.commands.insertContent("changed");
  const before = editor.getJSON();
  expect(applyBlockTableStyle(editor, target, "banded")).toBe(false);
  editor.setEditable(false);
  expect(setBlockTableHeading(editor, captureTableTarget(editor)!, "firstRow", false)).toBe(false);
  expect(editor.getJSON()).toEqual(before);
});

it("prepares copied built-in styles only on paste and retains destination definitions", () => {
  const source = setup();
  applyBlockTableStyle(source, captureTableTarget(source)!, "banded");
  const table = source.state.doc.firstChild!;
  const slice = new Slice(Fragment.from(table), 0, 0);
  const target = setup();
  const original = target.state.doc;
  const registry = resolveWordTableStyleRegistry(original.attrs.wordTableStyleRegistry);
  const prepared = prepareBlockTablePasteStyles(slice, registry);
  expect(prepared.styles.QuireBlockBanded).toBeDefined();
  expect(target.state.doc).toBe(original);
  expect(prepareBlockTablePasteStyles(slice, prepared)).toBe(prepared);
  const unknown = table.type.create({ ...table.attrs, tableStyle: "toString" }, table.content);
  expect(prepareBlockTablePasteStyles(new Slice(Fragment.from(unknown), 0, 0), registry)).toBe(registry);
  const tr = target.state.pm.tr;
  expect(target.view.someProp("quireClipboardPaste", prepare => prepare(tr, slice, target.view))).toBe(true);
  expect(tr.doc.attrs.wordTableStyleRegistry.styles.QuireBlockBanded).toBeDefined();
  expect(target.state.doc.attrs.wordTableStyleRegistry).toBeNull();
});
