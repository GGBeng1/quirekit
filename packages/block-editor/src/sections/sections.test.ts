import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../index";
import { readSections, sectionTarget } from "./query";
import { sectionKey } from "./state";

const sessions: BlockEditorInstance[] = [];
/** @returns A nested outline with sibling sections and a terminal parent boundary. */
function setup() {
  const instance = createBlockEditor({ content: { type: "doc", content: [
    [1, "A"], [2, "B"], [0, "body B"], [3, "C"], [0, "body C"], [2, "D"], [0, "body D"], [1, "E"], [0, ""]
  ].map(([level, text]) => ({ type: level ? "heading" : "paragraph", attrs: level ? { level } : {}, content: text ? [{ type: "text", text: String(text) }] : [] })) } });
  sessions.push(instance); return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(instance => instance.destroy()));

it("defines sections and moves complete sibling chapters in one undo step", () => {
  const editor = setup(), before = editor.getJSON();
  const [a, b, c, d, e] = readSections(editor.state.doc);
  expect(a!.to).toBe(e!.from); expect(b!.to).toBe(d!.from); expect(c!.to).toBe(d!.from);
  expect(editor.can().moveBlockSection(c!.id, "down")).toBe(false);
  expect(editor.commands.moveBlockSection(b!.id, "down")).toBe(true);
  expect(editor.state.doc.textContent).toBe("ADbody DBbody BCbody CE");
  expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.duplicateBlockSection(b!.id)).toBe(true);
  expect(editor.state.doc.textContent).toBe("ABbody BCbody CBbody BCbody CDbody DE");
  const ids = editor.state.doc.content.content.map(node => node.attrs.blockId);
  expect(new Set(ids).size).toBe(ids.length);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
});

it("keeps folding transient and reuses static products until hidden content is entered", () => {
  const editor = setup(), [a, b, , d] = readSections(editor.state.doc), before = editor.getJSON();
  expect(editor.can().toggleBlockSection(b!.id)).toBe(true);
  expect(sectionKey.getState(editor.state.pm)!.folded.size).toBe(0);
  editor.commands.toggleBlockSection(b!.id);
  const folded = sectionKey.getState(editor.state.pm)!;
  expect(folded.folded.has(b!.id)).toBe(true);
  editor.commands.setTextSelection(a!.from + 1);
  expect(sectionKey.getState(editor.state.pm)).toBe(folded);
  editor.commands.setTextSelection(d!.from + 1);
  expect(sectionKey.getState(editor.state.pm)).toBe(folded);
  editor.commands.setTextSelection(b!.body + 1);
  expect(sectionKey.getState(editor.state.pm)!.folded.size).toBe(0);
  expect(editor.getJSON()).toEqual(before); expect(editor.commands.undo()).toBe(false);
});

it("resolves stable block links after moves and rejects stale targets or readonly mutations", () => {
  const editor = setup(), [, b, , d] = readSections(editor.state.doc);
  expect(sectionTarget(editor, b!.id)!.blocks).toHaveLength(4);
  editor.commands.moveBlockSection(b!.id, "down");
  const current = readSections(editor.state.doc).find(item => item.id === b!.id)!;
  expect(current.from).toBeGreaterThan(b!.from);
  editor.commands.toggleBlockSection(current.id);
  const bodyId = editor.state.doc.nodeAt(current.body)!.attrs.blockId;
  expect(editor.commands.navigateBlockLink(bodyId)).toBe(true);
  expect(sectionKey.getState(editor.state.pm)!.folded.size).toBe(0);
  expect(editor.state.pm.selection.from).toBe(current.body + 1);
  expect(editor.commands.navigateBlockLink("missing")).toBe(false);
  editor.setEditable(false);
  expect(editor.commands.toggleBlockSection(current.id)).toBe(true);
  expect(editor.commands.moveBlockSection(current.id, "up")).toBe(false);
  expect(editor.commands.duplicateBlockSection(current.id)).toBe(false);
});
