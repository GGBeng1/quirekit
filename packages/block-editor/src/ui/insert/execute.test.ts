import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../../index";
import { readSlashTarget, acceptBlockSlash } from "./execute";
import { blockInsertItems } from "./catalog";

const sessions: BlockEditorInstance[] = [];
/** @param text - Initial paragraph. @returns A session with its caret at the paragraph end. */
function setup(text: string) {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] } });
  sessions.push(instance); instance.editor.commands.setTextSelection(text.length + 1); return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(value => value.destroy()));
it("replaces a committed slash paragraph atomically and undoes it", () => {
  const editor = setup("/标题");
  const before = editor.getJSON();
  expect(acceptBlockSlash(editor, readSlashTarget(editor)!, "heading:2")).toBe(true);
  expect(editor.state.doc.firstChild?.type.name).toBe("heading");
  expect(editor.state.doc.textContent).toBe("");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
});
it("rejects stale, oversized and non-paragraph triggers", () => {
  const editor = setup("/table"); const target = readSlashTarget(editor)!;
  editor.commands.insertContent("more");
  expect(acceptBlockSlash(editor, target, "table")).toBe(false);
  editor.commands.toggleCodeBlock(); expect(readSlashTarget(editor)).toBeNull();
  expect(readSlashTarget(setup('/' + 'x'.repeat(65)))).toBeNull();
});
it("omits uninstalled table capabilities from both insertion paths", () => {
  const editor = setup("/table");
  expect(blockInsertItems(editor, "table", true)).toEqual([]);
  expect(acceptBlockSlash(editor, readSlashTarget(editor)!, "table")).toBe(false);
});
it("limits insertion to the host's admitted heading levels", () => {
  const instance = createBlockEditor({ preset: { starterKit: { heading: { levels: [1, 2] } } }, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "/heading" }] }] } });
  sessions.push(instance); instance.editor.commands.setTextSelection(9);
  expect(blockInsertItems(instance.editor, "heading", true).map(item => item.id)).toEqual(["heading:1", "heading:2"]);
  expect(acceptBlockSlash(instance.editor, readSlashTarget(instance.editor)!, "heading:3")).toBe(false);
});

it("offers the same installed capabilities at every insertion entry", () => {
  const editor = setup("/图");
  expect(blockInsertItems(editor, "", true).map(item => item.id)).toEqual(blockInsertItems(editor).map(item => item.id));
  expect(blockInsertItems(editor, "", true).map(item => item.id)).toEqual(expect.arrayContaining(["image", "flowchart", "mindMap", "whiteboard", "dataView", "textDiagram"]));
});
