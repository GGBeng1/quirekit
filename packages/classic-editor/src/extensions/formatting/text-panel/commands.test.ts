import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { ClassicEditorKit } from "../../kit";
import { isUnderlineActive, underlineStyles, readUnderlineAttributes } from "@quirekit/extension-underline";

/** @returns Isolated native formatting editor. */
function fixture() { return createEditor({ extensions: [ClassicEditorKit], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "AB CD" }] }] } }); }

describe("text inspector native commands", () => {
  it("exports explicit none as plain Markdown and visible styles as underline", () => {
    const editor = fixture();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.setUnderline({ underlineType: "none" });
    expect(editor.getMarkdown()).toBe("AB CD");
    editor.commands.setUnderline({ underlineType: "double" });
    expect(editor.getMarkdown()).toBe("++AB CD++");
    editor.destroy();
  });
  it.each(underlineStyles)("authors exact %s style and preserves independent color", style => {
    const editor = fixture();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.setUnderline({ underlineType: style, color: "#123456" });
    expect(editor.getAttributes("underline")).toMatchObject({ underlineType: style, color: "#123456" });
    editor.commands.setUnderline({ color: "#654321" });
    expect(editor.getAttributes("underline")).toMatchObject({ underlineType: style, color: "#654321" });
    editor.commands.setUnderline({ underlineType: "wave" });
    expect(editor.getAttributes("underline").color).toBe("#654321");
    editor.destroy();
  });
  it("preserves each selected run's style when only color changes", () => {
    const editor = fixture();
    editor.chain().setTextSelection({ from: 1, to: 3 }).setUnderline({ underlineType: "double" }).run();
    editor.chain().setTextSelection({ from: 4, to: 6 }).setUnderline({ underlineType: "wave" }).run();
    editor.chain().setTextSelection({ from: 1, to: 6 }).setUnderline({ color: "#123456" }).run();
    const styles: unknown[] = [];
    editor.state.doc.descendants(node => { if (node.isText) styles.push(readUnderlineAttributes(node.marks.find(mark => mark.type.name === "underline")?.attrs ?? {}).underlineType); });
    expect(styles).toEqual(["double", "single", "wave"]);
    editor.destroy();
  });
  it("treats visible plus explicit-none selections as mixed and enables them", () => {
    const editor = fixture();
    editor.chain().setTextSelection({ from: 1, to: 3 }).setUnderline({ underlineType: "double" }).run();
    editor.chain().setTextSelection({ from: 3, to: 6 }).setUnderline({ underlineType: "none" }).run();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(isUnderlineActive(editor.state.pm)).toBe(false);
    editor.commands.toggleUnderline();
    expect(isUnderlineActive(editor.state.pm)).toBe(true);
    editor.commands.setUnderline({ underlineType: "none" });
    editor.commands.setUnderline();
    expect(isUnderlineActive(editor.state.pm)).toBe(true);
    editor.destroy();
  });
  it("reads legacy imported attributes and preserves an explicit automatic-color reset", () => {
    expect(readUnderlineAttributes({ underlineType: null, color: undefined, litAstMarkAttrs: { underlineType: "double", color: "#123456" } }))
      .toEqual({ underlineType: "double", color: "#123456" });
    expect(readUnderlineAttributes({ underlineType: "wave", color: null, litAstMarkAttrs: { underlineType: "double", color: "#123456" } }))
      .toEqual({ underlineType: "wave", color: null });
  });
  it("validates before changing history and toggles explicit none at the caret", () => {
    const editor = fixture();
    const before = editor.getJSON();
    expect(editor.commands.setUnderline({ color: "invalid" })).toBe(false);
    expect(editor.getJSON()).toEqual(before);
    editor.chain().setTextSelection(2).setUnderline({ underlineType: "none" }).toggleUnderline().run();
    expect(editor.getAttributes("underline").underlineType).toBe("single");
    editor.commands.setUnderline({ underlineType: "wavyDouble", color: "#123456" });
    editor.commands.setEmphasisMark("underDot");
    editor.commands.insertContent("X");
    expect(editor.getJSON().content?.[0]?.content?.find(node => node.text === "X")?.marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "underline", attrs: expect.objectContaining({ underlineType: "wavyDouble", color: "#123456" }) }),
      expect.objectContaining({ type: "textStyle", attrs: expect.objectContaining({ emphasisMark: "underDot" }) })
    ]));
    editor.commands.undo();
    expect(editor.state.doc.textContent).toBe("AB CD");
    editor.commands.redo();
    expect(editor.state.doc.textContent).toBe("AXB CD");
    editor.destroy();
  });
});
