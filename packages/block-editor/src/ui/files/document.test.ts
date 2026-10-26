import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../../index";
import { Extension } from "@quirekit/core";
import { exportBlockBackup, importBlockBackup, importBlockText } from "./document";

const sessions: BlockEditorInstance[] = [];
/** @returns A fresh session with text to protect against invalid imports. */
function setup() {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original" }] }] } });
  sessions.push(instance); return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(value => value.destroy()));
it("rejects unknown schema without mutating or consuming history", () => {
  const editor = setup(); const before = editor.getJSON();
  expect(() => importBlockBackup(editor, '{"type":"doc","content":[{"type":"futureWidget"}]}')).toThrow("不支持");
  expect(editor.getJSON()).toEqual(before); expect(editor.can().undo()).toBe(false);
});
it("round-trips full backups and undoes a successful plain-text import", () => {
  const editor = setup(); const backup = exportBlockBackup(editor, "我的文档"); const before = editor.getJSON();
  expect(importBlockText(editor, "甲\r\n乙\n")).toBe(true);
  expect(editor.state.doc.childCount).toBe(3);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
  expect(importBlockBackup(editor, backup)).toBe("我的文档"); expect(editor.getJSON()).toEqual(before);
});
it("rejects unknown format versions, attributes and read-only imports", () => {
  const editor = setup();
  expect(() => importBlockBackup(editor, '{"format":"quirekit-block","version":2}')).toThrow("版本");
  expect(() => importBlockBackup(editor, '{"type":"doc","content":[{"type":"paragraph","attrs":{"future":1}}]}')).toThrow("属性");
  expect(() => importBlockBackup(editor, '{"type":"doc","content":[{"type":"paragraph","attrs":{"toString":"unknown"}}]}')).toThrow("属性");
  expect(editor.state.doc.textContent).toBe("Original");
  editor.setEditable(false); expect(importBlockText(editor, "replacement")).toBe(false);
});

it("restores root attributes and isolates import history from adjacent typing", () => {
  const metadata = Extension.create({ name: "metadata",
    /** @returns One host-owned root field that must survive a full backup. */
    addGlobalAttributes() { return [{ types: ["doc"], attributes: { category: { default: "draft" } } }]; }
  });
  const instance = createBlockEditor({ extensions: [metadata], content: { type: "doc", attrs: { category: "draft" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Before" }] }] } });
  sessions.push(instance);
  const editor = instance.editor;
  editor.commands.insertContent("A");
  const before = editor.getJSON();
  importBlockBackup(editor, JSON.stringify({ type: "doc", attrs: { category: "published" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Restored" }] }] }));
  expect(editor.state.doc.attrs.category).toBe("published");
  const restored = editor.getJSON();
  editor.commands.insertContent("B");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(restored);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
  expect(editor.state.doc.attrs.category).toBe("draft");
});

it.each([null, [], "bold"])("rejects malformed mark %j before mutation", mark => {
  const editor = setup(); const before = editor.getJSON();
  expect(() => importBlockBackup(editor, JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a", marks: [mark] }] }] }))).toThrow("文字格式");
  expect(editor.getJSON()).toEqual(before);
});
