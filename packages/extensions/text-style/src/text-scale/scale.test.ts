// @vitest-environment happy-dom
import { Editor, Node } from "@quirekit/core";
import { encodeLitAstPreservation } from "@quirekit/lit-docx-contract";
import { describe, expect, it } from "vitest";
import { TextStyle } from "../text-style";
import { createTextStyleTestExtensions } from "../testing/extensions";
import { importLitAstTextStyleSnapshot, exportLitAstTextStyleSnapshot } from "../docx/snapshot";
import { readTextStylePreservation } from "../docx/preservation";
import { readTextScale } from "./value";
import { resolveTextStyleCanvasStyle } from "../text-style/canvas-style";

/**
 * @param attrs - Initial character attributes.
 * @returns Isolated headless editor. */
function editorWith(attrs: Record<string, unknown> = {}) {
  return new Editor({ extensions: [...createTextStyleTestExtensions(), TextStyle],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "AB中文",
      marks: [{ type: "textStyle", attrs }] }] }] } });
}

describe("character width authoring", () => {
  it("rejects a selected non-text object without dispatching", () => {
    const object = Node.create({ name: "object", group: "block", atom: true });
    const editor = new Editor({ extensions: [...createTextStyleTestExtensions(), TextStyle, object],
      content: { type: "doc", content: [{ type: "object" }] } });
    editor.commands.setNodeSelection(0);
    const before = editor.state.pm;
    expect(editor.commands.setTextScale(80)).toBe(false);
    expect(editor.state.pm).toBe(before);
    editor.destroy();
  });
  it("edits just the selected text and distinguishes normal from inheritance", () => {
    const editor = editorWith({ color: "#123456" });
    editor.commands.setTextSelection({ from: 2, to: 4 });
    expect(editor.commands.setTextScale(80)).toBe(true);
    expect(editor.state.doc.firstChild!.content.content.map(n => [n.text, n.marks[0]?.attrs.textScale]))
      .toEqual([["A", null], ["B中", 80], ["文", null]]);
    expect(editor.commands.setTextScale(100)).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({ textScale: 100, color: "#123456" });
    expect(editor.commands.unsetTextScale()).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({ textScale: null, color: "#123456" });
  });
  it("keeps stored marks and retires legacy scale without discarding other metadata", () => {
    const legacy = encodeLitAstPreservation({ attributes: { textScale: 120, kern: 8 }, editable: {} });
    const editor = editorWith({ litAstTextStylePreservation: legacy, letterSpacing: "2pt" });
    editor.commands.setTextSelection(2);
    expect(readTextScale(editor.state.pm.selection.$from.marks()[0]!.attrs)).toBe(120);
    expect(editor.commands.unsetTextScale()).toBe(true);
    const attrs = editor.state.pm.storedMarks!.find(m => m.type.name === "textStyle")!.attrs;
    expect(attrs.letterSpacing).toBe("2pt");
    expect(readTextScale(attrs)).toBeUndefined();
    expect(readTextStylePreservation(attrs.litAstTextStylePreservation)?.attributes).toEqual({ kern: 8 });
  });
  it.each([0, 601, 80.5, NaN, Infinity, "80", null])("rejects invalid command input %s without a transaction", value => {
    const editor = editorWith();
    editor.commands.setTextSelection({ from: 1, to: 5 });
    const state = editor.state.pm;
    expect(editor.commands.setTextScale(value as number)).toBe(false);
    expect(editor.state.pm).toBe(state);
  });
  it("projects one ratio and preserves HTML and DOCX including explicit 100", () => {
    const editor = editorWith({ textScale: 80 });
    expect(resolveTextStyleCanvasStyle(editor.state.doc.firstChild!.firstChild!.marks[0]!)).toMatchObject({ horizontalScale: 0.8 });
    expect(editor.getHTML()).toContain('data-qk-text-scale="80"');
    const html = new Editor({ extensions: [...createTextStyleTestExtensions(), TextStyle], content: editor.getHTML() });
    expect(html.state.doc.firstChild!.firstChild!.marks[0]!.attrs.textScale).toBe(80);
    html.destroy();
    for (const textScale of [1, 80, 100, 120, 600]) {
      const canonical = importLitAstTextStyleSnapshot({ textScale }, "run[0]");
      expect(canonical).toEqual({ textScale });
      expect(exportLitAstTextStyleSnapshot(canonical, "run[0]")).toEqual({ textScale });
    }
    expect(() => importLitAstTextStyleSnapshot({ textScale: 0 }, "run[0]")).toThrow("run[0]");
  });
});
