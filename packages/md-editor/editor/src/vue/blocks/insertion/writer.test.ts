// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { forceParsing, syntaxTreeAvailable } from "@quirekit/cm-language";
import { sourceBlockAt, type MsfeEditor, type SourceBlockControls, type SourceBlockSide } from "@quirekit/msfe-core";
import { createMdEditor } from "../../../editor";
import { createBlockInsertionWriter } from "./writer";
import { blockFormatRows } from "../formats";
import { blockInsertionItems } from "./catalog";
import { insertionItems } from "../../toolbar/insertion";
import { quireIconRegistry } from "@quirekit/ui";

const editors: MsfeEditor[] = [];
/** @param markdown - Canonical source. @param position - Complete block target. @returns A real mounted editor and its explicit block intent. */
async function fixture(markdown = "lead\n\n## Title\n\nbody", position = 8) {
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMdEditor({ parent, markdown }); editors.push(editor);
  // Semantic block commands wait for confirmed syntax, including lazy code grammars.
  await expect.poll(() => forceParsing(EditorView.findFromDOM(editor.element)!, markdown.length, 100) && syntaxTreeAvailable(editor.state, markdown.length)).toBe(true);
  const block = sourceBlockAt(editor.state, position)!;
  const controls = { editor, block, target: { ...editor.captureTarget(), selection: EditorSelection.single(block.from, block.to) } } as SourceBlockControls;
  return { editor, controls };
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

for (const side of ["before", "after"] as SourceBlockSide[]) it(`commits a deferred ${side} insertion once, mapped across unrelated edits, with one undo`, async () => {
  const { editor, controls } = await fixture();
  const writer = createBlockInsertionWriter({ controls, side, value: "image" })!;
  editor.run(() => ({ changes: { from: 0, insert: "Other " } }));
  const before = editor.getMarkdown();
  expect(writer.commit("![image](<https://example.com/image.png>)")).toBe(true);
  expect(editor.getMarkdown()).toBe(before.replace("## Title", side === "before" ? "![image](<https://example.com/image.png>)\n\n## Title" : "## Title\n\n![image](<https://example.com/image.png>)"));
  expect(writer.commit("duplicate")).toBe(false);
  editor.undo(); expect(editor.getMarkdown()).toBe(before);
  writer.release();
});
it("cancels without mutation and refuses modified anchors, stale menus, readonly and replacement documents", async () => {
  for (const reason of ["cancel", "touch", "readonly", "replace"]) {
    const { editor, controls } = await fixture(), writer = createBlockInsertionWriter({ controls, side: "after", value: "date" })!;
    if (reason === "cancel") writer.release();
    if (reason === "touch") editor.run(() => ({ changes: { from: controls.block.from + 4, insert: "new" } }));
    if (reason === "readonly") editor.setReadOnly(true);
    if (reason === "replace") editor.replaceDocument("replacement", "replacement");
    const expected = editor.getMarkdown();
    expect(writer.commit("2026-10-11")).toBe(false); expect(editor.getMarkdown()).toBe(expected);
    writer.release();
    if (reason === "touch") expect(createBlockInsertionWriter({ controls, side: "after", value: "date" })).toBeNull();
  }
});
it("rejects an inserted container delimiter that would consume its parent", async () => {
  const { editor, controls } = await fixture("::: note Parent\nchild\n:::\n\ntail", 17);
  const writer = createBlockInsertionWriter({ controls, side: "after", value: "insert-note" })!;
  const before = editor.getMarkdown();
  expect(writer.commit("::: note Nested\nbody\n:::")).toBe(false);
  expect(editor.getMarkdown()).toBe(before); writer.release();
});
it("offers only lossless conversions and identifies the selected task style", async () => {
  const task = await fixture("- [x] One\n- [ ] Two", 7);
  const items = blockFormatRows(task.controls, "zh-CN").flatMap(row => row.items);
  expect(items.map(item => item.value)).toEqual(["bullet", "ordered", "task"]);
  expect(items.find(item => item.value === "task")).toMatchObject({ pressed: true });
  for (const source of ["```ts\ncode\n```", "| a | b |\n| --- | --- |\n| c | d |", "$$\nx^2\n$$"]) {
    expect(blockFormatRows((await fixture(source, 1)).controls, "en")).toEqual([]);
  }
});
it("includes every installed toolbar insertion with registered icons, plus headings and portable pickers", async () => {
  const { editor } = await fixture();
  const items = blockInsertionItems(editor, "zh-CN", true).flatMap(group => group.children ?? []);
  for (const item of insertionItems(editor, "zh-CN").flatMap(group => group.children ?? []).filter(item => !item.disabled)) {
    expect(items.some(entry => entry.value === item.value)).toBe(true);
  }
  for (const value of ["insert-h1", "insert-h6", "date", "emoji", "mention"]) expect(items.some(item => item.value === value)).toBe(true);
  for (const item of items) expect(quireIconRegistry.has(item.icon!)).toBe(true);
});
