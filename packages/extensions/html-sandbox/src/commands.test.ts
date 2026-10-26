import { afterEach, expect, it } from "vitest";
import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { HtmlSandbox } from "./extension";
const editors: QuireEditor[] = [];
/** @returns Unmounted document editor with ordinary text and the explicit sandbox schema. */
function fixture(): QuireEditor {
  const editor = createEditor({ extensions: [StarterKit, HtmlSandbox], content: { type: "doc", content: [{ type: "paragraph" }] } });
  editors.push(editor); return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));
it("can checks do not mutate, inserted source survives undo and redo", () => {
  const editor = fixture(), before = editor.getJSON();
  const document = { version: 1 as const, html: '<button onclick="this.textContent=1">0</button>\n' };
  expect(editor.can().insertHtmlSandbox({ document })).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.insertHtmlSandbox({ document })).toBe(true);
  const saved = editor.getJSON(); expect(JSON.stringify(saved)).toContain('htmlSandbox');
  expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.redo()).toBe(true); expect(editor.getJSON()).toEqual(saved);
});
it("refuses readonly, stale sources and document-owned permission fields", () => {
  const editor = fixture();
  const document = { version: 1 as const, html: 'old' };
  editor.commands.insertHtmlSandbox({ document });
  let position = -1; editor.state.pm.doc.descendants((node, pos) => { if (node.type.name === 'htmlSandbox') position = pos; });
  expect(editor.commands.updateHtmlSandbox({ position, expectedHtml: 'other', document: { ...document, html: 'new' } })).toBe(false);
  expect(editor.commands.updateHtmlSandbox({ position, expectedHtml: 'old', document: { ...document, html: 'new' } })).toBe(true);
  expect(editor.commands.insertHtmlSandbox({ document: { ...document, config: { execution: 'on-complete' } } as never })).toBe(false);
  editor.setEditable(false); expect(editor.commands.insertHtmlSandbox({ document })).toBe(false);
});
