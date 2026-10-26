import { createEditor } from "@quirekit/core";
import { BackgroundColor, Highlight, readHighlighterPenState, TextStyle } from "@quirekit/extension-text-style";
import { Formatting, readFormatPainterState } from "@quirekit/extensions";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { resolveClassicColorToolbarTarget } from "./targets";

/**
 * Creates an editor whose one paragraph is fully selected.
 *
 * @returns Editor with highlight and background-color marks installed.
 */
function createSelectedEditor() {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false }), TextStyle, BackgroundColor, Highlight, Formatting],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Reviewed" }] }] }
  });
  editor.commands.setTextSelection({ from: 1, to: 9 });
  return editor;
}

/**
 * Reads the marks on the paragraph's only text run.
 *
 * @param editor - Editor created by createSelectedEditor.
 * @returns Serialized marks, or undefined when the run is unmarked.
 */
function readMarks(editor: ReturnType<typeof createSelectedEditor>) {
  return editor.getJSON().content?.[0]?.content?.[0]?.marks;
}

describe("Classic highlight color target", () => {
  const highlight = resolveClassicColorToolbarTarget("highlight");

  it("offers Word's fixed 15-color gallery without precise colors", () => {
    expect(highlight.showMore).toBe(false);
    expect(highlight.fallbackColor).toBe("#FFFF00");
    expect(highlight.colors).toEqual([
      ["#FFFF00", "#00FF00", "#00FFFF", "#FF00FF", "#0000FF"],
      ["#FF0000", "#000080", "#008080", "#008000", "#800080"],
      ["#800000", "#808000", "#808080", "#C0C0C0", "#000000"]
    ]);
  });

  it("writes the named OOXML token and reads it back as a palette color", () => {
    const editor = createSelectedEditor();

    expect(highlight.apply(editor, "#808000")).toBe(true);
    expect(readMarks(editor)).toEqual([{ type: "highlight", attrs: { color: "darkYellow" } }]);
    expect(highlight.read(editor)).toBe("#808000");
    editor.destroy();
  });

  it("rejects colors outside the highlight value space", () => {
    const editor = createSelectedEditor();

    expect(highlight.apply(editor, "#FFF2A8")).toBe(false);
    expect(readMarks(editor)).toBeUndefined();
    editor.destroy();
  });

  it("arms the pen without a selection and replaces an active format painter", () => {
    const editor = createSelectedEditor();
    editor.commands.toggleFormatPainter();
    editor.commands.setTextSelection(3);

    expect(highlight.apply(editor, "#00FF00")).toBe(true);
    expect(readHighlighterPenState(editor.state)).toEqual({ active: true, color: "green" });
    expect(readFormatPainterState(editor.state).mode).toBe("off");
    expect(highlight.pen?.isActive(editor)).toBe(true);
    expect(highlight.clear(editor)).toBe(true);
    expect(readHighlighterPenState(editor.state)).toEqual({ active: true, color: null });
    expect(highlight.pen?.stop(editor)).toBe(true);
    expect(readMarks(editor)).toBeUndefined();
    editor.destroy();
  });

  it("clears only the direct highlight and treats none as no color", () => {
    const editor = createSelectedEditor();
    editor.commands.setBackgroundColor("#FFF2A8");
    highlight.apply(editor, "#FFFF00");

    expect(highlight.clear(editor)).toBe(true);
    expect(readMarks(editor)?.map(mark => mark.type)).toEqual(["textStyle"]);
    editor.commands.setHighlight({ color: "none" });
    expect(highlight.read(editor)).toBeNull();
    editor.destroy();
  });
});
