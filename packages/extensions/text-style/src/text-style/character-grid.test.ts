// @vitest-environment happy-dom
import { Editor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { TextStyle } from "./text-style";
import { createTextStyleTestExtensions } from "../testing/extensions";

describe("character-grid direct formatting", () => {
  it.each([true, false])("roundtrips the explicit %s switch through HTML", characterGrid => {
    const extensions = [...createTextStyleTestExtensions(), TextStyle];
    const editor = new Editor({ extensions, content: { type: "doc", content: [{ type: "paragraph",
      content: [{ type: "text", text: "甲ABC", marks: [{ type: "textStyle", attrs: { characterGrid } }] }] }] } });
    const html = editor.getHTML();
    expect(html).toContain(`data-qk-character-grid="${characterGrid}"`);
    const reopened = new Editor({ extensions, content: html });
    expect(reopened.state.doc.firstChild!.firstChild!.marks[0]!.attrs.characterGrid).toBe(characterGrid);
    editor.destroy(); reopened.destroy();
  });

  it("applies and clears only the requested text range while preserving other formatting", () => {
    const editor = new Editor({ extensions: [...createTextStyleTestExtensions(), TextStyle],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "甲ABC",
        marks: [{ type: "textStyle", attrs: { color: "#123456" } }] }] }] } });
    try {
      const update = { id: "run", from: 2, to: 4, expectedText: "AB", field: "characterGrid" as const };
      expect(editor.commands.applyTextStyleFieldUpdates([{ ...update, value: false }])).toBe(true);
      expect(editor.state.doc.firstChild!.content.content.map(node => [node.text, node.marks[0]!.attrs.characterGrid]))
        .toEqual([["甲", null], ["AB", false], ["C", null]]);
      expect(editor.commands.applyTextStyleFieldUpdates([{ ...update, value: null }])).toBe(true);
      expect(editor.state.doc.firstChild!.firstChild!.marks[0]!.attrs).toMatchObject({ color: "#123456", characterGrid: null });
      const state = editor.state.pm;
      expect(editor.commands.applyTextStyleFieldUpdates([{ ...update, value: "false" }])).toBe(false);
      expect(editor.state.doc).toBe(state.doc);
    } finally { editor.destroy(); }
  });
});
