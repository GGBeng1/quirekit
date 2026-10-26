import {
  createEditor,
  getExtensionField,
  type QuireMarkCanvasStyleResolver
} from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createTextStyleTestExtensions } from "../testing/extensions";
import { Highlight } from "./highlight";

describe("Highlight", () => {
  it("installs canonical color commands and resolves OOXML colors for canvas paint", () => {
    const editor = createEditor({
      extensions: [...createTextStyleTestExtensions(), Highlight],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Reviewed" }]
        }]
      }
    });

    editor.commands.setTextSelection({ from: 1, to: 9 });
    expect(editor.commands.setHighlight({ color: "darkYellow" })).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([
      { type: "highlight", attrs: { color: "darkYellow" } }
    ]);

    const extension = editor.extensions.find((item) => item.name === "highlight");
    const mark = editor.state.doc.firstChild?.firstChild?.marks[0];
    const canvasStyle = extension === undefined
      ? undefined
      : getExtensionField<QuireMarkCanvasStyleResolver>(extension, "canvasStyle");
    expect(canvasStyle?.(mark!)).toEqual({
      highlightColor: "#808000"
    });

    editor.destroy();
  });
});

describe("Highlight typing boundaries", () => {
  /**
   * Types after placing the caret inside a document whose first word is highlighted.
   *
   * @param position - Caret position before typing.
   * @returns Text runs with their highlight color or null.
   */
  function typeAt(position: number) {
    const editor = createEditor({
      extensions: [...createTextStyleTestExtensions(), Highlight],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [
          { type: "text", text: "Mark", marks: [{ type: "highlight", attrs: { color: "yellow" } }] },
          { type: "text", text: " rest" }
        ] }]
      }
    });
    editor.commands.setTextSelection(position);
    editor.commands.insertContent("X");
    const runs = (editor.getJSON().content?.[0]?.content ?? []).map(node => [
      node.text,
      node.marks?.find(mark => mark.type === "highlight")?.attrs?.color ?? null
    ]);
    editor.destroy();
    return runs;
  }

  it("does not extend the highlight at its end but keeps it inside", () => {
    expect(typeAt(5)).toEqual([["Mark", "yellow"], ["X rest", null]]);
    expect(typeAt(3)).toEqual([["MaXrk", "yellow"], [" rest", null]]);
    expect(typeAt(1)).toEqual([["X", null], ["Mark", "yellow"], [" rest", null]]);
  });
});
