import { afterEach, expect, it } from "vitest";
import { createBlockEditor } from "../runtime/create";
import type { BlockEditorInstance } from "../runtime/types";
import { paragraphCSS, readParagraphValues } from "./projection";
const sessions: BlockEditorInstance[] = [];
/** @returns Paragraphs whose non-target indentation fields differ. */
function fixture() {
  const session = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", attrs: { wordParagraph: { indentation: { start: { unit: "dxa", value: 200 }, end: { unit: "dxa", value: 300 } } } }, content: [{ type: "text", text: "one" }] },
    { type: "paragraph", attrs: { wordParagraph: { indentation: { start: { unit: "dxa", value: 500 }, end: { unit: "dxa", value: 600 } } } }, content: [{ type: "text", text: "two" }] }
  ] } }); sessions.push(session); return session.editor;
}
afterEach(() => sessions.splice(0).forEach(session => session.destroy()));
it("applies one side to multiple paragraphs while retaining other fields and selection", () => {
  const editor = fixture(); editor.commands.setTextSelection({ from: 1, to: 9 });
  const before = editor.getJSON(), selection = editor.state.pm.selection.toJSON();
  expect(editor.commands.setBlockParagraph({ field: "start", value: 24 })).toBe(true);
  expect(readParagraphValues(editor.state.doc.child(0))).toMatchObject({ start: 24, end: 15 });
  expect(readParagraphValues(editor.state.doc.child(1))).toMatchObject({ start: 24, end: 30 });
  expect(editor.state.pm.selection.toJSON()).toEqual(selection);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
});
it("projects explicit zero, alignment and line spacing, and clears with canonical formatting", () => {
  const editor = fixture();
  expect(editor.commands.setBlockParagraph({ field: "alignment", value: "center" })).toBe(true);
  expect(editor.commands.setBlockParagraph({ field: "before", value: 0 })).toBe(true);
  expect(editor.commands.setBlockParagraph({ field: "line", value: 2 })).toBe(true);
  const css = paragraphCSS(editor.state.doc.firstChild!);
  expect(css).toContain("text-align:center"); expect(css).toContain("margin-block-start:0pt"); expect(css).toContain("line-height:2");
  expect(editor.commands.clearFormatting()).toBe(true);
  expect(paragraphCSS(editor.state.doc.firstChild!)).toBe("");
});
it("does not mutate in can mode, readonly or with invalid values", () => {
  const editor = fixture(), before = editor.getJSON();
  expect(editor.can().setBlockParagraph({ field: "after", value: 12 })).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.setBlockParagraph({ field: "line", value: -1 })).toBe(false);
  editor.setEditable(false);
  expect(editor.commands.setBlockParagraph({ field: "alignment", value: "center" })).toBe(false);
  expect(editor.getJSON()).toEqual(before);
});
