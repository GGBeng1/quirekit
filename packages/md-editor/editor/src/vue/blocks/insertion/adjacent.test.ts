// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { forceParsing, syntaxTreeAvailable } from "@quirekit/cm-language";
import { compositionEffect } from "@quirekit/msfe-core/state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { createMdEditor } from "../../../editor";
import { captureAdjacentInsertion } from "./adjacent";
import { createBlockInsertionWriter } from "./writer";

const editors: MsfeEditor[] = [];
const table = "| a | b |\n| --- | --- |\n| one | two |";
/** @param markdown - Source fixture. @param text - Text containing the caret. @returns Real source editor. */
async function fixture(markdown: string, text: string): Promise<MsfeEditor> {
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMdEditor({ parent, markdown }); editors.push(editor);
  // Semantic block commands wait for confirmed syntax, including lazy code grammars.
  await expect.poll(() => forceParsing(EditorView.findFromDOM(editor.element)!, markdown.length, 100) && syntaxTreeAvailable(editor.state, markdown.length)).toBe(true);
  editor.run(() => ({ selection: EditorSelection.cursor(markdown.indexOf(text) + 1) }));
  return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

it.each([table, "```ts\none\n```"])("inserts beside the original complete block and undoes once: %s", async markdown => {
  const editor = await fixture(markdown, "one"), adjacent = captureAdjacentInsertion(editor, editor.captureTarget())!;
  expect(adjacent).not.toBeNull();
  const target = adjacent.target("after")!, writer = createBlockInsertionWriter({ ...target, value: "insert-divider" })!;
  adjacent.release();
  expect(writer.commit("***")).toBe(true);
  expect(editor.getMarkdown()).toBe(`${markdown}\n\n***`);
  editor.undo(); expect(editor.getMarkdown()).toBe(markdown);
  expect(editor.history.canUndo).toBe(false); writer.release();
});
it("maps unrelated changes but rejects a touched block and releases its captured intent", async () => {
  const editor = await fixture(`intro\n\n${table}`, "one"), adjacent = captureAdjacentInsertion(editor, editor.captureTarget())!;
  editor.run(() => ({ changes: { from: 0, insert: "prefix " } }));
  expect(adjacent.target("before")?.controls.block.from).toBe(14);
  editor.run(() => ({ changes: { from: editor.getMarkdown().indexOf("one"), insert: "changed" } }));
  expect(adjacent.target("before")).toBeNull();
  adjacent.release(); expect(adjacent.target("after")).toBeNull();
});
it("rejects stale, foreign, read-only and incomplete source targets", async () => {
  const editor = await fixture(table, "one"), original = editor.captureTarget();
  expect(captureAdjacentInsertion(editor, undefined)).toBeNull();
  const other = await fixture("```\none\n```", "one");
  expect(captureAdjacentInsertion(editor, other.captureTarget())).toBeNull();
  editor.run(() => ({ changes: { from: table.indexOf("one"), insert: "x" } }));
  expect(captureAdjacentInsertion(editor, original)).toBeNull();
  editor.setReadOnly(true);
  expect(captureAdjacentInsertion(editor, editor.captureTarget())).toBeNull();
  const unfinished = await fixture("```\none", "one");
  expect(captureAdjacentInsertion(unfinished, unfinished.captureTarget())).toBeNull();
});
it("does not infer a destination for cross-block selections or ordinary paragraphs", async () => {
  const editor = await fixture(`${table}\n\nbody`, "one");
  editor.run(() => ({ selection: EditorSelection.single(2, editor.state.doc.length) }));
  expect(captureAdjacentInsertion(editor, editor.captureTarget())).toBeNull();
  const paragraph = await fixture("one paragraph", "one");
  expect(captureAdjacentInsertion(paragraph, paragraph.captureTarget())).toBeNull();
});
it("does not collapse a multiple-selection intent into the menu's retained main range", async () => {
  const editor = await fixture(`${table}\n\nother`, "one");
  editor.setSelection(EditorSelection.create([EditorSelection.cursor(table.indexOf("one") + 1), EditorSelection.cursor(editor.state.doc.length)]));
  const anchor = editor.captureAnchor(editor.state.selection.main);
  expect(captureAdjacentInsertion(editor, anchor.target()!)).toBeNull();
  anchor.release();
});
it("retains the block across caret movement but rejects composition and document replacement", async () => {
  const editor = await fixture(`${table}\n\nother`, "one"), adjacent = captureAdjacentInsertion(editor, editor.captureTarget())!;
  editor.run(() => ({ selection: EditorSelection.cursor(editor.state.doc.length) }));
  expect(adjacent.target("after")?.controls.block.to).toBe(table.length);
  const target = adjacent.target("after")!, writer = createBlockInsertionWriter({ ...target, value: "image" })!;
  const view = EditorView.findFromDOM(editor.element)!;
  view.dispatch({ effects: compositionEffect.of(true) });
  expect(adjacent.target("after")).toBeNull();
  expect(writer.commit("![image](image.png)")).toBe(false);
  view.dispatch({ effects: compositionEffect.of(false) });
  expect(editor.replaceDocument("new document", "new-owner").ok).toBe(true);
  expect(adjacent.target("after")).toBeNull();
  expect(writer.commit("![image](image.png)")).toBe(false);
  expect(editor.getMarkdown()).toBe("new document");
  writer.release(); adjacent.release();
});
